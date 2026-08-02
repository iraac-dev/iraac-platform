---
id: IRAAC-OPS-001
title: Operations hardening — health checks, no-PII logging, backup/restore, key rotation, offboarding, incident runbooks
owner: Rhys Coombes
implementer: hermes (agent_build_test)
independent_reviewer: rhy-collab
risk: medium
data_classification: operational
depends_on: [ADMIN-001]
---

# OPS-001 — Operations hardening

## Goal

Make the platform operable by humans: a health endpoint, structured
no-PII logging, documented and rehearsable backup/restore, key-rotation and
offboarding procedures, and incident runbooks — so a restore or lost-MFA
drill passes and there are zero high/critical operational findings.

## Non-goals

- No real backups of production data (no real data exists pre-REL-P1).
- No monitoring/alerting vendor integration (that is post-pilot).
- No changes to survey/consent/dashboard behaviour.

## Files

- `apps/admin/src/app/api/health/route.ts` — public liveness/readiness
  (DB ping via service role, no PII in response)
- `apps/admin/src/lib/log.ts` — structured JSON logger that refuses PII fields
- `docs/runbooks/*.md` — backup-restore, key-rotation, offboarding,
  lost-MFA, incident-response
- `scripts/backup-restore-drill.sh` — synthetic backup/restore rehearsal
- `.env.example` — any new env vars

## Acceptance tests

1. `GET /api/health` returns 200 with `{ ok: true, db: "up" }` when the DB is
   reachable and 503 otherwise; response contains no PII.
2. Logging helper emits structured JSON and strips known PII keys
   (email, mobile, name, token, answers) even if passed explicitly.
3. Backup/restore drill script runs against the local stack on synthetic
   data and verifies row counts after restore (documented command).
4. Runbooks exist for: backup/restore, key rotation, access/offboarding,
   lost-MFA recovery, incident response (severity + first actions).
5. Quality gate green: lint, typecheck, vitest, `next build`.

## Human decisions

- Which named humans hold the recovery keys and how they are stored
  (1Password as source of truth — never chat/repo).
- Alerting thresholds and on-call expectation (post-pilot).

## Rollback

Revert the PR; additive routes/docs/scripts only.

## Evidence

- PR link, CI run link, drill transcript, quality-gate output — added
  before completion.
