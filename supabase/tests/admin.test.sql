-- ADMIN-001: pgTAP tests for dashboard read paths and the no-generic-admin
-- posture. Run via `supabase test db`.
--
-- The dashboard itself is app-layer guarded (role claim in app_metadata), but
-- the DB must also hold the line: staff can read dashboard tables, auditor is
-- read-only, and there is no shared/generic "admin" role a mailbox could use.

begin;
select plan(6);

-- pgTAP is a test-only dependency; install it here, not in a migration.
create extension if not exists pgtap;

set search_path to public, extensions, "$user", pg_catalog;

grant iraac_anon, iraac_authenticated, iraac_staff, iraac_auditor to current_user;

-- Synthetic dashboard data (rolled back with the test transaction).
insert into public.survey_sessions (id, survey_version_id, completion_mode, anonymous, status, completed_at) values
  ('30000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000002',
   'web', true, 'completed', now());

insert into public.survey_answers (session_id, question_id, answer_value)
select '30000000-0000-0000-0000-000000000001', q.id, '"Yes"'
from public.survey_questions q
where q.survey_id = '10000000-0000-0000-0000-000000000001'
limit 1;

insert into public.audit_events (actor_type, actor_id, action, entity_type)
values ('system', 'seed', 'admin-test-probe', 'survey_session');

-- 1. No generic/shared "admin" role exists among platform roles (named
--    custodianship only). Internal Supabase roles (supabase_*) are out of
--    scope — they are the platform's own machinery, not staff access.
select is_empty(
  $$select rolname from pg_roles
    where rolname like 'iraac\_%'
      and (rolname ilike '%admin%' or rolname ilike '%mailbox%' or rolname ilike '%shared%')$$,
  'no shared or generic admin role exists among iraac roles'
);

-- 2. Staff can read submissions (survey sessions + answers).
set local role iraac_staff;
select isnt_empty(
  'select * from public.survey_sessions'::text,
  'staff can read survey sessions'
);
select isnt_empty(
  'select * from public.survey_answers'::text,
  'staff can read survey answers'
);
select isnt_empty(
  'select * from public.consent_events'::text,
  'staff can read consent events'
);
reset role;

-- 3. Auditor is read-only on dashboard tables.
set local role iraac_auditor;
select isnt_empty(
  'select * from public.survey_sessions'::text,
  'auditor can read survey sessions'
);
select throws_ok(
  $$insert into public.audit_events (actor_type, actor_id, action)
    values ('human', 'auditor-probe', 'probe')$$,
  null, null,
  'auditor cannot write audit events'
);
reset role;

select * from finish();
rollback;
