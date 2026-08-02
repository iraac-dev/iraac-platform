-- CAMP-001: campaign eligibility pgTAP tests.
begin;
select plan(37);

-- Extensions
select has_extension('pgtap');
select has_extension('pgcrypto');

-- Tables exist
select has_table('public', 'campaign_audience_records', 'campaign_audience_records exists');
select has_table('public', 'campaign_pause_controls', 'campaign_pause_controls exists');
select has_table('public', 'campaigns', 'campaigns exists');

-- Campaigns has new columns
select has_column('public', 'campaigns', 'campaign_type', 'campaigns has campaign_type');
select has_column('public', 'campaigns', 'immutable', 'campaigns has immutable');
select has_column('public', 'campaigns', 'description', 'campaigns has description');
select has_column('public', 'campaigns', 'content_preview', 'campaigns has content_preview');

-- Audience columns
select has_column('public', 'campaign_audience_records', 'eligibility_reasons', 'audience has eligibility_reasons');
select has_column('public', 'campaign_audience_records', 'audience_hash', 'audience has audience_hash');
select col_not_null('public', 'campaign_audience_records', 'contact_value', 'contact_value not null');

-- RLS enabled (check via simple boolean query)
select ok(
  (select relrowsecurity from pg_class where relname = 'campaign_audience_records'),
  'audience RLS enabled');
select ok(
  (select relrowsecurity from pg_class where relname = 'campaign_pause_controls'),
  'pause RLS enabled');

-- Functions exist
select has_function('public', 'check_person_eligibility', 'check_person_eligibility exists');
select has_function('public', 'build_campaign_audience', 'build_campaign_audience exists');
select has_function('public', 'approve_campaign', 'approve_campaign exists');
select has_function('public', 'is_campaign_paused', 'is_campaign_paused exists');

-- Service role can execute
select isnt_empty(
  'select proname from pg_proc p
   join pg_roles r on r.rolname = ''service_role''
   where has_function_privilege(''service_role'', p.oid, ''EXECUTE'')
   and p.proname = ''check_person_eligibility''',
  'service_role can execute check_person_eligibility');

-- ---------------------------------------------------------------------------
-- Setup: synthetic person with consent + contact
-- ---------------------------------------------------------------------------
insert into public.people (id, full_name, email)
  values ('00000000-0000-4000-8000-000000000001', 'Test Person A', 'test-a@example.com');
insert into public.contact_points (id, person_id, kind, value, is_active)
  values ('00000000-0000-4000-8000-000000000002',
          '00000000-0000-4000-8000-000000000001', 'email', 'test-a@example.com', true);

-- Get the actual wording version ID from the seeded data
do $$
declare v_wording_id uuid;
begin
  select id into v_wording_id from public.consent_wording_versions
   where channel = 'email' and version = 1;
  if v_wording_id is null then
    insert into public.consent_wording_versions (id, version, wording, channel)
      values ('00000000-0000-4000-8000-000000000003', 1, 'I consent to email', 'email');
  end if;
end $$;

insert into public.consent_events (id, person_id, channel, consent_wording_version_id, granted, source)
  select '00000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000001',
         'email', id, true, 'survey'
  from public.consent_wording_versions where channel = 'email' and version = 1;

-- ---------------------------------------------------------------------------
-- Test: check_person_eligibility returns eligible
-- ---------------------------------------------------------------------------
select ok(
  (public.check_person_eligibility('00000000-0000-4000-8000-000000000001', 'email')) ->> 'eligible' = 'true',
  'consented person with active contact is eligible for email');

-- ---------------------------------------------------------------------------
-- Test: eligibility fails without consent
-- ---------------------------------------------------------------------------
insert into public.people (id, full_name, email)
  values ('00000000-0000-4000-8000-000000000010', 'No Consent', 'noconsent@ex.com');
insert into public.contact_points (id, person_id, kind, value, is_active)
  values ('00000000-0000-4000-8000-000000000011',
          '00000000-0000-4000-8000-000000000010', 'email', 'noconsent@ex.com', true);
select ok(
  (public.check_person_eligibility('00000000-0000-4000-8000-000000000010', 'email')) ->> 'eligible' = 'false',
  'person without consent is not eligible');

-- ---------------------------------------------------------------------------
-- Test: eligibility fails for suppressed person
-- ---------------------------------------------------------------------------
insert into public.people (id, full_name, email)
  values ('00000000-0000-4000-8000-000000000020', 'Suppressed', 'sup@ex.com');
insert into public.contact_points (id, person_id, kind, value, is_active)
  values ('00000000-0000-4000-8000-000000000021',
          '00000000-0000-4000-8000-000000000020', 'email', 'sup@ex.com', true);
insert into public.consent_events (id, person_id, channel, consent_wording_version_id, granted, source)
  select '00000000-0000-4000-8000-000000000022', '00000000-0000-4000-8000-000000000020',
         'email', id, true, 'survey'
  from public.consent_wording_versions where channel = 'email' and version = 1;
insert into public.suppression_events (id, person_id, contact_point_id, reason, channel)
  values ('00000000-0000-4000-8000-000000000023', '00000000-0000-4000-8000-000000000020',
          '00000000-0000-4000-8000-000000000021', 'stop', 'email');
select ok(
  (public.check_person_eligibility('00000000-0000-4000-8000-000000000020', 'email')) ->> 'eligible' = 'false',
  'suppressed person is not eligible');

-- ---------------------------------------------------------------------------
-- Test: campaign creation and audience building
-- ---------------------------------------------------------------------------
insert into public.campaigns (id, name, channel, content_hash, campaign_type)
  values ('00000000-0000-4000-8000-000000000030',
          'Test Newsletter', 'email', 'abc123hash', 'newsletter');
select is(
  (select status from public.campaigns where id = '00000000-0000-4000-8000-000000000030'),
  'draft', 'new campaign defaults to draft');

-- Build audience
select is(
  (public.build_campaign_audience('00000000-0000-4000-8000-000000000030')) ->> 'eligible',
  '1', 'audience build finds 1 eligible person');

-- Campaign is now immutable
select ok(
  (select immutable from public.campaigns where id = '00000000-0000-4000-8000-000000000030'),
  'campaign is marked immutable after audience build');

-- Audience has one record
select is(
  (select count(*)::integer from public.campaign_audience_records
    where campaign_id = '00000000-0000-4000-8000-000000000030'),
  1,
  'audience has exactly 1 record');

-- ---------------------------------------------------------------------------
-- Test: re-building audience is blocked
-- ---------------------------------------------------------------------------
select ok(
  (public.build_campaign_audience('00000000-0000-4000-8000-000000000030')) ->> 'error' = 'campaign is immutable; audience already built',
  'rebuilding audience on immutable campaign is blocked');

-- ---------------------------------------------------------------------------
-- Test: campaign approval
-- ---------------------------------------------------------------------------
select ok(
  (public.approve_campaign('00000000-0000-4000-8000-000000000030',
    '00000000-0000-4000-8000-000000000001')) ->> 'status' = 'scheduled',
  'campaign approval succeeds');

select ok(
  (select approved_by from public.campaigns
     where id = '00000000-0000-4000-8000-000000000030') = '00000000-0000-4000-8000-000000000001'::uuid,
  'approved_by is recorded');

-- ---------------------------------------------------------------------------
-- Test: approve non-immutable campaign is blocked
-- ---------------------------------------------------------------------------
insert into public.campaigns (id, name, channel, content_hash, campaign_type)
  values ('00000000-0000-4000-8000-000000000040',
          'Unbuilt', 'email', 'def456hash', 'newsletter');
select ok(
  (public.approve_campaign('00000000-0000-4000-8000-000000000040',
    '00000000-0000-4000-8000-000000000001')) ->> 'error' = 'build audience before approving',
  'approving non-immutable campaign is blocked');

-- ---------------------------------------------------------------------------
-- Test: double-approval is blocked
-- ---------------------------------------------------------------------------
select ok(
  (public.approve_campaign('00000000-0000-4000-8000-000000000030',
    '00000000-0000-4000-8000-000000000001')) ->> 'error' = 'campaign already approved',
  'double approval is blocked');

-- ---------------------------------------------------------------------------
-- Test: campaign pause
-- ---------------------------------------------------------------------------
select ok(
  (select public.is_campaign_paused()) = false,
  'campaign is not paused by default');
update public.campaign_pause_controls
   set paused = true, reason = 'emergency', paused_at = now() where id = 1;
select ok(
  (select public.is_campaign_paused()) = true,
  'campaign pause returns true after update');
update public.campaign_pause_controls
   set paused = false, reason = null, paused_at = null where id = 1;

-- ---------------------------------------------------------------------------
-- Test: audit events recorded
-- ---------------------------------------------------------------------------
select isnt_empty(
  'select 1 from public.audit_events where action = ''campaign_audience_built''',
  'audit event recorded for audience build');
select isnt_empty(
  'select 1 from public.audit_events where action = ''campaign_approved''',
  'audit event recorded for campaign approval');

-- ---------------------------------------------------------------------------
-- Test: campaign_type and campaign_channel enums
-- Campaign_type and campaign_channel enums
select set_eq(
  'select unnest(enum_range(null::public.campaign_type))::text order by 1',
  array['newsletter', 'survey_chase'],
  'campaign_type enum has correct values');
select set_eq(
  'select unnest(enum_range(null::public.campaign_channel))::text order by 1',
  array['email', 'sms'],
  'campaign_channel enum has correct values');

select * from finish();
rollback;
