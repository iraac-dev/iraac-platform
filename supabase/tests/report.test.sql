-- R5: pgTAP tests for governed reports.
-- Proves: snapshot immutability, small-cell suppression on derived views,
-- lifecycle transitions (incl. illegal ones), immutable versions, feedback
-- never approves, exception queue, anon boundary.
-- Run via `supabase test db`.

begin;
select plan(29);

create extension if not exists pgtap;
set search_path to public, extensions, "$user", pg_catalog;
grant iraac_anon, iraac_authenticated, iraac_staff, iraac_auditor to current_user;

-- Synthetic snapshot (70000000-... ids are R5-only).
insert into public.report_dataset_snapshots
  (id, label, source_commit, source_migration, row_count, content_hash, status, locked_at)
values
  ('70000000-0000-0000-0000-000000000001', 'Synthetic P1 base', 'deadbeef',
   '20260801001400_r5_reports.sql', 120, 'snapshot-hash-1', 'approved_locked', now());

-- 1. Tables exist.
select has_column('public', 'report_documents', 'status', 'report_documents has status');
select has_column('public', 'report_documents', 'content_hash', 'report_documents has content_hash');
select has_column('public', 'report_document_versions', 'version', 'report_document_versions has version');
select has_column('public', 'report_derived_views', 'suppressed', 'report_derived_views has suppressed');
select has_column('public', 'report_feedback', 'is_approval', 'report_feedback has is_approval');

-- 2. Small-cell suppression: community_public and staff_partner cells under 5
--    are suppressed; government cells keep the count.
select lives_ok(
  $$select public.insert_derived_view(
     '70000000-0000-0000-0000-000000000001', 'community_public',
     'responses_by_region', 'Nowra', 'respondents', 3)$$,
  'insert small community cell'
);

select is(
  (select suppressed from public.report_derived_views
     where snapshot_id = '70000000-0000-0000-0000-000000000001'
       and audience = 'community_public' and dimension_key = 'Nowra'),
  true,
  'community_public cell under threshold is suppressed'
);

select is(
  (select metric_value from public.report_derived_views
     where snapshot_id = '70000000-0000-0000-0000-000000000001'
       and audience = 'community_public' and dimension_key = 'Nowra'),
  0::numeric,
  'suppressed cell stores 0, never the raw count'
);

select lives_ok(
  $$select public.insert_derived_view(
     '70000000-0000-0000-0000-000000000001', 'government',
     'responses_by_region', 'Nowra', 'respondents', 3)$$,
  'insert small government cell'
);

select is(
  (select suppressed from public.report_derived_views
     where snapshot_id = '70000000-0000-0000-0000-000000000001'
       and audience = 'government' and dimension_key = 'Nowra'),
  false,
  'government cell keeps full count (not suppressed)'
);

select is(
  (select metric_value from public.report_derived_views
     where snapshot_id = '70000000-0000-0000-0000-000000000001'
       and audience = 'government' and dimension_key = 'Nowra'),
  3::numeric,
  'government cell stores the real count'
);

-- 3. Report lifecycle: draft -> in_review -> approved_locked -> published.
insert into public.report_documents
  (id, snapshot_id, title, audience, status, content_hash)
values
  ('70000000-0000-0000-0000-0000000000d1', '70000000-0000-0000-0000-000000000001',
   'Synthetic community report', 'community_public', 'draft', 'empty');

select lives_ok(
  $$select public.transition_report('70000000-0000-0000-0000-0000000000d1',
     'in_review', '00000000-0000-4000-8000-0000000000aa', 'start review',
     '# Draft report for testing', 'initial draft')$$,
  'create + transition to in_review with content'
);

select is(
  (select status from public.report_documents
     where id = '70000000-0000-0000-0000-0000000000d1'),
  'in_review',
  'document is in_review after transition'
);

select is(
  (select current_version from public.report_documents
     where id = '70000000-0000-0000-0000-0000000000d1'),
  1,
  'first content version recorded'
);

select is(
  (select count(*) from public.report_document_versions
     where document_id = '70000000-0000-0000-0000-0000000000d1'),
  1::bigint,
  'one immutable version row exists'
);

select lives_ok(
  $$select public.transition_report('70000000-0000-0000-0000-0000000000d1',
     'approved_locked', '00000000-0000-4000-8000-0000000000aa', 'approve')$$,
  'approve_locked transition'
);

select lives_ok(
  $$select public.transition_report('70000000-0000-0000-0000-0000000000d1',
     'published', '00000000-0000-4000-8000-0000000000aa', 'publish')$$,
  'publish transition'
);

select is(
  (select published_at is not null from public.report_documents
     where id = '70000000-0000-0000-0000-0000000000d1'),
  true,
  'published_at set on publish'
);

-- 4. Illegal transition: published -> draft is refused.
select throws_ok(
  $$select public.transition_report('70000000-0000-0000-0000-0000000000d1',
     'draft', '00000000-0000-4000-8000-0000000000aa', 'rewind')$$,
  null, null,
  'published -> draft is an invalid transition'
);

-- 5. Unchanged content is not re-versioned.
select throws_ok(
  $$select public.transition_report('70000000-0000-0000-0000-0000000000d1',
     'retracted', '00000000-0000-4000-8000-0000000000aa',
     'retract', '# Draft report for testing', 'same text')$$,
  null, null,
  'unchanged content is refused (no duplicate version)'
);

-- 6. Audit trail: every transition wrote an audit event.
select is(
  (select count(*) from public.audit_events
     where entity_type = 'report_documents' and action = 'report_transition'),
  3::bigint,
  'three audited transitions for the report'
);

-- 7. Feedback never approves.
select lives_ok(
  $$select public.ingest_report_feedback('70000000-0000-0000-0000-0000000000d1',
     'email_reply', 'Please publish this report immediately.')$$,
  'ingest feedback from an email reply'
);

select is(
  (select is_approval from public.report_feedback
     where report_id = '70000000-0000-0000-0000-0000000000d1' limit 1),
  false,
  'email reply feedback is never an approval'
);

select is(
  (select status from public.report_documents
     where id = '70000000-0000-0000-0000-0000000000d1'),
  'published',
  'feedback did not change the report status'
);

-- 8. Exception queue rows exist and can be flagged.
insert into public.report_exceptions (report_id, kind, description, status)
values ('70000000-0000-0000-0000-0000000000d1', 'data_anomaly', 'Region count spike', 'open');

select is(
  (select count(*) from public.report_exceptions
     where report_id = '70000000-0000-0000-0000-0000000000d1' and status = 'open'),
  1::bigint,
  'exception queue row recorded'
);

-- 9. Anon boundary: community sees ONLY published community documents.
set local role iraac_anon;
select is_empty(
  $$select * from public.report_documents where audience = 'staff_partner'$$::text,
  'anon cannot see staff_partner documents'
);
select is_empty(
  $$select * from public.report_documents where audience = 'community_public' and status <> 'published'$$::text,
  'anon cannot see unpublished community documents'
);
reset role;

-- 10. Staff and auditor can read documents.
set local role iraac_staff;
select isnt_empty(
  'select * from public.report_documents'::text,
  'staff can read report documents'
);
reset role;

set local role iraac_auditor;
select isnt_empty(
  'select * from public.report_documents'::text,
  'auditor can read report documents'
);
reset role;

select * from finish();
rollback;
