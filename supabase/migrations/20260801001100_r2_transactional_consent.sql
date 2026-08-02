-- R2: transactional consent capture.
-- One atomic, idempotent RPC replaces the multi-call service-role consent
-- writes (people, contact_points, consent_events, consent_receipts, audit).
-- Append-only migration; do not edit after merge.
--
-- Deny-wins note: the RPC writes consent_events and lets the existing
-- trigger (upsert_consent_state_from_event, migration 20260801000900)
-- maintain consent_state, so a later ordinary grant can never silently clear
-- a channel/global STOP or withdrawal. A repermission flow is a separate,
-- audited operation.

create or replace function public.submit_consent(
  p_session_id uuid,
  p_name text,
  p_email text,
  p_mobile text,
  p_permissions jsonb,
  p_token_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_person_id uuid := null;
  v_receipt_id uuid;
  v_channel text;
  v_wording_id uuid;
  v_granted_channels text[] := '{}'::text[];
  v_perm_key text;
  v_perm_value boolean;
  v_existing jsonb;
begin
  -- Validate the permissions object: keys must be I01..I05, values booleans.
  -- Two passes: validate shape first (with a clean error), then process.
  if jsonb_typeof(p_permissions) <> 'object' then
    raise exception 'permissions must be a JSON object of I01-I05 booleans';
  end if;
  for v_perm_key in select key from jsonb_each(p_permissions)
  loop
    if v_perm_key not in ('I01', 'I02', 'I03', 'I04', 'I05') then
      raise exception 'unknown permission %', v_perm_key;
    end if;
    if jsonb_typeof(p_permissions -> v_perm_key) <> 'boolean' then
      raise exception 'permission % must be a boolean', v_perm_key;
    end if;
  end loop;

  -- The session must exist and be completed.
  if not exists (
    select 1 from public.survey_sessions
     where id = p_session_id and status = 'completed'
  ) then
    raise exception 'survey session not found or not completed';
  end if;

  -- Idempotency: one receipt per session. Return the existing receipt.
  select jsonb_build_object(
    'created', false,
    'receipt_id', id,
    'person_id', person_id,
    'granted_channels', array[]::text[]
  )
    into v_existing
    from public.consent_receipts
   where survey_session_id = p_session_id;

  if v_existing is not null then
    return v_existing;
  end if;

  -- Create the person only when there is something to record: contact
  -- details or a granted channel permission (I01-I04). I05 is a preference
  -- only and never creates a person or a grant.
  if coalesce(nullif(p_name, ''), nullif(p_email, ''), nullif(p_mobile, '')) is not null
     or coalesce((p_permissions -> 'I01')::boolean, false)
     or coalesce((p_permissions -> 'I02')::boolean, false)
     or coalesce((p_permissions -> 'I03')::boolean, false)
     or coalesce((p_permissions -> 'I04')::boolean, false) then
    insert into public.people (full_name, email, mobile_number)
    values (nullif(p_name, ''), nullif(p_email, ''), nullif(p_mobile, ''))
    returning id into v_person_id;
  end if;

  if v_person_id is null then
    raise exception 'consent requires a contact detail or a granted permission';
  end if;

  -- Contact points for the values provided.
  if nullif(p_email, '') is not null then
    insert into public.contact_points (person_id, kind, value)
    values (v_person_id, 'email', p_email);
  end if;
  if nullif(p_mobile, '') is not null then
    insert into public.contact_points (person_id, kind, value)
    values (v_person_id, 'mobile', p_mobile);
  end if;

  -- One consent event per granted channel, pinned to the exact wording
  -- version the respondent saw (v1 seeds from CONS-001). I05 is skipped:
  -- it is a preference, not advance recording consent.
  for v_perm_key in select key from jsonb_each(p_permissions)
  loop
    v_perm_value := (p_permissions -> v_perm_key)::boolean;
    if not v_perm_value then
      continue;
    end if;
    v_channel := case v_perm_key
      when 'I01' then 'email'
      when 'I02' then 'sms'
      when 'I03' then 'human_call'
      when 'I04' then 'ai_call'
      else null
    end;
    if v_channel is null then
      continue; -- I05
    end if;

    select id into v_wording_id
      from public.consent_wording_versions
     where channel = v_channel and version = 1
     limit 1;
    if v_wording_id is null then
      raise exception 'consent wording not found for %', v_channel;
    end if;

    insert into public.consent_events
      (person_id, channel, consent_wording_version_id, granted, source)
    values
      (v_person_id, v_channel, v_wording_id, true, 'survey');

    v_granted_channels := array_append(v_granted_channels, v_channel);
  end loop;

  -- Issue the receipt. The raw token is never stored; only its SHA-256 hex
  -- hash (passed by the caller) lives in the database.
  insert into public.consent_receipts
    (person_id, survey_session_id, token_hash, channel, granted, expires_at)
  values
    (v_person_id, p_session_id, p_token_hash,
     case when cardinality(v_granted_channels) > 0 then v_granted_channels[1] else null end,
     cardinality(v_granted_channels) > 0,
     now() + interval '12 months')
  returning id into v_receipt_id;

  -- Append-only audit record. A public respondent is recorded as a system
  -- actor (the platform performed the capture on their behalf).
  insert into public.audit_events
    (actor_type, actor_id, action, entity_type, entity_id, reason)
  values
    ('system', p_session_id::text, 'consent_captured',
     'consent_receipts', v_receipt_id::text,
     'transactional consent capture');

  return jsonb_build_object(
    'created', true,
    'receipt_id', v_receipt_id,
    'person_id', v_person_id,
    'granted_channels', v_granted_channels
  );
end;
$$;

-- Server-only: the public REST roles can never invoke consent capture, and
-- neither can the standard anon/authenticated roles. Only the service role
-- (the app's server-side client) may call it.
revoke all on function public.submit_consent(uuid, text, text, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.submit_consent(uuid, text, text, text, jsonb, text) to service_role;

comment on function public.submit_consent(uuid, text, text, text, jsonb, text) is
  'Transactional consent capture: creates person, contact points, one consent event per granted channel pinned to its wording version, a hashed receipt, and an audit record in ONE atomic operation. Idempotent per survey session (one receipt). Deny-wins suppression is preserved by the consent_events trigger; I05 is a preference, never a grant or recording consent.';
