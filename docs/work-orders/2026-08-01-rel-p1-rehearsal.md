---
id: IRAAC-REL-P1
title: Release rehearsal — synthetic load, evidence pack, readiness checklist
owner: Rhys Coombes
implementer: hermes (agent_build_test)
independent_reviewer: rhy-collab
risk: medium
data_classification: synthetic
depends_on: [OPS-001, ADMIN-001, CONS-001, SURV-002]
---

# REL-P1 — Release rehearsal (machine-prep half)

## Goal

Produce everything the named human needs to make the go/no-go decision:
a synthetic load rehearsal of the anonymous survey submission path, a
consolidated evidence pack (all quality gates, DB suites, CI runs), and a
readiness checklist. The **decision itself** is a human action; this package
only prepares the evidence.

## Non-goals

- No real responses, no real outreach, no production writes.
- No WCAG audit or PIA (those are human/external reviews — listed as
  dependencies in the checklist).
- No go/no-go decision (human).
- No merge of the draft feature PRs (Rhys's call).

## Files

- `scripts/load-rehearsal.sh` — synthetic 10k-submission load against the
  local stack's submit endpoint (or direct service-role insert for volume),
  with idempotency/duplicate checks
- `docs/release/REL-P1_READINESS_CHECKLIST.md` — everything verified, with
  links, plus the human-gated items
- `docs/release/REL-P1_EVIDENCE_PACK.md` — consolidated evidence with links

## Acceptance tests

1. `scripts/load-rehearsal.sh` runs against the local stack on synthetic
   data, submits N anonymous completions, reports pass/fail counts, and
   verifies zero duplicate client tokens created two completions.
2. Evidence pack lists every package (PLAT/DATA/SEC/SURV/CONS/ADMIN/OPS)
   with its quality gate + DB suite + CI result and a link.
3. Readiness checklist separates machine-verified items from
   human-gated items (WCAG, PIA, named owners, go/no-go).
4. Quality gate green: lint, typecheck, vitest, `next build` (unchanged
   code; docs + script only).

## Human decisions

- The go/no-go itself (named human).
- WCAG 2.2 AA review and PIA sign-off (external/human).
- Two named owners per production platform (from §3 of the plan).
- Whether to push the draft migrations to production before REL-P1.

## Rollback

Revert the PR; docs + script only, no app code changes.

## Evidence

- PR link, load-rehearsal transcript, evidence-pack links — added before
  completion.
