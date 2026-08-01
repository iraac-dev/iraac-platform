# SURV-001 — Have Your Say V1 release approval record

**Date:** 1 August 2026
**Approver:** Rhys Coombes (rhy-collab) — named human, IRAAC platform owner
**Implementer:** hermes (agent_build_test)
**Work order:** SURV-001

## Approved artefact

- **Canonical survey:** `@iraac/survey-contract` — Have Your Say V1
- **Release hash (SHA-256 of canonical definition):**
  `9f98a7b96d15a2837f8aa033cf843b1b635846d53fda90dd53492e7dd6d5152f`
- **Baseline document:** `docs/survey/IRAAC_HAVE_YOUR_SAY_V1_DRAFT.md`
- **Sections frozen:** A (eligibility/comfort), B (about you), C (IRAAC
  awareness), D (priorities/experience), E (priority detail), F (safety
  branch), G (voice/aspirations), H (support/follow-up), I (contact
  permissions I01–I05). 40 questions + 5 permissions.

## What this approval means

1. The exact instrument identified by the release hash above is accepted as
   the frozen V1 contract. All adapters (web, staff, human phone, AI voice)
   build against this contract and this hash only.
2. An active release is immutable. Any change requires a reviewed successor
   version with a new hash; the frozen version is never edited in place.
3. This is a **build gate**, not a **launch gate**. It authorises engineering
   (SURV-002 onwards) to proceed. The survey must NOT begin collecting real
   responses until the full V1 release gate passes (community/cultural
   review, privacy/legal review, safeguarding review, methodology review,
   accessibility testing, REL-P1 rehearsal, and a separate named go/no-go
   record per `PRODUCTION_LAUNCH_PLAN.md` §7).

## Evidence

- PR: https://github.com/iraac-dev/iraac-platform/pull/1
- CI: quality + secrets green (run 30690999413)
- Local: 27/27 contract tests, lint, typecheck, build all green

## Rollback

The contract package is additive. Revert the PR to return to the pre-SURV-001
state; no migrations or existing app paths are touched.
