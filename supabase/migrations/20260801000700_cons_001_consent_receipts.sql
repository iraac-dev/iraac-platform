-- CONS-001: consent receipts, consent_state maintenance, immediate withdrawal.
-- Append-only migration; do not edit after merge.
--
-- Fixes a latent DATA-001 bug: consent_state's composite PK (person_id,
-- organisation_id, channel) makes both id columns implicitly NOT NULL, so a
-- person-only (or organisation-only) row could never be inserted and the
-- table has sat empty. This successor migration swaps in a subject_key
-- surrogate + unique (subject_key, channel), then wires the maintenance
-- trigger that DATA-001 promised but never shipped.

-- 1. Restructure consent_state: one row per subject+channel, person OR org.
alter table public.consent_state drop constraint consent_state_pkey;

-- Postgres keeps the PK's implicit NOT NULL constraints after the PK is
-- dropped; drop them so a person-only (org NULL) row is legal again.
alter table public.consent_state alter column person_id drop not null;
alter table public.consent_state alter column organisation_id drop not null;

alter table public.consent_state
  add column subject_key text
  generated always as (coalesce(person_id::text, organisation_id::text)) stored;

alter table public.consent_state
  add constraint consent_state_subject_channel_key unique (subject_key, channel);

comment on column public.consent_state.subject_key is
  'Derived subject identity (person or organisation uuid as text); the unique (subject_key, channel) replaces the old composite PK that could never hold a person-only row.';

-- 2. Maintenance triggers. consent_events is the source of truth for grants;
--    suppression_events applies withdrawal/stop immediately.

create or replace function public.upsert_consent_state_from_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.granted then
    insert into public.consent_state
      (person_id, organisation_id, channel, granted, consent_event_id)
    values
      (new.person_id, new.organisation_id, new.channel, true, new.id)
    on conflict (subject_key, channel)
    do update set
      granted = true,
      consent_event_id = excluded.consent_event_id,
      updated_at = now();
  else
    insert into public.consent_state
      (person_id, organisation_id, channel, granted, consent_event_id)
    values
      (new.person_id, new.organisation_id, new.channel, false, new.id)
    on conflict (subject_key, channel)
    do update set
      granted = false,
      consent_event_id = excluded.consent_event_id,
      updated_at = now();
  end if;
  return new;
end;
$$;

create trigger consent_events_maintain_state
after insert on public.consent_events
for each row execute function public.upsert_consent_state_from_event();

-- Suppression: any stop/withdrawal/complaint/hard_bounce/global revokes the
-- channel (or all channels for a global stop) immediately.
create or replace function public.apply_suppression_to_state()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.reason = 'global' or new.channel is null then
    update public.consent_state
      set granted = false, updated_at = now()
      where person_id is not distinct from new.person_id
        and organisation_id is not distinct from new.organisation_id;
  else
    update public.consent_state
      set granted = false, updated_at = now()
      where person_id is not distinct from new.person_id
        and organisation_id is not distinct from new.organisation_id
        and channel = new.channel;
  end if;
  return new;
end;
$$;

create trigger suppression_events_apply_state
after insert on public.suppression_events
for each row execute function public.apply_suppression_to_state();

-- 3. Consent receipts: the no-login credential a respondent keeps. The raw
--    token is never stored; only its SHA-256 hex hash, looked up on
--    withdrawal/preferences requests.
create table public.consent_receipts (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  survey_session_id uuid references public.survey_sessions(id) on delete set null,
  wording_version_id uuid not null references public.consent_wording_versions(id),
  token_hash text not null unique,
  channel text not null check (channel in ('email', 'sms', 'human_call', 'ai_call', 'recording', 'newsletter')),
  granted boolean not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index on public.consent_receipts (person_id);
create index on public.consent_receipts (expires_at);

alter table public.consent_receipts enable row level security;

-- 4. Seed wording versions for the I01-I05 permissions from the frozen
--    contract text (2026-08-01 SURV-001 approval). Receipts link here.
--    NOTE: I04 final wording requires legal/privacy approval before any real
--    collection (flagged in the contract); this seed is synthetic baseline.
insert into public.consent_wording_versions (version, wording, channel) values
  (1, 'Email me IRAAC newsletters and invitations to future surveys. Withdraw any time via the link in every email or by contacting IRAAC.', 'email'),
  (1, 'Send me SMS invitations to future surveys. Reply STOP at any time.', 'sms'),
  (1, 'An IRAAC worker may call me about future surveys.', 'human_call'),
  (1, 'An IRAAC AI assistant may call me about future surveys. The call will identify itself as AI and I can ask for a person or end the call.', 'ai_call'),
  (1, 'If IRAAC later proposes recording or retaining a phone transcript, ask me for separate permission at that time. Preference only; not advance recording consent.', 'recording')
on conflict (channel, version) do nothing;

-- 5. RLS policies and grants. Consent writes are SERVER-ONLY (service role):
--    anon gets NO insert/update/delete anywhere in the consent path, so a
--    grant can never be fabricated. Anon gets table-level SELECT (matching
--    the SURV-002 pattern) but NO select policy, so RLS returns zero rows —
--    the query runs, nothing is visible.
grant select on public.consent_receipts to iraac_anon, iraac_authenticated;
grant select on public.consent_state to iraac_anon, iraac_authenticated;
grant select on public.consent_events to iraac_anon, iraac_authenticated;
grant select on public.suppression_events to iraac_anon, iraac_authenticated;

grant select, insert, update, delete on public.consent_receipts to iraac_staff;
grant select on public.consent_receipts to iraac_auditor;
grant select on public.consent_state to iraac_auditor;

create policy "staff manage consent receipts"
  on public.consent_receipts for all
  to iraac_staff
  using (true) with check (true);

create policy "auditor reads consent receipts"
  on public.consent_receipts for select
  to iraac_auditor
  using (true);

create policy "auditor reads consent state"
  on public.consent_state for select
  to iraac_auditor
  using (true);
