# CODEX CONTINUATION SUPERPROMPT — IRAAC Platform (P1 Build Complete)

*Generated 2026-08-01 by Hermes (hermes agent, `agent_build_test` lane) for Codex. Everything below is verified, pushed, and parked on draft PRs. Read this top to bottom before touching anything.*

---

## 1. What this project is

**IRAAC** is an Aboriginal Community Organisation in NSW (Australia) operating under the Local Decision Making framework. **It is NOT "Iraq"** — voice-to-text sometimes slips; interpret as IRAAC. The product loop: **You share → We listen → We recommend to government → We report back.** Every feature must strengthen one of those four steps or it doesn't belong.

This repo is the **private listening platform** (`iraac-dev/iraac-platform`, monorepo). The public marketing site is a *separate* repo (`iraac-dev/iraac-website`, live on Vercel) — do not mix them.

## 2. Hard rules (from AGENTS.md — obey always)

- **No real outreach.** No production email/SMS/call ever from a dev environment.
- **Synthetic data only** until a release gate is approved. No real community data, credentials, or recovery material in prompts, commits, logs, screenshots.
- **No secrets** in code, prompts, or commits. Env-scoped only. Never paste API keys into chat or files.
- **No force-push, no direct `main` work.** One work order per branch; open a draft PR early; claim in `BOT_TASKS.md` first.
- **No self-approval.** Agents propose; the named human (Rhys Coombes) approves merges, campaigns, consent wording, and reports.
- **Migrations are append-only** and never rewritten after merge.
- **Stop lines:** never infer consent, never treat survey completion as consent, never treat a public listing as blanket permission.
- **Reading order:** `AGENTS.md` → `PRODUCTION_LAUNCH_PLAN.md` (in the website repo) → `ROADMAP.md` → `docs/adr/` → current branch/PR/CI state.

## 3. Current repo state (verified 2026-08-01)

- Local checkout: `~/Downloads/Projects/IRAAC/iraac-platform/`
- Remote: `https://github.com/iraac-dev/iraac-platform.git` (private, `iraac-dev` org — Rhys is org admin)
- Working tree: **clean**. All branches pushed and in sync with origin.
- `main` is up to date with origin/main.

### Open PRs (all draft, all CI green, all awaiting human review)

| PR | Branch | What it delivers | Evidence |
|---|---|---|---|
| **#4** | `work/cons-001-consent` | CONS-001 consent system: DB layer (consent_state fix + maintenance trigger, immediate suppression, hashed receipt tokens, wording seeds, server-only RLS), app layer (consent-submit lib, `/api/consent/submit` + `/withdraw`, survey consent step all-unticked, `/survey/withdraw`, styling) | 32/32 pgTAP; 51/51 app tests; CI green |
| **#5** | `work/admin-001-dashboard` | ADMIN-001 staff dashboard: `@supabase/ssr` auth + role guard (`app_metadata.iraac_role` staff/auditor), dashboard views (overview, masked submissions, consent timeline, audit log, staff access), sign-in/out, 6 admin pgTAP tests | 24/24 pgTAP; 48/48 app tests; CI green |
| **#6** | `work/ops-001-operations` | OPS-001 operations: `/api/health`, no-PII structured logger (5 tests), backup/restore drill (PASS), schema-grants migration (fixes fresh-reset REST outage), 4 runbooks | 18/18 pgTAP; 46/46 app tests; CI green |
| **#7** | `work/rel-p1-rehearsal` | REL-P1 release rehearsal (machine half): `scripts/load-rehearsal.sh`, `docs/release/REL-P1_READINESS_CHECKLIST.md`, `docs/release/REL-P1_EVIDENCE_PACK.md` | 41/41 app tests; CI green |

### Merged to main (done)

- PR #1 — SURV-001: frozen V1 survey contract package (`packages/survey-contract`, hash `9f98a7b9...d5152f`, human-approved)
- PR #3 — SURV-002: anonymous mobile survey (server-only idempotent submission, rate limiting, mobile UI, V1 release migration as `draft`)

### BOT_TASKS.md rows

PLAT-001/002, DATA-001, SEC-001, SURV-001, SURV-002: **done/merged**. CONS-001, ADMIN-001, OPS-001, REL-P1: **done — PR #X (draft)**. Nothing marked in-progress.

## 4. What was built (the full P1 sequence)

1. **PLAT-001/002** — repo foundation, Next.js 16 + TS monorepo, CI (lint/typecheck/vitest/build + secret scan), local Supabase.
2. **DATA-001** — 6 append-only migrations: identity/contact, consent/suppression, survey, audit/campaigns. Applied to production `iraac-supabase` (19 tables).
3. **SEC-001** — RLS roles (`iraac_anon/authenticated/staff/auditor`), deny-by-default policies (28 live in prod), pgTAP.
4. **SURV-001** — canonical V1 contract: sections A–I, stable IDs, Zod validators, deterministic branching, semantic hash, fixtures. Human-approved.
5. **SURV-002** — anonymous mobile survey: one-question-at-a-time branching UI, server-only submission (adult gate, branch stripping, idempotent duplicate via `client_token` uuid), per-IP rate limiting, no trackers, noscript fallback, crisis links (13YARN). V1 release in DB as `draft`.
6. **CONS-001** — optional contact + permissions: fixed latent `consent_state` PK bug (person-only rows were impossible), added the missing maintenance trigger (grants/revocations flow to state automatically, suppression applies immediately channel-or-global), `consent_receipts` with hashed no-login tokens, I01–I05 wording seeds, server-only writes (anon can NEVER fabricate a grant — no insert grants anywhere in consent path), survey consent step + withdrawal page.
7. **ADMIN-001** — invite-only dashboard: Supabase Auth + `app_metadata.iraac_role` claim guard (staff/auditor; anonymous redirected), masked submissions (PII-free by construction), consent/suppression timeline, read-only audit log, staff access review (no generic-mailbox admin role — enforced + tested).
8. **OPS-001** — `/api/health` (200 verified live), structured JSON logger with hard no-PII stripping, backup/restore drill (executed, PASS), schema-grants migration (fixes: fresh `supabase db reset` left REST layer unable to reach public schema — every API route would fail with `permission denied for schema public`; production only worked due to project bootstrap), 4 runbooks (backup-restore, key-rotation, access-offboarding incl. lost-MFA, incident-response).
9. **REL-P1 (machine half)** — synthetic load rehearsal script (duplicate-token guarantee verified), readiness checklist (10 machine-verified + 9 human-gated items), evidence pack consolidating all gates.

### Key technical decisions / pitfalls learned (do not relearn these)

- **Contract ↔ DB sync:** the V1 release migration is GENERATED from the contract package (`packages/survey-contract/scripts/generate-v1-release-migration.ts`). Never hand-edit that migration or patch its output — edit the generator and rerun.
- **TS-source workspace packages:** use `.ts` extension imports + `allowImportingTsExtensions: true` in BOTH package and consumer tsconfig; `transpilePackages` in next.config. `.js`-suffixed imports break Turbopack.
- **RLS: policies are dead code without GRANTs** — grants + policies must ship in the same migration. Anon gets SELECT grant but NO select policy (RLS returns zero rows); NO insert/update/delete anywhere in consent path.
- **`INSERT ... RETURNING` fails RLS for anon** — app writes via service role (server-only pattern).
- **Postgres partial unique index** (e.g. `on survey_sessions(client_token) where client_token is not null`) cannot be used as a bare `ON CONFLICT (client_token)` target — use target-less `ON CONFLICT DO NOTHING`.
- **`consent_state` was restructured** in migration `20260801000700` — `subject_key` + unique `(subject_key, channel)`, with explicit `drop not null` on person/org id columns (Postgres keeps PK-implicit NOT NULL after PK drop).
- **8GB Mac local stack:** `supabase/config.toml` has `health_timeout = "10m"`; use `supabase start --ignore-health-check` on this machine; tests run via `supabase test db` (or `docker exec` directly when the mapped port is flaky).
- **Secret redactor:** Hermes mangles secrets in shell command substitution — the repo has `supabase-cli.sh` wrapper reading token files with `read -r VAR < file`. Use it.
- **`gh pr merge` on a draft fails** — `gh pr ready N` first. Long `--body` heredocs break — use `--body-file`.

## 5. What is LEFT (human-gated — this is where Codex should help, not decide)

The machine-buildable P1 work is **complete**. Remaining steps require the named human:

1. **Merge PRs #4 → #5 → #6 → #7** (each CI-green, additive; any order; human approval per AGENTS.md).
2. **Run the full load rehearsal:** with the dev server up (`npm run dev` in `apps/admin` against local stack), `./scripts/load-rehearsal.sh 10000`.
3. **Commission external reviews:** WCAG 2.2 AA accessibility review of survey journeys; Privacy Impact Assessment (PIA) — Indigenous Data Sovereignty + APP compliance.
4. **Final I04 (AI call) consent wording** sign-off (Rhys + legal; flagged in the frozen contract).
5. **Nominate two named human owners per production platform** (GitHub, Supabase, Vercel, 1Password) per PRODUCTION_LAUNCH_PLAN §3.
6. **Move recovery keys to 1Password** (never chat/repo).
7. **Optional:** push the draft migrations (V1 release + consent + grants) to production Supabase — safe because release status is `draft` (nothing collectable); keeps prod schema in sync for the rehearsal.
8. **Sign go/no-go** on the evidence in `docs/release/REL-P1_EVIDENCE_PACK.md`, then flip the release `draft → active` in the DB.

**Your job as Codex:** do NOT make those decisions. Help by (a) reviewing the four draft PRs and confirming each diff matches its work order, (b) running the load rehearsal when asked, (c) preparing anything the human asks for (e.g. an accessibility self-assessment to hand the reviewer, a PIA draft), and (d) making the merge/gate process painless. If the human says "merge them", run `gh pr ready N && gh pr merge N --merge --delete-branch` per PR in order, then sync main.

## 6. Verification commands (all proven on this machine)

```bash
cd ~/Downloads/Projects/IRAAC/iraac-platform
npm run lint && npm run typecheck && npm run test && npm run build   # full quality gate
./supabase-cli.sh test db                                             # 18 RLS + 14 consent + 6 admin pgTAP
./scripts/backup-restore-drill.sh                                     # backup/restore drill (PASS expected)
./scripts/load-rehearsal.sh 1000                                      # synthetic load (dev server up for HTTP mode)
curl -s http://127.0.0.1:3000/api/health                              # expect {"ok":true,"db":"up"}
```

## 7. Where the evidence lives

- `docs/release/REL-P1_READINESS_CHECKLIST.md` — the launch checklist
- `docs/release/REL-P1_EVIDENCE_PACK.md` — consolidated evidence + links
- `docs/work-orders/` — one work order per package (claim → acceptance → evidence)
- `docs/runbooks/` — OPS-001 runbooks
- `BOT_TASKS.md` — task board (status per row)

## 8. Contact

Human: **Rhys Coombes** (repo owner, org admin). Agent lanes on this repo:
`hermes` (Hermes, `agent_build_test` — the author of all P1 build work) and
any Codex lane. Coordinate via BOT_TASKS.md; never claim a task another lane
owns; one task, one branch, one file set.

---

*End of superprompt. Everything above is factual as of 2026-08-01 and was
verified by actually running the gates — nothing fabricated.*
