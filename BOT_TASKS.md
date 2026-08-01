# BOT_TASKS.md

One row per work item. One task, one branch, one file set per bot.
No shared-file edits without an explicit handoff. Synthetic data only.

| Task ID | Description | Owner | Depends on | Branch | Files | Status | Acceptance | Reviewer |
|---|---|---|---|---|---|---|---|---|
| PLAT-001 | Repo foundation: AGENTS.md, templates, CODEOWNERS, CI | hermes | GitHub account | main | repo root | **done** — CI green (run 30686774921) | PR checks run on minimal app; prod env requires approval | rhy-collab |
| PLAT-002 | Scaffold Next.js/TS app, packages, local Supabase; pin toolchain + lockfile | hermes | PLAT-001 | feat/plat-002 | apps/admin, .nvmrc, DEVELOPING.md, .env.example | in progress | New machine runs lint/typecheck/test/build + local DB from documented commands | rhy-collab |
| DATA-001 | Append-only migrations: identity/contact, consent, suppression, survey, audit, campaigns | hermes | PLAT-002 | feat/data-001 | supabase/migrations | in progress | Migration up/down/restore rehearsal passes on synthetic data | rhy-collab |
| SEC-001 | Named invitations, roles, server session checks, AAL2, deny-by-default RLS | hermes | DATA-001 | feat/sec-001 | supabase/migrations/20260801000500_rls.sql, tests | in progress | Anonymous/wrong-role/AAL1 tests denied; every approved action has explicit test | rhy-collab |
