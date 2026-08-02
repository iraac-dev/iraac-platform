-- R3: pgTAP tests for the protected control plane (staff memberships).
-- Proves: the guard helper returns ONLY active unexpired roles, expired/
-- revoked/pending rows are invisible, offboarding revokes + audits, and the
-- RLS boundary (anon denied, staff/auditor read).
-- Run via `supabase test db`.

begin;
select plan(18);

create extension if not exists pgtap;
set search_path to public, extensions, "$user", pg_catalog;
grant iraac_anon, iraac_authenticated, iraac_staff, iraac_auditor to current_user;

-- Synthetic auth user ids (50000000-... are R3-only; not real Supabase users).
insert into public.staff_memberships (id, auth_user_id, role, status, valid_from, valid_until, granted_by) values
  ('50000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-0000000000a1', 'viewer', 'active', now() - interval '1 day', now() + interval '30 days', null),
  ('50000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-0000000000a1', 'analyst', 'active', now() - interval '1 day', null, null),
  ('50000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-0000000000a1', 'admin', 'expired', now() - interval '60 days', now() - interval '1 day', null),
  ('50000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-0000000000a1', 'approver', 'revoked', now() - interval '1 day', null, null),
  ('50000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-0000000000a1', 'report_author', 'pending', now() - interval '1 day', null, null),
  ('50000000-0000-0000-0000-000000000006', '50000000-0000-0000-0000-0000000000b1', 'viewer', 'active', now() - interval '1 day', now() + interval '30 days', null);

-- 1. Tables exist.
select has_column('public', 'staff_memberships', 'auth_user_id', 'staff_memberships has auth_user_id');
select has_column('public', 'staff_memberships', 'role', 'staff_memberships has role');
select has_column('public', 'staff_invitations', 'token_hash', 'staff_invitations has token_hash');

-- 2. The guard returns only active, unexpired roles (viewer + analyst for a1).
select set_eq(
  'select role from public.active_staff_roles(''50000000-0000-0000-0000-0000000000a1'')'::text,
  $$values ('viewer'::text), ('analyst'::text)$$::text,
  'active_staff_roles returns only active unexpired memberships'
);

-- 3. Expired membership is invisible to the guard.
select is(
  (select count(*) from public.active_staff_roles('50000000-0000-0000-0000-0000000000a1')
    where role = 'admin'),
  0::bigint,
  'expired membership never resolves'
);

-- 4. Revoked membership is invisible.
select is(
  (select count(*) from public.active_staff_roles('50000000-0000-0000-0000-0000000000a1')
    where role = 'approver'),
  0::bigint,
  'revoked membership never resolves'
);

-- 5. Pending membership is invisible.
select is(
  (select count(*) from public.active_staff_roles('50000000-0000-0000-0000-0000000000a1')
    where role = 'report_author'),
  0::bigint,
  'pending membership never resolves'
);

-- 6. A different user resolves their own role only.
select set_eq(
  'select role from public.active_staff_roles(''50000000-0000-0000-0000-0000000000b1'')'::text,
  $$values ('viewer'::text)$$::text,
  'active_staff_roles is scoped to the named user'
);

-- 7. Offboarding revokes active memberships and audits the action.
select lives_ok(
  $$select public.offboard_staff('50000000-0000-0000-0000-0000000000a1', 'staff exit')$$,
  'offboard_staff runs'
);

select is(
  (select count(*) from public.staff_memberships
     where auth_user_id = '50000000-0000-0000-0000-0000000000a1' and status = 'active'),
  0::bigint,
  'offboarding revokes every active membership'
);

select is(
  (select count(*) from public.audit_events
     where action = 'staff_offboarded' and entity_id = '50000000-0000-0000-0000-0000000000a1'),
  1::bigint,
  'offboarding writes an audit event'
);

-- 8. After offboarding the guard resolves nothing for that user.
select is_empty(
  'select role from public.active_staff_roles(''50000000-0000-0000-0000-0000000000a1'')'::text,
  'guard resolves no roles after offboarding'
);

-- 9. Invitation lifecycle: token hash is unique.
select throws_ok(
  $$insert into public.staff_invitations (email, role, token_hash, expires_at) values
     ('dup@example.com', 'viewer', '1111111111111111111111111111111111111111111111111111111111111111', now() + interval '7 days'),
     ('dup2@example.com', 'viewer', '1111111111111111111111111111111111111111111111111111111111111111', now() + interval '7 days')$$,
  null, null,
  'duplicate invitation token_hash is rejected'
);

-- 10. RLS boundary: anon cannot read memberships or invitations.
set local role iraac_anon;
select is_empty(
  'select * from public.staff_memberships'::text,
  'anon cannot read staff memberships'
);
select is_empty(
  'select * from public.staff_invitations'::text,
  'anon cannot read staff invitations'
);
reset role;

-- 11. Staff and auditor can read memberships (admin/operations need it).
set local role iraac_staff;
select isnt_empty(
  'select * from public.staff_memberships'::text,
  'staff can read memberships'
);
reset role;

set local role iraac_auditor;
select isnt_empty(
  'select * from public.staff_memberships'::text,
  'auditor can read memberships'
);
reset role;

-- 12. Role constraint rejects an unknown role.
select throws_ok(
  $$insert into public.staff_memberships (auth_user_id, role, status) values
     ('50000000-0000-0000-0000-0000000000c1', 'superuser', 'active')$$,
  null, null,
  'unknown staff role is rejected'
);

select * from finish();
rollback;
