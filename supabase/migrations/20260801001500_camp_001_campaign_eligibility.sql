-- CAMP-001: campaign eligibility engine.
-- Extends the existing DATA-001 campaign tables with eligibility logic,
-- audience snapshots, approval workflow, and emergency pause.
-- Append-only migration; do not edit after merge.

-- ---------------------------------------------------------------------------
-- 1. Campaign type and channel enums
-- ---------------------------------------------------------------------------
create type public.campaign_type as enum ('newsletter', 'survey_chase');
create type public.campaign_channel as enum ('email', 'sms');

-- ---------------------------------------------------------------------------
-- 2. Add new columns to the existing campaigns table
-- ---------------------------------------------------------------------------
alter table public.campaigns
  add column if not exists campaign_type public.campaign_type,
  add column if not exists description text,
  add column if not exists content_preview text,
  add column if not exists immutable boolean not null default false,
  add column if not exists updated_at timestamptz not null default now(),
  alter column name set not null,
  alter column content_hash set not null;

update public.campaigns
   set campaign_type = 'newsletter'
 where campaign_type is null;

-- ---------------------------------------------------------------------------
-- 3. Campaign audience: deterministic, immutable recipient snapshot
-- ---------------------------------------------------------------------------
create table public.campaign_audience_records (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  person_id uuid references public.people(id) on delete cascade,
  organisation_id uuid references public.organisations(id) on delete cascade,
  contact_point_id uuid not null references public.contact_points(id),
  contact_value text not null,
  eligibility_reasons text[] not null default '{}',
  audience_hash text not null,
  created_at timestamptz not null default now(),
  unique (campaign_id, person_id, organisation_id, contact_point_id),
  check (person_id is not null or organisation_id is not null)
);

create index on public.campaign_audience_records (campaign_id);
alter table public.campaign_audience_records enable row level security;

-- ---------------------------------------------------------------------------
-- 4. Emergency campaign pause (independent of survey collection pause)
-- ---------------------------------------------------------------------------
create table public.campaign_pause_controls (
  id integer primary key check (id = 1),
  paused boolean not null default false,
  reason text,
  paused_at timestamptz,
  paused_by uuid,
  updated_at timestamptz not null default now()
);
insert into public.campaign_pause_controls (id, paused) values (1, false)
on conflict (id) do nothing;
alter table public.campaign_pause_controls enable row level security;

-- ---------------------------------------------------------------------------
-- 5. Eligibility function
-- ---------------------------------------------------------------------------
create or replace function public.check_person_eligibility(
  p_person_id uuid,
  p_channel public.campaign_channel,
  p_campaign_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $FUNC$
declare
  v_has_consent boolean;
  v_is_suppressed boolean;
  v_has_active_contact boolean;
  v_already_sent boolean := false;
  v_reasons text[] := '{}';
  v_blockers text[] := '{}';
  v_contact_value text;
  v_contact_point_id uuid;
  v_channel_text text;
begin
  v_channel_text := p_channel::text;
  select granted into v_has_consent
    from public.consent_state
   where person_id = p_person_id
     and channel = v_channel_text
     and organisation_id is null
     and (expires_at is null or expires_at > now())
   order by updated_at desc limit 1;
  if v_has_consent then
    v_reasons := array_append(v_reasons, 'has_consent');
  else
    v_blockers := array_append(v_blockers, 'no_consent');
  end if;
  select exists (
    select 1 from public.suppression_events
     where person_id = p_person_id
       and (channel = v_channel_text or channel is null or reason = 'global')
  ) into v_is_suppressed;
  if v_is_suppressed then
    v_blockers := array_append(v_blockers, 'suppressed');
  else
    v_reasons := array_append(v_reasons, 'not_suppressed');
  end if;
  select cp.id, cp.value into v_contact_point_id, v_contact_value
    from public.contact_points cp
   where cp.person_id = p_person_id
     and cp.kind = v_channel_text
     and cp.is_active = true
   order by cp.created_at desc limit 1;
  if v_contact_point_id is not null then
    v_reasons := array_append(v_reasons, 'has_active_contact');
  else
    v_blockers := array_append(v_blockers, 'no_active_contact');
  end if;
  if p_campaign_id is not null then
    select exists (
      select 1 from public.contact_attempts
       where campaign_id = p_campaign_id
         and person_id = p_person_id
         and status not in ('failed', 'queued')
    ) into v_already_sent;
    if v_already_sent then
      v_blockers := array_append(v_blockers, 'already_sent');
    else
      v_reasons := array_append(v_reasons, 'not_previously_sent');
    end if;
  end if;
  return jsonb_build_object(
    'eligible', cardinality(v_blockers) = 0,
    'person_id', p_person_id,
    'channel', v_channel_text,
    'reasons', v_reasons,
    'blockers', v_blockers,
    'contact_point_id', v_contact_point_id,
    'contact_value', v_contact_value
  );
end;
$FUNC$;

revoke all on function public.check_person_eligibility(uuid, public.campaign_channel, uuid) from public, anon, authenticated;
grant execute on function public.check_person_eligibility(uuid, public.campaign_channel, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 6. Build audience: snapshot all eligible recipients
-- ---------------------------------------------------------------------------
create or replace function public.build_campaign_audience(
  p_campaign_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $FUNC$
declare
  v_campaign record;
  v_eligible_count integer := 0;
  v_blocked_count integer := 0;
  v_channel_text text;
  v_person record;
  v_elig jsonb;
  v_audience_hash text;
begin
  select * into v_campaign
    from public.campaigns
   where id = p_campaign_id for update;
  if not found then
    return jsonb_build_object('error', 'campaign not found');
  end if;
  if v_campaign.immutable then
    return jsonb_build_object('error', 'campaign is immutable; audience already built');
  end if;
  if v_campaign.status not in ('draft', 'scheduled') then
    return jsonb_build_object('error', 'campaign status does not allow audience build');
  end if;
  v_channel_text := v_campaign.channel;
  for v_person in
    select distinct cs.person_id
      from public.consent_state cs
     where cs.channel = v_channel_text
       and cs.granted = true
       and (cs.expires_at is null or cs.expires_at > now())
       and cs.organisation_id is null
  loop
    v_elig := public.check_person_eligibility(
      v_person.person_id, v_channel_text::public.campaign_channel, p_campaign_id);
    if (v_elig ->> 'eligible')::boolean then
      v_audience_hash := extensions.digest(
        v_person.person_id::text || v_campaign.content_hash || v_channel_text || clock_timestamp()::text,
        'sha256'
      )::text;
      insert into public.campaign_audience_records
        (campaign_id, person_id, contact_point_id, contact_value,
         eligibility_reasons, audience_hash)
      select
        p_campaign_id,
        v_person.person_id,
        (v_elig ->> 'contact_point_id')::uuid,
        v_elig ->> 'contact_value',
        array(select jsonb_array_elements_text(v_elig -> 'reasons')),
        v_audience_hash;
      v_eligible_count := v_eligible_count + 1;
    else
      v_blocked_count := v_blocked_count + 1;
    end if;
  end loop;
  update public.campaigns
     set immutable = true,
         updated_at = now()
   where id = p_campaign_id;
  update public.campaigns
     set audience_hash = extensions.digest(
       (select string_agg(audience_hash, '' order by id)
          from public.campaign_audience_records
         where campaign_id = p_campaign_id), 'sha256'
     )::text
   where id = p_campaign_id;
  insert into public.audit_events
    (actor_type, actor_id, action, entity_type, entity_id, reason)
  values
    ('system', p_campaign_id::text, 'campaign_audience_built',
     'campaigns', p_campaign_id::text,
     format('audience built: %s eligible, %s blocked', v_eligible_count, v_blocked_count));
  return jsonb_build_object(
    'campaign_id', p_campaign_id,
    'eligible', v_eligible_count,
    'blocked', v_blocked_count);
end;
$FUNC$;

revoke all on function public.build_campaign_audience(uuid) from public, anon, authenticated;
grant execute on function public.build_campaign_audience(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 7. Approval function: named human only
-- ---------------------------------------------------------------------------
create or replace function public.approve_campaign(
  p_campaign_id uuid,
  p_approved_by uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $FUNC$
declare
  v_campaign record;
begin
  select * into v_campaign
    from public.campaigns
   where id = p_campaign_id for update;
  if not found then
    return jsonb_build_object('error', 'campaign not found');
  end if;
  if not v_campaign.immutable then
    return jsonb_build_object('error', 'build audience before approving');
  end if;
  if v_campaign.approved_at is not null then
    return jsonb_build_object('error', 'campaign already approved');
  end if;
  update public.campaigns
     set approved_by = p_approved_by,
         approved_at = now(),
         status = 'scheduled',
         updated_at = now()
   where id = p_campaign_id;
  insert into public.audit_events
    (actor_type, actor_id, action, entity_type, entity_id, reason)
  values
    ('human', p_approved_by::text, 'campaign_approved',
     'campaigns', p_campaign_id::text, 'campaign approved for sending');
  return jsonb_build_object('campaign_id', p_campaign_id, 'status', 'scheduled');
end;
$FUNC$;

revoke all on function public.approve_campaign(uuid, uuid) from public, anon, authenticated;
grant execute on function public.approve_campaign(uuid, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 8. Campaign pause check
-- ---------------------------------------------------------------------------
create or replace function public.is_campaign_paused()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select paused from public.campaign_pause_controls where id = 1), false)
$$;

revoke all on function public.is_campaign_paused() from public, anon, authenticated;
grant execute on function public.is_campaign_paused() to service_role;

-- ---------------------------------------------------------------------------
-- 9. RLS: server-only for new tables
-- ---------------------------------------------------------------------------
revoke all on public.campaign_audience_records from public, anon, authenticated;
revoke all on public.campaign_pause_controls from public, anon, authenticated;
grant select, insert on public.campaign_audience_records to service_role;
grant select on public.campaign_pause_controls to service_role;
grant update (paused, reason, paused_at, paused_by, updated_at) on public.campaign_pause_controls to service_role;
grant update (campaign_type, description, content_preview, immutable, updated_at, audience_hash, approved_by, approved_at) on public.campaigns to service_role;
