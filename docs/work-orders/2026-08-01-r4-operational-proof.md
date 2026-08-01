# Work order — R4 operational proof: collection pause, browser CI, restore and load drills

- id: IRAAC-R4
- title: Real collection pause, CI browser tests, executed full restore and
  10,000-response HTTP rehearsal with reconciliation
- owner: named human (Rhys Coombes)
- implementer: hermes (delegated agents) + codex integrated branch
- independent_reviewer: codex (PR #8 review) / named human merge
- risk: medium (operational drills touch disposable environments only)
- data_classification: synthetic
- depends_on: R1 (repeat groups + browser tests), R2, R3
- goal:
  1. Add a collection pause independent of survey authoring status — a
     runtime `collection_paused` switch that the survey submit interlock
     checks alongside release status, so staff can stop intake without
     editing (or retiring) the survey release. Server-managed, audited.
  2. CI browser job (Playwright) green on the integrated PR.
  3. Execute the corrected full restore drill against a SEPARATELY IDENTIFIED
     disposable database (`IRAAC_CONFIRM_DISPOSABLE_RESTORE=YES`, distinct
     target name, physical database identity + schema/data fingerprints +
     pgTAP after restore, never the source).
  4. Execute the corrected 10,000-response HTTP rehearsal against a
     disposable integrated environment: activate the approved release in the
     disposable DB, run `./scripts/load-rehearsal.sh 10000`, reconcile exact
     persisted sessions, unique tokens, answers and completion states, and
     fail unless the requested count passes. Record sanitized evidence with
     the exact commit SHA.
- non_goals: no real collection, no production restore, no real load
- files: supabase/migrations/20260801001300_r4_collection_pause.sql (NEW),
  app interlock (survey-submit.ts / route), scripts/backup-restore-drill.sh
  and scripts/load-rehearsal.sh (only if the drills reveal defects),
  docs/runbooks/*, evidence docs in docs/release/
- acceptance_tests:
  - pgTAP: collection_paused=true blocks submission even when the release is
    active; false allows it; the switch is audited
  - CI: browser job passes on the PR
  - restore drill: exit 0 with fingerprints matching and pgTAP passing in the
    disposable target; source untouched
  - load drill: exit 0 only when 10,000 responses reconcile exactly
- human_decisions: none for engineering; drills stay synthetic
- rollback: revert commits; append-only migrations never rewritten
- evidence: exact script output, commit SHA, GitHub Actions run recorded
