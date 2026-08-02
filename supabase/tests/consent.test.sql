-- CONS-001: pgTAP tests for consent receipts, consent_state maintenance,
-- immediate suppression, and the server-only RLS boundary.
-- Run via `supabase test db`.
--
-- Consent writes are SERVER-ONLY (service role). Anon gets NO direct access:
-- no fabricating grants, no reading PII. These tests assert that boundary
-- plus the trigger behaviour.

begin;
select plan(16);

-- pgTAP is a test-only dependency; install it here, not in a migration.
create extension if not exists pgtap;

-- Ensure pgTAP functions are resolvable regardless of the runner's search_path.
set search_path to public, extensions, "$user", pg_catalog;

-- Allow the test runner to switch into the platform roles.
grant iraac_anon, iraac_authenticated, iraac_staff, iraac_auditor to current_user;

-- Synthetic subject + wording version (CONS-001 seeds 5 permission wordings).
insert into public.people (id, full_name, email) values
  ('20000000-0000-0000-0000-000000000001', 'Consent Test Person', 'consent.test@example.com');

select results_eq(
  'select count(*)::int from public.consent_wording_versions where channel in (''email'',''sms'',''human_call'',''ai_call'',''recording'')'::text,
  $$values (5)$$::text,
  'CONS-001 seeds one wording version per permission channel'
);

-- 1. A granted consent event maintains consent_state (granted = true).
insert into public.consent_events (person_id, channel, consent_wording_version_id, granted, source)
select
  '20000000-0000-0000-0000-000000000001',
  'email',
  id,
  true,
  'survey'
from public.consent_wording_versions
where channel = 'email' limit 1;

select is(
  (select granted from public.consent_state where person_id = '20000000-0000-0000-0000-000000000001' and channel = 'email'),
  true,
  'granted consent event maintains consent_state as granted'
);

-- 2. A granted=false consent event revokes immediately.
insert into public.consent_events (person_id, channel, consent_wording_version_id, granted, source)
select
  '20000000-0000-0000-0000-000000000001',
  'email',
  id,
  false,
  'web'
from public.consent_wording_versions
where channel = 'email' limit 1;

select is(
  (select granted from public.consent_state where person_id = '20000000-0000-0000-0000-000000000001' and channel = 'email'),
  false,
  'revocation consent event flips consent_state to revoked'
);

-- 3. Re-grant, then a channel suppression (withdrawal) applies immediately.
insert into public.consent_events (person_id, channel, consent_wording_version_id, granted, source)
select
  '20000000-0000-0000-0000-000000000001',
  'sms',
  id,
  true,
  'survey'
from public.consent_wording_versions
where channel = 'sms' limit 1;

insert into public.suppression_events (person_id, reason, channel)
values ('20000000-0000-0000-0000-000000000001', 'withdrawal', 'sms');

select is(
  (select granted from public.consent_state where person_id = '20000000-0000-0000-0000-000000000001' and channel = 'sms'),
  false,
  'channel withdrawal suppression flips consent_state immediately'
);

-- 4. A global suppression revokes every channel.
insert into public.consent_events (person_id, channel, consent_wording_version_id, granted, source)
select
  '20000000-0000-0000-0000-000000000001',
  'human_call',
  id,
  true,
  'survey'
from public.consent_wording_versions
where channel = 'human_call' limit 1;

insert into public.suppression_events (person_id, reason)
values ('20000000-0000-0000-0000-000000000001', 'global');

select is(
  (select granted from public.consent_state where person_id = '20000000-0000-0000-0000-000000000001' and channel = 'human_call'),
  false,
  'global suppression revokes every channel in consent_state'
);

-- Suppression remains authoritative when an ordinary later grant arrives.
insert into public.consent_events (person_id, channel, consent_wording_version_id, granted, source)
select '20000000-0000-0000-0000-000000000001', 'sms', id, true, 'survey'
from public.consent_wording_versions where channel = 'sms' limit 1;

select is(
  (select granted from public.consent_state where person_id = '20000000-0000-0000-0000-000000000001' and channel = 'sms'),
  false,
  'channel suppression denies a later ordinary grant'
);

insert into public.consent_events (person_id, channel, consent_wording_version_id, granted, source)
select '20000000-0000-0000-0000-000000000001', 'human_call', id, true, 'survey'
from public.consent_wording_versions where channel = 'human_call' limit 1;

select is(
  (select granted from public.consent_state where person_id = '20000000-0000-0000-0000-000000000001' and channel = 'human_call'),
  false,
  'global suppression denies a later ordinary grant'
);

-- 5. Consent receipts: token hash is unique; staff can read, auditor read-only.
insert into public.consent_receipts (person_id, token_hash, channel, granted, expires_at)
values (
  '20000000-0000-0000-0000-000000000001',
  'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
  'email',
  true,
  now() + interval '12 months'
);

select throws_ok(
  $$insert into public.consent_receipts (person_id, token_hash, channel, granted, expires_at)
    values ('20000000-0000-0000-0000-000000000001',
      'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
      'sms', true, now() + interval '12 months')$$,
  null, null,
  'duplicate token_hash is rejected'
);

-- 6. Anon can see NOTHING on consent tables (server-only boundary).
set local role iraac_anon;
select is_empty(
  'select * from public.consent_receipts'::text,
  'anon cannot read consent receipts'::text
);
select is_empty(
  'select * from public.consent_state'::text,
  'anon cannot read consent state'::text
);
select is_empty(
  'select * from public.consent_events'::text,
  'anon cannot read consent events'::text
);
select is_empty(
  'select * from public.suppression_events'::text,
  'anon cannot read suppression events'::text
);
select throws_ok(
  $$insert into public.consent_events (person_id, channel, consent_wording_version_id, granted, source)
    values ('20000000-0000-0000-0000-000000000001', 'email',
      (select id from public.consent_wording_versions where channel = 'email' limit 1),
      true, 'web')$$,
  null, null,
  'anon insert on consent_events denied'::text
);
reset role;

-- 7. Auditor is read-only on receipts.
set local role iraac_auditor;
select isnt_empty(
  'select * from public.consent_receipts'::text,
  'auditor can read consent receipts'::text
);
select throws_ok(
  $$insert into public.consent_receipts (person_id, token_hash, channel, granted, expires_at)
    values ('20000000-0000-0000-0000-000000000001',
      'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210',
      'sms', true, now() + interval '12 months')$$,
  null, null,
  'auditor insert on consent_receipts denied'::text
);
reset role;

-- 8. Staff can manage receipts.
set local role iraac_staff;
select isnt_empty(
  'select * from public.consent_receipts'::text,
  'staff can read consent receipts'::text
);
reset role;

select * from finish();
rollback;
