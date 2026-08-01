-- Seed: SYNTHETIC DATA ONLY. No real community data ever enters this repo.
-- Used for local development and CI database tests.

insert into public.survey_definitions (id, slug, title) values
  ('00000000-0000-0000-0000-000000000001', 'have-your-say', 'Have Your Say — V1');

insert into public.survey_versions (id, survey_id, version, definition, content_hash, status, released_at) values
  ('00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000001',
   1,
   '{"title": "Have Your Say", "questions": [{"key": "concern", "text": "What is the most important issue right now?", "type": "single_choice"}]}',
   'synthetic-hash-v1',
   'active',
   now());

insert into public.survey_questions (id, survey_id, question_key, question_text, question_type, required) values
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'concern', 'What is the most important issue right now?', 'single_choice', true);

insert into public.consent_wording_versions (id, version, wording, channel) values
  ('00000000-0000-0000-0000-000000000004', 1, 'Synthetic: IRAAC may email me a monthly newsletter.', 'newsletter');

insert into public.data_sources (id, name, kind, licence_notes) values
  ('00000000-0000-0000-0000-000000000005', 'Synthetic test directory', 'directory', 'Synthetic records only; no real licences implied.');

-- Synthetic person + consent event.
insert into public.people (id, full_name, mobile_number, email, postcode, office_region) values
  ('00000000-0000-0000-0000-000000000006', 'Test Person Synthetic', '0400000000', 'test.synthetic@example.com', '2500', 'Nowra');

insert into public.consent_events (id, person_id, contact_point_id, channel, consent_wording_version_id, granted, source) values
  ('00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000006', null, 'newsletter', '00000000-0000-0000-0000-000000000004', true, 'web');
