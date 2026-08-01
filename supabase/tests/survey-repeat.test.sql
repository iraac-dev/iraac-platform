-- R1: pgTAP tests for repeat-group survey answers.
-- A session may store several instances of the same question when repeat_key
-- identifies the group instance (e.g. a D03 topic); ordinary answers keep
-- repeat_key = '' and stay unique per (session, question).
-- Run via `supabase test db`.

begin;
select plan(13);

-- pgTAP is a test-only dependency; install it here, not in a migration.
create extension if not exists pgtap;

-- Ensure pgTAP functions are resolvable regardless of the runner's search_path.
set search_path to public, extensions, "$user", pg_catalog;

-- Allow the test runner to switch into the platform roles.
grant iraac_anon, iraac_authenticated, iraac_staff, iraac_auditor to current_user;

-- Synthetic survey graph for this suite (30000000-... IDs are R1-only).
insert into public.survey_definitions (id, slug, title) values
  ('30000000-0000-0000-0000-000000000001', 'r1-repeat-groups', 'Repeat Groups — synthetic');

insert into public.survey_versions (id, survey_id, version, definition, content_hash, status) values
  ('30000000-0000-0000-0000-000000000002',
   '30000000-0000-0000-0000-000000000001', 1, '{}'::jsonb, 'synthetic-hash', 'draft');

insert into public.survey_sessions (id, survey_version_id, completion_mode, anonymous, status) values
  ('30000000-0000-0000-0000-000000000003',
   '30000000-0000-0000-0000-000000000002', 'web', true, 'in_progress');

insert into public.survey_questions (id, survey_id, question_key, question_text, question_type, options) values
  ('30000000-0000-0000-0000-000000000004',
   '30000000-0000-0000-0000-000000000001', 'R1Q1', 'Synthetic repeat-group question', 'multi_choice',
   '["Housing or homelessness","Work"]'),
  ('30000000-0000-0000-0000-000000000005',
   '30000000-0000-0000-0000-000000000001', 'R1Q2', 'Synthetic ordinary question', 'multi_choice',
   '["Cost","Waiting time"]');

-- 1. The repeat_key column exists, is NOT NULL, and defaults to ''.
select has_column('public', 'survey_answers', 'repeat_key',
  'survey_answers has a repeat_key column');

select col_not_null('public', 'survey_answers', 'repeat_key',
  'repeat_key is NOT NULL');

select is(
  (select column_default from information_schema.columns
    where table_schema = 'public' and table_name = 'survey_answers'
      and column_name = 'repeat_key'),
  $$''::text$$,
  'repeat_key defaults to an empty string'
);

-- 2. The per-instance unique constraint exists; the old one is gone.
select is(
  (select count(*) from pg_constraint c
     join pg_class t on t.oid = c.conrelid
     join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public' and t.relname = 'survey_answers'
      and c.conname = 'survey_answers_session_question_repeat_key'
      and c.contype = 'u'),
  1::bigint,
  'unique (session_id, question_id, repeat_key) constraint exists'
);

select is(
  (select count(*) from pg_constraint c
     join pg_class t on t.oid = c.conrelid
     join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public' and t.relname = 'survey_answers'
      and c.conname = 'survey_answers_session_id_question_id_key'),
  0::bigint,
  'old single-answer unique constraint was dropped'
);

-- 3. The same (session_id, question_id) may repeat once per repeat_key value.
select lives_ok(
  $$insert into public.survey_answers (session_id, question_id, repeat_key, answer_value)
    values ('30000000-0000-0000-0000-000000000003',
            '30000000-0000-0000-0000-000000000004',
            'Housing or homelessness', '["Cost","Waiting time"]'::jsonb)$$,
  'first repeat instance (Housing or homelessness) is stored'
);

select lives_ok(
  $$insert into public.survey_answers (session_id, question_id, repeat_key, answer_value)
    values ('30000000-0000-0000-0000-000000000003',
            '30000000-0000-0000-0000-000000000004',
            'Work', '["Waiting time"]'::jsonb)$$,
  'second repeat instance (Work) is stored'
);

-- 4. A duplicate (session_id, question_id, repeat_key) is rejected.
select throws_ok(
  $$insert into public.survey_answers (session_id, question_id, repeat_key, answer_value)
    values ('30000000-0000-0000-0000-000000000003',
            '30000000-0000-0000-0000-000000000004',
            'Work', '["Cost"]'::jsonb)$$,
  'duplicate key value violates unique constraint "survey_answers_session_question_repeat_key"',
  'duplicate repeat instance is rejected'
);

-- 5. Ordinary answers (repeat_key = '') stay unique per (session, question).
select lives_ok(
  $$insert into public.survey_answers (session_id, question_id, answer_value)
    values ('30000000-0000-0000-0000-000000000003',
            '30000000-0000-0000-0000-000000000005', '["Cost"]'::jsonb)$$,
  'first ordinary answer (repeat_key defaults to empty) is stored'
);

select throws_ok(
  $$insert into public.survey_answers (session_id, question_id, answer_value)
    values ('30000000-0000-0000-0000-000000000003',
            '30000000-0000-0000-0000-000000000005', '["Waiting time"]'::jsonb)$$,
  'duplicate key value violates unique constraint "survey_answers_session_question_repeat_key"',
  'duplicate ordinary answer is rejected'
);

-- 6. Sanity: original columns and FK are intact.
select is(
  (select data_type from information_schema.columns
    where table_schema = 'public' and table_name = 'survey_answers'
      and column_name = 'answer_value'),
  'jsonb',
  'answer_value is still jsonb'
);

select col_is_fk('public', 'survey_answers', 'session_id',
  'session_id foreign key is intact');

-- 7. A repeat answer value is stored verbatim.
insert into public.survey_answers (id, session_id, question_id, repeat_key, answer_value)
values ('30000000-0000-0000-0000-000000000008',
        '30000000-0000-0000-0000-000000000003',
        '30000000-0000-0000-0000-000000000005',
        'Housing or homelessness', '["Cost","Waiting time"]'::jsonb);

select is(
  (select answer_value from public.survey_answers
    where id = '30000000-0000-0000-0000-000000000008'),
  '["Cost","Waiting time"]'::jsonb,
  'repeat answer value is stored verbatim'
);

select * from finish();
rollback;
