# BOT_TASKS.md

One row per work item. One task, one branch, one file set per bot.
No shared-file edits without an explicit handoff. Synthetic data only.

| Task ID | Description | Owner | Depends on | Branch | Files | Status | Acceptance | Reviewer |
|---|---|---|---|---|---|---|---|---|
| PLAT-001 | Repo foundation: AGENTS.md, templates, CODEOWNERS, CI | hermes | GitHub account | main | repo root | **done** — CI green (run 30686774921) | PR checks run on minimal app; prod env requires approval | rhy-collab |
| PLAT-002 | Scaffold Next.js/TS app, packages, local Supabase; pin toolchain + lockfile | hermes | PLAT-001 | main | apps/admin, .nvmrc, DEVELOPING.md, .env.example | **done** — lint/typecheck/test/build + local Supabase all pass | New machine runs lint/typecheck/test/build + local DB from documented commands | rhy-collab |
| DATA-001 | Append-only migrations: identity/contact, consent, suppression, survey, audit, campaigns | hermes | PLAT-002 | main | supabase/migrations | **done** — 6 migrations applied + verified on production (iraac-supabase, 19 tables) | Migration up/down/restore rehearsal passes on synthetic data | rhy-collab |
| SEC-001 | Implement Supabase named invitations, roles, server session checks, mandatory AAL2 and deny-by-default RLS | hermes | DATA-001 | main | supabase/migrations/20260801000500_rls.sql, tests | **done** — 19 RLS tables + 28 policies live in production; pgTAP tests pass locally | Anonymous/wrong-role/AAL1 tests denied; every approved action has explicit test | rhy-collab |
| SURV-001 | Freeze Have Your Say V1 contract: canonical definition (A–I), stable IDs, Zod validators, branching rules, synthetic fixtures, semantic content hash, immutability guard | hermes (agent_build_test) | PLAT-002, human survey approval (draft baseline) | main | packages/survey-contract, docs/approvals/2026-08-01-surv-001-v1-release-approval.md | **done** — merged PR #1; named human (Rhys Coombes) approved release hash 9f98a7b9...d5152f on 2026-08-01; CI green; 27/27 tests | Web/staff/phone adapters consume one contract; active release immutable (hash changes on any mutation); tests green (27/27) | rhy-collab |
