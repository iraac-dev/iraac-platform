# Work order — R5 governed reports (before outreach)

- id: IRAAC-R5
- title: De-identified community reports, private staff/partner reports and
  government drafts with versioned publication controls
- owner: named human (Rhys Coombes)
- implementer: hermes (delegated agents) + codex integrated branch
- independent_reviewer: codex (PR #8 review) / named human merge
- risk: high (publication boundary; Indigenous data governance)
- data_classification: synthetic
- depends_on: R1–R4 (stable governed response base), REL-P1
- goal: build RPT-001 — reproducible de-identified report pipeline with three
  audiences (community_public, staff/partner, government) drawing on one
  locked base dataset snapshot and audience-specific derived views. Enforce
  provenance (report ↔ snapshot ↔ commit/migration hashes), small-cell
  suppression and quotation rules, evidence-strength labels, immutable
  versions, publication lifecycle (DATASET_READY → … → APPROVED_LOCKED →
  PUBLISHED | RETRACTED), admin editing with audit, an exception queue, and
  untrusted feedback ingestion (email replies are feedback, never approval).
  Public pages receive community-safe reports only.
- non_goals: no real report publication, no real outreach, no R6 email
- files: supabase/migrations/20260801001400_r5_reports.sql (NEW),
  apps/admin report pages/queries, report snapshot scripts,
  docs/approvals/… publication policy record, supabase/tests/report.test.sql
- acceptance_tests:
  - pgTAP: snapshot immutability; small-cell suppression on derived views;
    lifecycle transitions; exception queue rows; feedback rows never approve
  - app: staff can draft/edit/approve in the dashboard; audit trail grows;
    community_public artefacts never include raw contact/free text
- human_decisions: named human approves each publication; reports precede
  any R6 email
- rollback: revert commits; append-only migrations never rewritten
- evidence: local gate output + GitHub Actions run recorded
