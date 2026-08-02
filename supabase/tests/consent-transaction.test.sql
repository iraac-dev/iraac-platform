-- R2: pgTAP tests for transactional consent capture (public.submit_consent).
-- Proves: atomicity (a mid-function failure rolls back EVERYTHING),
-- idempotency (one receipt per session), deny-wins suppression through the
-- RPC path, and the anon/server-only boundary.
-- Run via `supabase test db`.

begin;
select plan(26);

-- pgTAP is a test-only dependency; install it here, not in a migration.
create extension if not exists pgtap;

-- Ensure pgTAP functions are resolvable regardless of the runner's search_path.
set search_path to public, extensions, "$user", pg_catalog;

-- Allow the test runner to switch into the platform roles.
grant iraac_anon, iraac_authenticated, iraac_staff, iraac_auditor to current_user;

-- Synthetic survey graph (40000000-... IDs are R2-only).
insert into public.survey_definitions (id, slug, title) values
  ('40000000-0000-0000-0000-000000000001', 'r2-consent', 'R2 Consent — synthetic');

insert into public.survey_versions (id, survey_id, version, definition, content_hash, status) values
  ('40000000-0000-0000-0000-000000000002',
   '40000000-0000-0000-0000-000000000001', 1, '{}'::jsonb, 'synthetic-hash', 'draft');

insert into public.survey_sessions (id, survey_version_id, completion_mode, anonymous, status, completed_at) values
  ('40000000-0000-0000-0000-000000000003',
   '40000000-0000-0000-0000-000000000002', 'web', true, 'completed', now());

insert into public.survey_sessions (id, survey_version_id, completion_mode, anonymous, status) values
  ('40000000-0000-0000-0000-000000000004',
   '40000000-0000-0000-0000-000000000002', 'web', true, 'in_progress');

-- 1. The function exists and is executable.
select is(
  (select count(*) from information_schema.routines
    where routine_schema = 'public' and routine_name = 'submit_consent'),
  1::bigint,
  'submit_consent function exists'
);

-- 2. A full call creates exactly one person with the provided email.
select is(
  (select (public.submit_consent(
     '40000000-0000-0000-0000-000000000003',
     'R2 Test Person',
     'r2.test@example.com',
     '0400000000',
     '{"I01":true,"I02":true,"I03":false,"I04":false,"I05":false}'::jsonb,
     'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
   ))->>'created'),
  'true',
  'full consent call returns created:true'
);

select is(
  (select count(*) from public.people where email = 'r2.test@example.com'),
  1::bigint,
  'full consent call creates exactly one person'
);

-- 3. Exactly two contact points (email + mobile) are created.
select is(
  (select count(*) from public.contact_points
     where person_id = (select id from public.people where email = 'r2.test@example.com')),
  2::bigint,
  'full consent call creates email and mobile contact points'
);

-- 4. Exactly two consent events (email + sms), each pinned to a wording version.
select is(
  (select count(*) from public.consent_events
     where person_id = (select id from public.people where email = 'r2.test@example.com')),
  2::bigint,
  'full consent call creates one consent event per granted channel'
);

-- 5. Exactly one receipt with the passed token hash.
select is(
  (select count(*) from public.consent_receipts
     where survey_session_id = '40000000-0000-0000-0000-000000000003'),
  1::bigint,
  'full consent call creates exactly one receipt'
);

select is(
  (select token_hash from public.consent_receipts
     where survey_session_id = '40000000-0000-0000-0000-000000000003'),
  'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'receipt stores the exact token hash passed by the caller'
);

-- 6. Exactly one audit event records the capture.
select is(
  (select count(*) from public.audit_events
     where action = 'consent_captured'
       and entity_type = 'consent_receipts'
       and actor_type = 'system'),
  1::bigint,
  'consent capture writes one audit event'
);

-- 7. The consent_events trigger maintained consent_state for both channels.
select is(
  (select granted from public.consent_state
     where person_id = (select id from public.people where email = 'r2.test@example.com')
       and channel = 'email'),
  true,
  'consent_state.email is granted'
);

select is(
  (select granted from public.consent_state
     where person_id = (select id from public.people where email = 'r2.test@example.com')
       and channel = 'sms'),
  true,
  'consent_state.sms is granted'
);

-- 8. Idempotency: a second call for the same session returns the existing
--    receipt and creates NO new rows anywhere.
select is(
  (select (public.submit_consent(
     '40000000-0000-0000-0000-000000000003',
     'R2 Test Person',
     'r2.test@example.com',
     '0400000000',
     '{"I01":true,"I02":true,"I03":false,"I04":false,"I05":false}'::jsonb,
     'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
   ))->>'created'),
  'false',
  'duplicate session returns created:false'
);

select is(
  (select count(*) from public.consent_receipts
     where survey_session_id = '40000000-0000-0000-0000-000000000003'),
  1::bigint,
  'duplicate session creates no second receipt'
);

select is(
  (select count(*) from public.people where email = 'r2.test@example.com'),
  1::bigint,
  'duplicate session creates no second person'
);

-- 9. Atomicity: delete the human_call wording row so the RPC fails AFTER
--    writing the person, contact points and the email consent event, then
--    assert the whole transaction rolled back. (human_call has no events
--    from the earlier tests, so the delete does not violate the FK.)
insert into public.survey_sessions (id, survey_version_id, completion_mode, anonymous, status, completed_at) values
  ('40000000-0000-0000-0000-000000000006',
   '40000000-0000-0000-0000-000000000002', 'web', true, 'completed', now());

delete from public.consent_wording_versions
 where channel = 'human_call' and version = 1;

select throws_ok(
  $$select public.submit_consent(
     '40000000-0000-0000-0000-000000000006',
     'Atomic Person',
     'atomic@example.com',
     '0411111111',
     '{"I01":true,"I02":false,"I03":true,"I04":false,"I05":false}'::jsonb,
     'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc')$$,
  null, null,
  'missing wording version makes the RPC raise'
);

select is(
  (select count(*) from public.people where email = 'atomic@example.com'),
  0::bigint,
  'failed consent leaves zero people rows (rolled back)'
);

select is(
  (select count(*) from public.consent_events
     where person_id = (select id from public.people where email = 'r2.test@example.com')),
  2::bigint,
  'failed consent adds no consent events (rolled back)'
);

select is(
  (select count(*) from public.consent_receipts
     where survey_session_id = '40000000-0000-0000-0000-000000000006'),
  0::bigint,
  'failed consent leaves zero receipts (rolled back)'
);

select is(
  (select count(*) from public.audit_events
     where action = 'consent_captured'),
  1::bigint,
  'failed consent adds no audit events (rolled back)'
);

-- Restore the wording row for the remaining tests (same transaction; this
-- test file rolls back at the end anyway).
insert into public.consent_wording_versions (version, wording, channel)
values (1, 'An IRAAC worker may call me about future surveys.', 'human_call')
on conflict (channel, version) do nothing;

-- 10. A non-completed session is rejected.
select throws_ok(
  $$select public.submit_consent(
     '40000000-0000-0000-0000-000000000004',
     'Incomplete Person',
     'incomplete@example.com',
     null,
     '{"I01":true,"I02":false,"I03":false,"I04":false,"I05":false}'::jsonb,
     'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd')$$,
  null, null,
  'non-completed session raises'
);

-- 11. Deny-wins through the RPC path: a suppression applied after the grant
--     still flips consent_state to false immediately, and a later ordinary
--     grant (via a fresh event for the same person) cannot re-grant.
insert into public.suppression_events (person_id, reason, channel)
select id, 'withdrawal', 'sms' from public.people where email = 'r2.test@example.com';

select is(
  (select granted from public.consent_state
     where person_id = (select id from public.people where email = 'r2.test@example.com')
       and channel = 'sms'),
  false,
  'suppression applied after the RPC grant flips consent_state.sms to false'
);

insert into public.consent_events (person_id, channel, consent_wording_version_id, granted, source)
select p.id, 'sms', w.id, true, 'survey'
  from public.people p, public.consent_wording_versions w
 where p.email = 'r2.test@example.com' and w.channel = 'sms' and w.version = 1
 limit 1;

select is(
  (select granted from public.consent_state
     where person_id = (select id from public.people where email = 'r2.test@example.com')
       and channel = 'sms'),
  false,
  'a later ordinary grant cannot clear the sms suppression (deny-wins)'
);

-- 12. I05 is a preference only: it never creates a consent event, even when
--     the person leaves contact details (receipt is granted=false).
insert into public.survey_sessions (id, survey_version_id, completion_mode, anonymous, status, completed_at) values
  ('40000000-0000-0000-0000-000000000005',
   '40000000-0000-0000-0000-000000000002', 'web', true, 'completed', now());

select lives_ok(
  $$select public.submit_consent(
     '40000000-0000-0000-0000-000000000005',
     'Pref Person',
     'pref@example.com',
     null,
     '{"I01":false,"I02":false,"I03":false,"I04":false,"I05":true}'::jsonb,
     'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee')$$,
  'I05-only call with contact details does not raise'
);

select is(
  (select count(*) from public.consent_events
     where person_id = (select id from public.people where email = 'pref@example.com')),
  0::bigint,
  'I05 alone creates no consent event'
);

select is(
  (select granted from public.consent_receipts
     where survey_session_id = '40000000-0000-0000-0000-000000000005'),
  false,
  'I05-only receipt is granted=false'
);

-- 13. Anon cannot execute the RPC (server-only boundary).
set local role iraac_anon;
select throws_ok(
  $$select public.submit_consent(
     '40000000-0000-0000-0000-000000000003',
     'Anon Person',
     'anon@example.com',
     null,
     '{"I01":true,"I02":false,"I03":false,"I04":false,"I05":false}'::jsonb,
     'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')$$,
  null, null,
  'anon cannot execute submit_consent'
);
reset role;

-- 14. expires_at is ~12 months out on the original receipt.
select ok(
  (select expires_at between now() + interval '11 months' and now() + interval '13 months'
     from public.consent_receipts
     where survey_session_id = '40000000-0000-0000-0000-000000000003'),
  'receipt expires roughly 12 months after capture'
);

select * from finish();
rollback;
