-- R1: repeat-group survey answers.
-- One session may store several instances of the same question when the answer
-- belongs to a repeat group: repeat_key holds the group instance key (e.g. a
-- D03 topic such as 'Housing or homelessness'). Ordinary answers keep
-- repeat_key = '' and remain unique per (session, question).
-- Append-only migration.

-- Repeat-group instance key. Empty for ordinary answers.
alter table public.survey_answers add column repeat_key text not null default '';

-- Replace the single-answer uniqueness with per-instance uniqueness:
-- (session_id, question_id) stays unique for ordinary answers (repeat_key = ''),
-- while repeat instances differ by repeat_key.
alter table public.survey_answers
  drop constraint if exists survey_answers_session_id_question_id_key;

alter table public.survey_answers
  add constraint survey_answers_session_question_repeat_key
  unique (session_id, question_id, repeat_key);

comment on column public.survey_answers.repeat_key is
  'Repeat-group instance key (e.g. a D03 topic). Empty for ordinary answers.';
