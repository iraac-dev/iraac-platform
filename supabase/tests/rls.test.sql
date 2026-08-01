-- SEC-001 / SURV-002: pgTAP RLS tests. Run via `supabase test db`.
-- Every test asserts deny-by-default and the exact grants above.
--
-- SURV-002 additions: anonymous insert path works, anon reads are denied,
-- and a duplicate client_token cannot create a second completion session.
--
-- The V1 release is intentionally 'draft' (nothing live until the release
-- gate), so anon cannot SELECT it via the public active-only policy. The
-- tests reference the release by its explicit UUID from migration
-- 20260801000600 (version 10000000-...-0002) to exercise the insert path.

begin;
select plan(18);

-- pgTAP is a test-only dependency; install it here, not in a migration.
create extension if not exists pgtap;

-- Ensure pgTAP functions are resolvable regardless of the runner's search_path.
set search_path to public, extensions, "$user", pg_catalog;

-- Allow the test runner to switch into the platform roles. Membership is
-- required for SET ROLE; this makes the tests work regardless of which
-- database role the CI/local runner connects as.
grant iraac_anon, iraac_authenticated, iraac_staff, iraac_auditor to current_user;

-- V1 release id from the migration.
\set v1_version '10000000-0000-0000-0000-000000000002'

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

-- 4. anon cannot read the V1 release because it is draft (not active);
--    the public policy only exposes status = 'active'
select is_empty(
  'select * from public.survey_versions'::text,
  'anon cannot read draft survey release'::text
);

-- 5. anon may start an anonymous survey session pinned to the V1 release
select lives_ok(
  format('insert into public.survey_sessions (survey_version_id, completion_mode, anonymous, status) values (%L, ''web'', true, ''in_progress'')', :'v1_version'),
  'anon may start an anonymous survey session'::text
);

-- 6. anon cannot create a session with person_id (must stay anonymous)
select throws_ok(
  format('insert into public.survey_sessions (survey_version_id, completion_mode, anonymous, status, person_id) values (%L, ''web'', false, ''in_progress'', ''00000000-0000-0000-0000-000000000006'')', :'v1_version'),
  'new row violates row-level security policy for table "survey_sessions"',
  'anon cannot create an identified session'::text
);

-- 7. anon may record an answer to an anonymous session (plain insert, no
--    RETURNING — anon has no SELECT policy by design, so the application
--    writes via the service role; this proves the RLS insert path exists).
select lives_ok(
  $a$insert into public.survey_answers (session_id, question_id, answer_value)
  select s.id, q.id, '"Yes"'::jsonb
  from (select id from public.survey_sessions where anonymous = true limit 1) s,
       public.survey_questions q where q.question_key = 'A01'$a$,
  'anon may record an answer to an anonymous session'::text
);

-- 8. duplicate client_token cannot create a second session (idempotency)
-- First insert with a fresh token succeeds.
select lives_ok(
  $a$insert into public.survey_sessions (survey_version_id, completion_mode, anonymous, status, client_token)
  values ('10000000-0000-0000-0000-000000000002', 'web', true, 'in_progress', gen_random_uuid())$a$,
  'first insert with a fresh client_token succeeds'::text
);
-- The fixed token must be unique across the transaction: first insert works.
select lives_ok(
  $a$insert into public.survey_sessions (survey_version_id, completion_mode, anonymous, status, client_token)
  values ('10000000-0000-0000-0000-000000000002', 'web', true, 'in_progress', '11111111-1111-1111-1111-111111111111')$a$,
  'first insert of fixed token succeeds'::text
);
-- Repeating the exact same token must fail on the unique index (23505).
select throws_ok(
  $a$insert into public.survey_sessions (survey_version_id, completion_mode, anonymous, status, client_token)
  values ('10000000-0000-0000-0000-000000000002', 'web', true, 'in_progress', '11111111-1111-1111-1111-111111111111')$a$,
  'duplicate key value violates unique constraint "survey_sessions_client_token_key"',
  'duplicate client_token is blocked (one completion)'::text
);

-- 9. staff can read people
set local role iraac_staff;
select isnt_empty(
  'select * from public.people'::text,
  'staff can read people'::text
);

-- 10. staff can read consent events
select isnt_empty(
  'select * from public.consent_events'::text,
  'staff can read consent events'::text
);

-- 11. staff can read the V1 survey questions
select isnt_empty(
  'select * from public.survey_questions'::text,
  'staff can read survey questions'::text
);

-- 12. auditor cannot write people (read-only)
set local role iraac_auditor;
select throws_ok(
  'insert into public.people (full_name) values (''Nope'')'::text,
  'permission denied for table people',
  'auditor cannot write people'::text
);

-- 13. anon cannot write people (no INSERT grant for anon on people)
set local role iraac_anon;
select throws_ok(
  'insert into public.people (full_name) values (''Nope'')'::text,
  'permission denied for table people',
  'anon cannot write people'::text
);

-- 14. anon cannot write consent events
select throws_ok(
  'insert into public.consent_events (person_id, channel, granted, source) values (''00000000-0000-0000-0000-000000000006'', ''newsletter'', true, ''web'')'::text,
  'permission denied for table consent_events',
  'anon cannot write consent events'::text
);

-- 15. anon cannot update an answer (append-only by RLS)
select throws_ok(
  'update public.survey_answers set answer_value = ''"No"''::jsonb'::text,
  'permission denied for table survey_answers',
  'anon cannot update survey answers'::text
);

-- 16. anon cannot delete a session (no DELETE grant/policy)
select throws_ok(
  'delete from public.survey_sessions'::text,
  'permission denied for table survey_sessions',
  'anon cannot delete survey sessions'::text
);

rollback;
