-- DATA-001: consent and suppression — the load-bearing wall of the system.
-- Both are append-only event ledgers. Current state is derived from events.
-- Append-only migration; do not edit after merge.

-- Versioned consent wording. The exact text a person saw is immutable.
create table public.consent_wording_versions (
  id uuid primary key default gen_random_uuid(),
  version integer not null,
  wording text not null,
  channel text not null check (channel in ('email', 'sms', 'human_call', 'ai_call', 'recording', 'newsletter')),
  created_at timestamptz not null default now(),
  unique (channel, version)
);

-- Consent events: append-only. One row per affirmative choice.
create table public.consent_events (
  id uuid primary key default gen_random_uuid(),
  person_id uuid references public.people(id) on delete cascade,
  organisation_id uuid references public.organisations(id) on delete cascade,
  contact_point_id uuid references public.contact_points(id) on delete cascade,
  channel text not null check (channel in ('email', 'sms', 'human_call', 'ai_call', 'recording', 'newsletter')),
  consent_wording_version_id uuid not null references public.consent_wording_versions(id),
  granted boolean not null,
  source text not null check (source in ('survey', 'staff_intake', 'event', 'import', 'web')),
  recorded_at timestamptz not null default now(),
  check (person_id is not null or organisation_id is not null)
);

create index on public.consent_events (person_id, channel);
create index on public.consent_events (organisation_id, channel);

-- Current consent state per subject+channel, derived and maintained by trigger.
create table public.consent_state (
  person_id uuid,
  organisation_id uuid,
  channel text not null,
  granted boolean not null,
  consent_event_id uuid not null,
  expires_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (person_id, organisation_id, channel),
  check (person_id is not null or organisation_id is not null)
);

-- Suppression events: append-only. STOP / complaint / withdrawal / hard bounce.
create table public.suppression_events (
  id uuid primary key default gen_random_uuid(),
  person_id uuid references public.people(id) on delete cascade,
  organisation_id uuid references public.organisations(id) on delete cascade,
  contact_point_id uuid references public.contact_points(id) on delete cascade,
  reason text not null check (reason in ('stop', 'withdrawal', 'complaint', 'hard_bounce', 'wrong_person', 'global')),
  channel text,
  recorded_at timestamptz not null default now(),
  check (person_id is not null or organisation_id is not null)
);

create index on public.suppression_events (person_id, channel);
create index on public.suppression_events (organisation_id, channel);
