-- Codex integrated P1 review corrections.
-- Successor migration: preserves append-only history and neutralises unsafe
-- grants/state behaviour found during review of draft PRs #4-#7.

-- Standard public REST roles must not inherit blanket access to current or
-- future platform tables. The application writes through narrowly held
-- service credentials; user-facing access is granted explicitly with RLS.
revoke all privileges on all tables in schema public from anon, authenticated;
alter default privileges in schema public
  revoke all privileges on tables from anon, authenticated;
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;

-- One preference receipt per completed survey session. This closes the race
-- left by the application-level existence check.
create unique index if not exists consent_receipts_survey_session_key
  on public.consent_receipts (survey_session_id)
  where survey_session_id is not null;

-- Suppression is deny-wins. A later ordinary consent event cannot silently
-- clear a channel or global STOP/withdrawal. A future re-permission workflow
-- must resolve suppression with a distinct, audited operation.
create or replace function public.upsert_consent_state_from_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_suppressed boolean;
begin
  select exists (
    select 1
      from public.suppression_events suppression
     where suppression.person_id is not distinct from new.person_id
       and suppression.organisation_id is not distinct from new.organisation_id
       and (suppression.channel is null or suppression.channel = new.channel)
  ) into is_suppressed;

  insert into public.consent_state
    (person_id, organisation_id, channel, granted, consent_event_id)
  values
    (new.person_id, new.organisation_id, new.channel,
     case when is_suppressed then false else new.granted end, new.id)
  on conflict (subject_key, channel)
  do update set
    granted = excluded.granted,
    consent_event_id = excluded.consent_event_id,
    updated_at = now();

  return new;
end;
$$;

comment on function public.upsert_consent_state_from_event() is
  'Maintains consent state with suppression deny-wins. Suppression clearance requires a separate audited workflow.';
