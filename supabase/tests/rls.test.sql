-- SEC-001 / DATA-001: pgTAP RLS tests. Run via `supabase test db`.
-- Every test asserts deny-by-default and the exact grants above.

begin;
select plan(8);

-- pgTAP is a test-only dependency; install it here, not in a migration.
create extension if not exists pgtap;

-- Ensure pgTAP functions are resolvable regardless of the runner's search_path.
set search_path to public, extensions, "$user", pg_catalog;

-- Allow the test runner to switch into the platform roles. Membership is
-- required for SET ROLE; this makes the tests work regardless of which
-- database role the CI/local runner connects as.
grant iraac_anon, iraac_authenticated, iraac_staff, iraac_auditor to current_user;

-- 1. anon cannot read people (PII)
set local role iraac_anon;
select is_empty(
  'select * from public.people'::text,
  'anon cannot read people'::text
);

-- 2. anon cannot read consent events
select is_empty(
  'select * from public.consent_events'::text,
  'anon cannot read consent events'::text
);

-- 3. anon cannot read survey answers
select is_empty(
  'select * from public.survey_answers'::text,
  'anon cannot read survey answers'::text
);

-- 4. anon can read active survey versions only
select results_eq(
  'select status from public.survey_versions'::text,
  $$values ('active')::text$$,
  'anon sees only active survey release'::text
);

-- 5. staff can read people
set local role iraac_staff;
select isnt_empty(
  'select * from public.people'::text,
  'staff can read people'::text
);

-- 6. staff can read consent events
select isnt_empty(
  'select * from public.consent_events'::text,
  'staff can read consent events'::text
);

-- 7. auditor cannot write people (read-only)
set local role iraac_auditor;
select throws_ok(
  'insert into public.people (full_name) values (''Nope'')'::text,
  'permission denied for table people'::text,
  'auditor cannot write people'::text
);

-- 8. anon cannot write people
set local role iraac_anon;
select throws_ok(
  'insert into public.people (full_name) values (''Nope'')'::text,
  'permission denied for table people'::text,
  'anon cannot write people'::text
);

rollback;
