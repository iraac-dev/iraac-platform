# REL-P1 Evidence Pack

Consolidated evidence for the named human's go/no-go. All links are to the
`iraac-dev/iraac-platform` repo (private).

## Build packages

| Package | Status | PR / commit | App quality gate | DB suite |
|---|---|---|---|---|
| PLAT-001/002 | ✅ merged | `main` (CI run 30686774921) | lint/typecheck/build | — |
| DATA-001 | ✅ merged | 6 migrations on production (19 tables) | — | — |
| SEC-001 | ✅ merged | 28 RLS policies live | — | 18/18 RLS pgTAP |
| SURV-001 | ✅ merged | PR #1 | 27/27 contract tests | — |
| SURV-002 | ✅ merged | PR #3 (`144e450`) | 41/41 | 18/18 |
| CONS-001 | ✅ built, PR #4 draft | `work/cons-001-consent` | 51/51 | 32/32 (18 RLS + 14 consent) |
| ADMIN-001 | ✅ built, PR #5 draft | `work/admin-001-dashboard` | 48/48 | 24/24 (+6 admin) |
| OPS-001 | ✅ built, PR #6 draft | `work/ops-001-operations` | 46/46 | 18/18 |

## Runtime checks (local stack)

- `/api/health` → `{"ok":true,"db":"up"}` (200)
- Service-role REST after grants fix → 200
- Backup/restore drill → PASS (`scripts/backup-restore-drill.sh`)
- Load rehearsal DB idempotency check → duplicate token yields exactly 1 row
  (`scripts/load-rehearsal.sh`)

## CI

- `.github/workflows/ci.yml`: `quality` (lint, typecheck, vitest, build) +
  `secrets` (secret scan). Green on every feature branch head.

## Human approvals already recorded

- SURV-001 V1 release hash: Rhys Coombes, 2026-08-01
  (`docs/approvals/2026-08-01-surv-001-v1-release-approval.md`)

## Still human-gated (see READINESS_CHECKLIST.md)

- Merge PRs #4/#5/#6 · WCAG 2.2 AA review · PIA · I04 wording · two named
  owners per platform · recovery keys in 1Password · full 10k load run ·
  go/no-go.

---

*Generated 2026-08-01 by hermes (agent_build_test).*
