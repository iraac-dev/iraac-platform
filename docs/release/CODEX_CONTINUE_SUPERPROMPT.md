# IRAAC PLATFORM — CORRECTED CONTINUATION SUPERPROMPT

Paste this into Codex, Hermes or another engineering agent. It supersedes the
Hermes “P1 Build Complete” handoff dated 1 August 2026.

## Mission and repositories

IRAAC is an Aboriginal Community Organisation. Its loop is: **You share → We
listen → We recommend to government → We report back.** This private repository
is `iraac-dev/iraac-platform`. Do not mix it with the public static website.

Read, in order: `AGENTS.md`, `ROADMAP.md`, `PRODUCTION_LAUNCH_PLAN.md`,
`BOT_TASKS.md`, `docs/release/REL-P1_READINESS_CHECKLIST.md`, then this file.
The roadmap in this repository is authoritative.

## Current truth

Hermes produced four draft PRs: #4 consent, #5 admin, #6 operations and #7
release rehearsal. They were independently reviewed and integrated by Codex on
`codex/p1-integrated-review` in draft PR #8. The locally verified implementation
checkpoint is `25d715944b866f9e700bbc12c1f20083a2b68fbe`; the later handoff commit
changes documentation only. Do not merge #4–#7 independently. Their work is
valuable, but their completion claims were false when evaluated as one system.
The integrated correction PR supersedes them.

PR: `https://github.com/iraac-dev/iraac-platform/pull/8`

Local evidence on the verification checkpoint: lint and typecheck passed; 70
application/contract tests passed; the production build passed; full npm audit
reported zero vulnerabilities; a fresh Supabase reset and schema lint passed;
42 pgTAP tests passed; shell syntax and diff checks passed. GitHub Actions run
`30712705328` passed all quality, secrets and database jobs on the corrected
code and CI configuration. The later evidence-stamp commit changes docs only.

Confirmed original defects included: collection against a draft survey;
completion-mode spoofing; blanket current/future standard-role CRUD; STOP that
could be undone by a later grant; recording consent inferred from a preference;
non-transactional consent writes; role-only admin access without AAL2/active
membership; a case-sensitive unused logger; a one-table destructive restore
drill; and a load test that used invalid UUIDs then fell back to a one-row check.

## Corrections already implemented on the integrated branch

- Survey submission requires the exact approved V1 hash and `active` release.
- The public API only records web completion; A01/A02 terminal and A02 required
  rules are enforced.
- I05 is not recording consent. Email/mobile endpoints are required for matching
  permissions.
- Suppression is deny-wins; standard `anon`/`authenticated` table CRUD and
  unsafe default privileges are revoked by an append-only migration.
- Admin sign-in enrolls/challenges TOTP; the guard requires AAL2, an active
  staff/auditor flag and a named custodian for every account.
- Structured logs accept only enumerated events and fields. Routes log static
  events rather than raw errors or request payloads.
- Load rehearsal is HTTP-only, uses valid UUIDs, verifies each initial and
  duplicate response, reconciles exact persisted sessions/tokens/answers, and
  fails unless the requested count passes. Its bypass is secret and disabled
  in production; caller-supplied first-hop IPs are not trusted.
- Restore rehearsal compares physical database identity, enforces a disposable
  target name, restores a full dump, fingerprints schema/data and runs pgTAP.
- `ROADMAP.md` and `PRODUCTION_LAUNCH_PLAN.md` are restored to this private repo
  and corrected. Reports now precede scaled outreach in the delivery sequence.

## Standing authority and non-negotiable boundaries

Rhys has authorized routine internal implementation, test, branch, integration,
draft-report and policy-conforming automation work without repeated prompts.
Encode ordinary decisions in versioned policy and send only exceptions to the
admin queue. Do not build a ceremonial approval click for every normal action.

This authorization does **not** manufacture recipient consent, waive an opt-out
or Do Not Call request, authorize recording, bypass applicable Australian law,
remove Aboriginal and Torres Strait Islander data governance, expose private
staff/community data, or allow unreviewed sensitive reports to publish. Never
perform real outreach, import real contacts, activate collection or deploy a
production campaign from this prompt. Use synthetic data only.

## Required next work, in order

1. **Finish R1 survey conformance.** Implement `repeatFor` in schema, renderer
   and persistence; align required rules; add Playwright journeys for mobile,
   keyboard, screen-reader semantics, A01/A02 stops, duplicate submission and
   active/draft release behaviour. Record an ADR for the custom renderer.
2. **Finish R2 consent correctness.** Replace multi-call service-role writes
   with one transactional database RPC. Add a unique session receipt, one
   receipt item per granted channel/wording version, immutable audit events and
   concurrency/failure tests. Never allow ordinary grant to override
   suppression; repermission needs a separate explicit audited flow.
3. **Finish R3 control plane.** Add private membership rows tying a named user
   to an organisation/role, server-side authorization for each query, MFA
   recovery, invitations, inactive/offboarding tests and
   audited admin actions. Service-role access must not turn role claims into
   unlimited data access.
4. **Finish R4 operations.** Add a real collection pause independent of survey
   authoring status; finish CI browser tests;
   execute the corrected full restore; then execute the corrected 10,000 HTTP
   rehearsal against a disposable integrated environment. Preserve sanitized
   evidence with the exact commit SHA.
5. **Build R5 reports before outreach.** Create versioned de-identified
   community reports, private staff/partner reports and government drafts.
   Enforce provenance, minimum-cell/privacy rules, Aboriginal data governance,
   admin editing, audit, publication state and an exception queue. Replies are
   feedback, not authenticated approval. Public pages receive community-safe
   reports only.
6. Continue to R6 email, R7 SMS/human phone and R8 AI voice only after their
   preceding gates. Newsletter unsubscribe and channel/global suppression are
   immediate. SMS/calls require their own eligibility. AI calls disclose AI,
   provide human handoff, respect DNC/STOP immediately and ask separate
   recording permission if recording is used.

## Verification commands

Run from the integrated worktree/repository root:

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
npm audit --audit-level=high
bash -n scripts/*.sh
supabase db reset
supabase db lint --level error
supabase test db
git diff --check
```

For the restore drill, supply distinct disposable database URLs and
`IRAAC_CONFIRM_DISPOSABLE_RESTORE=YES`. Never point the restore target at the
source. For load, activate the approved release only in the disposable test
environment, start the app, and run `./scripts/load-rehearsal.sh 10000`.

## Completion discipline

Update `BOT_TASKS.md` before claiming work. Use append-only migrations, one
scoped branch/work order, synthetic data, no secrets and no force-push. Do not
say PASS unless the exact integrated command ran successfully. Mark unexecuted
evidence OPEN. Produce a reviewable PR with changed files, tests, unresolved
risks and rollback. Continue independently within the standing authority; stop
only for a missing credential/external state or an action that would contact
people, publish sensitive material, activate production or cross the explicit
boundaries above.
