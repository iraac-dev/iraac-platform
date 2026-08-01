-- R3: protected control plane — server-managed staff membership.
-- The dashboard must NOT trust the JWT app_metadata role claim alone.
-- Authoritative membership lives in application tables, keyed to the
-- Supabase Auth user id, with explicit active/expired/revoked state.
-- Append-only migration; do not edit after merge.

-- Staff invitations: short-lived, single-use, bound to a normalised email.
-- Mirrors SEC-001's intent but records the full lifecycle server-side.
create table public.staff_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,                        -- normalised lowercase address
  role text not null check (role in ('viewer', 'analyst', 'report_author', 'approver', 'communications_operator', 'admin')),
  token_hash text not null unique,            -- raw token never stored
  issued_by uuid,                             -- auth user id of the inviter
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  auth_user_id uuid,                          -- set on acceptance
  created_at timestamptz not null default now()
);

create index on public.staff_invitations (email);
create index on public.staff_invitations (expires_at);

alter table public.staff_invitations enable row level security;

-- Staff memberships: the authoritative role binding. A user may hold several
-- (e.g. analyst + report_author); each must be active and unexpired to grant
-- access. Offboarding marks the row inactive so RLS denies an otherwise
-- valid JWT, then sessions are revoked at the app layer.
create table public.staff_memberships (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null,                 -- Supabase Auth user id
  organisation_id uuid references public.organisations(id) on delete set null,
  role text not null check (role in ('viewer', 'analyst', 'report_author', 'approver', 'communications_operator', 'admin')),
  status text not null default 'pending' check (status in ('pending', 'active', 'expired', 'revoked', 'offboarded')),
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  granted_by uuid,                            -- auth user id of the grantor
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoke_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on public.staff_memberships (auth_user_id, status);
create index on public.staff_memberships (valid_until);

alter table public.staff_memberships enable row level security;

comment on table public.staff_memberships is
  'Authoritative staff role bindings. A JWT app_metadata role claim is never sufficient: access requires an active, unexpired membership row for the authenticated auth user.';

-- The guard helper the app layer calls (service role) to resolve the
-- effective admin roles for an auth user. Returns ONLY active, unexpired
-- memberships; expired or revoked rows are invisible to the guard.
create or replace function public.active_staff_roles(p_auth_user_id uuid)
returns table (role text)
language sql
stable
security definer
set search_path = public
as $$
  select m.role
    from public.staff_memberships m
   where m.auth_user_id = p_auth_user_id
     and m.status = 'active'
     and (m.valid_until is null or m.valid_until > now())
$$;

comment on function public.active_staff_roles(uuid) is
  'Resolves only active, unexpired staff roles for a named auth user. Used by the dashboard guard; never returns expired/revoked/pending rows.';

-- Staff can read memberships and invitations (they administer their own
-- team); auditors read them too. The app guard queries via service role.
-- Anon/authenticated get table-level SELECT (matching the CONS-001 pattern:
-- the query runs, but with no select policy RLS returns zero rows) — the
-- public REST roles can never see membership or invitation rows.
grant select on public.staff_memberships to iraac_staff, iraac_auditor, iraac_anon, iraac_authenticated;
grant select on public.staff_invitations to iraac_staff, iraac_auditor, iraac_anon, iraac_authenticated;

create policy "staff read memberships"
  on public.staff_memberships for select
  to iraac_staff
  using (true);

create policy "auditor read memberships"
  on public.staff_memberships for select
  to iraac_auditor
  using (true);

create policy "staff read invitations"
  on public.staff_invitations for select
  to iraac_staff
  using (true);

create policy "auditor read invitations"
  on public.staff_invitations for select
  to iraac_auditor
  using (true);

-- Offboarding helper: mark every membership for the user inactive and
-- revoked, and record the action. Session revocation happens at the app
-- layer (Supabase Auth admin), which is outside the database.
create or replace function public.offboard_staff(
  p_auth_user_id uuid,
  p_reason text default 'offboarding'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.staff_memberships
     set status = 'revoked',
         revoked_at = now(),
         revoke_reason = coalesce(p_reason, 'offboarding'),
         updated_at = now()
   where auth_user_id = p_auth_user_id
     and status in ('pending', 'active');

  insert into public.audit_events
    (actor_type, actor_id, action, entity_type, entity_id, reason)
  values
    ('system', p_auth_user_id::text, 'staff_offboarded',
     'staff_memberships', p_auth_user_id::text,
     coalesce(p_reason, 'offboarding'));
end;
$$;

comment on function public.offboard_staff(uuid, text) is
  'Revokes every staff membership for a user and audits the offboarding. Call before revoking the Auth sessions at the app layer.';
