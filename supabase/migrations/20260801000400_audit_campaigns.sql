-- DATA-001 / SEC-001: audit ledger and campaign/call tracking tables.
-- Append-only migration.

-- Append-only audit events: actor, model/version, run id, reason, approval id, hashes.
create table public.audit_events (
  id bigint generated always as identity primary key,
  actor_type text not null check (actor_type in ('human', 'agent', 'system')),
  actor_id text,
  agent_model text,
  agent_version text,
  run_id text,
  action text not null,
  entity_type text,
  entity_id text,
  reason text,
  approval_id uuid,
  artifact_hash text,
  occurred_at timestamptz not null default now()
);

create index on public.audit_events (entity_type, entity_id);
create index on public.audit_events (occurred_at desc);

-- Campaigns: one row per approved outbound campaign.
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  channel text not null check (channel in ('email', 'sms', 'human_call', 'ai_call')),
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled')),
  audience_hash text,               -- immutable approved audience hash
  content_hash text,                -- immutable approved content hash
  approved_by uuid,
  approved_at timestamptz,
  scheduled_for timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Contact attempts: idempotency key + provider id per attempt.
create table public.contact_attempts (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns(id) on delete cascade,
  person_id uuid references public.people(id) on delete cascade,
  organisation_id uuid references public.organisations(id) on delete cascade,
  channel text not null check (channel in ('email', 'sms', 'human_call', 'ai_call')),
  idempotency_key text not null unique,
  provider_id text,
  status text not null default 'queued' check (status in ('queued', 'sent', 'delivered', 'failed', 'suppressed', 'completed', 'opt_out')),
  attempted_at timestamptz,
  created_at timestamptz not null default now(),
  check (person_id is not null or organisation_id is not null)
);

-- Provider events: signed, replay-safe, idempotent callbacks.
create table public.provider_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_type text not null,
  event_id text not null unique,
  attempt_id uuid references public.contact_attempts(id) on delete cascade,
  signature_verified boolean not null default false,
  payload jsonb,
  received_at timestamptz not null default now()
);
