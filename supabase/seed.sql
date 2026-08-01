-- Seed: SYNTHETIC DATA ONLY. No real community data ever enters this repo.
-- Used for local development and CI database tests.

-- NOTE: the real Have Your Say V1 release (definition, version, questions)
-- is inserted by migration 20260801000600_survey_v1_release.sql from the
-- approved contract. The seed intentionally does NOT add survey rows, so the
-- migration's canonical release is the only one present locally.

insert into public.consent_wording_versions (id, version, wording, channel) values
  ('00000000-0000-0000-0000-000000000004', 1, 'Synthetic: IRAAC may email me a monthly newsletter.', 'newsletter');

insert into public.data_sources (id, name, kind, licence_notes) values
  ('00000000-0000-0000-0000-000000000005', 'Synthetic test directory', 'directory', 'Synthetic records only; no real licences implied.');

-- Synthetic person + consent event.
insert into public.people (id, full_name, mobile_number, email, postcode, office_region) values
  ('00000000-0000-0000-0000-000000000006', 'Test Person Synthetic', '0400000000', 'test.synthetic@example.com', '2500', 'Nowra');

insert into public.consent_events (id, person_id, contact_point_id, channel, consent_wording_version_id, granted, source) values
  ('00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000006', null, 'newsletter', '00000000-0000-0000-0000-000000000004', true, 'web');
