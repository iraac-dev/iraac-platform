-- DATA-001: survey — canonical definitions, versions, sessions, answers.
-- Answers reference exact survey/question versions. Append-only migration.

-- Canonical survey definition (one active release; changes create a successor).
create table public.survey_definitions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  created_at timestamptz not null default now()
);

-- Immutable survey releases. An active release never mutates.
create table public.survey_versions (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.survey_definitions(id) on delete cascade,
  version integer not null,
  definition jsonb not null,          -- canonical Zod-validated contract
  content_hash text not null,         -- semantic hash of the immutable definition
  status text not null default 'draft' check (status in ('draft', 'active', 'superseded')),
  released_at timestamptz,
  created_at timestamptz not null default now(),
  unique (survey_id, version)
);

create index on public.survey_versions (survey_id, status);

-- Individual questions with stable IDs across releases.
create table public.survey_questions (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.survey_definitions(id) on delete cascade,
  question_key text not null,
  question_text text not null,
  question_type text not null check (question_type in ('text', 'single_choice', 'multi_choice', 'scale', 'date', 'prefer_not_to_say')),
  options jsonb,
  required boolean not null default false,
  created_at timestamptz not null default now(),
  unique (survey_id, question_key)
);

-- A survey session pins its release. Partial sessions create no consent.
create table public.survey_sessions (
  id uuid primary key default gen_random_uuid(),
  survey_version_id uuid not null references public.survey_versions(id),
  completion_mode text not null check (completion_mode in ('web', 'staff', 'phone', 'ai_voice', 'drop_in', 'home_visit')),
  anonymous boolean not null default true,
  person_id uuid references public.people(id) on delete set null,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'abandoned', 'withdrawn')),
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

-- Structured answers. Never raw free text treated as data authority.
create table public.survey_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.survey_sessions(id) on delete cascade,
  question_id uuid not null references public.survey_questions(id),
  answer_value jsonb not null,
  confidence numeric check (confidence >= 0 and confidence <= 1),
  recorded_at timestamptz not null default now(),
  unique (session_id, question_id)
);
