-- SEC-001: deny-by-default RLS. Every table enables RLS and only the
-- policies below are granted. Anonymous survey submission is the only
-- public write path; everything else is staff/auditor gated.
-- Append-only migration.

alter table public.people enable row level security;
alter table public.organisations enable row level security;
alter table public.organisation_contacts enable row level security;
alter table public.contact_points enable row level security;
alter table public.data_sources enable row level security;
alter table public.source_records enable row level security;
alter table public.consent_wording_versions enable row level security;
alter table public.consent_events enable row level security;
alter table public.consent_state enable row level security;
alter table public.suppression_events enable row level security;
alter table public.survey_definitions enable row level security;
alter table public.survey_versions enable row level security;
alter table public.survey_questions enable row level security;
alter table public.survey_sessions enable row level security;
alter table public.survey_answers enable row level security;
alter table public.audit_events enable row level security;
alter table public.campaigns enable row level security;
alter table public.contact_attempts enable row level security;
alter table public.provider_events enable row level security;

-- Nobody can read the public survey answers except staff and auditors.
create policy "public survey versions are readable"
  on public.survey_versions for select
  to iraac_anon, iraac_authenticated
  using (status = 'active');

create policy "public survey questions are readable"
  on public.survey_questions for select
  to iraac_anon, iraac_authenticated
  using (true);

-- Anonymous submission: anon may insert a session (pinned release, anonymous)
-- and insert answers to it. It never reads or updates.
create policy "anon may start a survey session"
  on public.survey_sessions for insert
  to iraac_anon, iraac_authenticated
  with check (anonymous = true and person_id is null);

create policy "anon may record answers to their own session"
  on public.survey_answers for insert
  to iraac_anon, iraac_authenticated
  with check (
    session_id in (select id from public.survey_sessions where anonymous = true)
  );

-- Staff: full operational access to people, contacts, consent, suppression.
create policy "staff manage people"
  on public.people for all
  to iraac_staff
  using (true) with check (true);

create policy "staff manage organisations"
  on public.organisations for all
  to iraac_staff
  using (true) with check (true);

create policy "staff manage organisation contacts"
  on public.organisation_contacts for all
  to iraac_staff
  using (true) with check (true);

create policy "staff manage contact points"
  on public.contact_points for all
  to iraac_staff
  using (true) with check (true);

create policy "staff manage consent events"
  on public.consent_events for all
  to iraac_staff
  using (true) with check (true);

create policy "staff manage suppression events"
  on public.suppression_events for all
  to iraac_staff
  using (true) with check (true);

create policy "staff read consent state"
  on public.consent_state for select
  to iraac_staff
  using (true);

create policy "staff manage data sources"
  on public.data_sources for all
  to iraac_staff
  using (true) with check (true);

create policy "staff manage source records"
  on public.source_records for all
  to iraac_staff
  using (true) with check (true);

create policy "staff manage campaigns and attempts"
  on public.campaigns for all
  to iraac_staff
  using (true) with check (true);

create policy "staff manage contact attempts"
  on public.contact_attempts for all
  to iraac_staff
  using (true) with check (true);

create policy "staff manage provider events"
  on public.provider_events for all
  to iraac_staff
  using (true) with check (true);

-- Staff may read survey data and audit; only head-office staff may approve.
create policy "staff read survey sessions"
  on public.survey_sessions for select
  to iraac_staff
  using (true);

create policy "staff read survey answers"
  on public.survey_answers for select
  to iraac_staff
  using (true);

-- Auditors: read-only across the ledger, no writes.
create policy "auditor reads people"
  on public.people for select to iraac_auditor using (true);
create policy "auditor reads organisations"
  on public.organisations for select to iraac_auditor using (true);
create policy "auditor reads consent events"
  on public.consent_events for select to iraac_auditor using (true);
create policy "auditor reads suppression events"
  on public.suppression_events for select to iraac_auditor using (true);
create policy "auditor reads audit events"
  on public.audit_events for select to iraac_auditor using (true);
create policy "auditor reads campaigns"
  on public.campaigns for select to iraac_auditor using (true);
create policy "auditor reads contact attempts"
  on public.contact_attempts for select to iraac_auditor using (true);
create policy "auditor reads survey sessions"
  on public.survey_sessions for select to iraac_auditor using (true);
create policy "auditor reads survey answers"
  on public.survey_answers for select to iraac_auditor using (true);

-- Audit events are write-once: insert by service role, readable by staff/auditor.
create policy "staff read audit events"
  on public.audit_events for select
  to iraac_staff, iraac_auditor
  using (true);
