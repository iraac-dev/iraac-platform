-- R4: real collection pause, independent of survey authoring status.
-- A release can be authored, merged and live (survey_versions.status =
-- 'active') yet still need to stop intake — a safety hold, a data-quality
-- stop, or an operational freeze. That state lives HERE, in a singleton
-- control row, never by mutating survey_versions: pausing never rewrites
-- release state and resuming never touches authoring. The app interlock
-- (assertSurveyReleaseActive) checks this row on every submission.
-- Append-only migration; do not edit after merge.

-- Singleton control row: id = 1 is the only legal row by constraint, so the
-- table can never grow a second conflicting state.
create table public.collection_controls (
  id integer primary key check (id = 1),
  paused boolean not null default false,
  reason text,
  paused_at timestamptz,
  paused_by uuid,
  updated_at timestamptz not null default now()
);

insert into public.collection_controls (id, paused) values (1, false)
on conflict (id) do nothing;

alter table public.collection_controls enable row level security;

-- The pause flag is read by the app's server-side client (service role)
-- only. Public REST roles get no select grant, so anon/authenticated cannot
-- probe it at all; with no select policy RLS would hide the row anyway.
-- Revoking from public/anon/authenticated makes the server-only intent
-- explicit even though new tables default to owner-only privileges.
revoke all on public.collection_controls from public, anon, authenticated;
grant select on public.collection_controls to service_role;

-- The interlock helper the app calls on every submission. Fails open to
-- false if the row is somehow missing (coalesce) so a deleted control row
-- can never silently freeze collection.
create or replace function public.is_collection_paused()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select paused from public.collection_controls where id = 1), false)
$$;

-- Server-only, matching the submit_consent boundary: only the service-role
-- app client may probe the pause state; anon/authenticated get a permission
-- denied regardless of RLS.
revoke all on function public.is_collection_paused() from public, anon, authenticated;
grant execute on function public.is_collection_paused() to service_role;

comment on table public.collection_controls is
  'Singleton collection-control row (id = 1). paused=true halts new survey intake at the app layer; reason/paused_at/paused_by record who paused and why. Independent of survey_versions.status so an operational pause never mutates authoring state.';

comment on function public.is_collection_paused() is
  'Returns true when collection is paused (the singleton collection_controls row has paused=true), false otherwise. Server-only: the service-role app client reads it via the submission interlock; anon/authenticated cannot execute.';
