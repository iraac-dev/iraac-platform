-- DATA-001: identity and contact — people, organisations, contact points,
-- data sources, and source records. PII lives here, separate from answers.
-- Append-only migration; do not edit after merge.

-- A natural person (community member, citizen participant).
create table public.people (
  id uuid primary key default gen_random_uuid(),
  full_name text,
  mobile_number text,
  email text,
  postcode text,
  office_region text,
  preferred_contact_method text,
  language_preference text,
  best_time_to_call text,
  topics_of_interest text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.people is 'Natural persons. PII: treated as sensitive under APP 3 and Indigenous Data Sovereignty principles.';

-- An organisation (e.g. Aboriginal-owned business from the ~10k directory).
create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  legal_name text,
  trading_name text,
  abn text,
  address text,
  business_use_evidence text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.organisations is 'Organisations, kept distinct from people. A directory record never inherits a citizen consent.';

-- Link table: person ↔ organisation with a role.
create table public.organisation_contacts (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  person_id uuid references public.people(id) on delete cascade,
  role text,
  created_at timestamptz not null default now(),
  unique (organisation_id, person_id)
);

-- Data sources: where a record came from (website form, home visit, drop-in,
-- event transcription, public business directory, import).
create table public.data_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('consented', 'directory', 'import', 'event', 'other')),
  licence_notes text,
  created_at timestamptz not null default now()
);

-- Contact points: every reachable endpoint with provenance and business-use evidence.
create table public.contact_points (
  id uuid primary key default gen_random_uuid(),
  person_id uuid references public.people(id) on delete cascade,
  organisation_id uuid references public.organisations(id) on delete cascade,
  kind text not null check (kind in ('mobile', 'email', 'landline', 'other')),
  value text not null,
  is_business_use boolean not null default false,
  business_use_evidence text,
  source_id uuid references public.data_sources(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (person_id is not null or organisation_id is not null)
);

-- Source records: one row per raw record ingested, with provenance and timestamp.
create table public.source_records (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.data_sources(id) on delete cascade,
  external_key text,
  raw_payload jsonb,
  ingested_at timestamptz not null default now(),
  status text not null default 'raw' check (status in ('raw', 'validated', 'deduped', 'quarantined'))
);
