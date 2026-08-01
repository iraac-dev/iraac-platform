# Work order — R2 consent correctness: transactional consent capture

- id: IRAAC-R2
- title: One transactional, idempotent consent capture across identity, contact
  points, consent events, receipt items, wording versions and audit records
- owner: named human (Rhys Coombes)
- implementer: hermes (delegated agents) + codex integrated branch
- independent_reviewer: codex (PR #8 review) / named human merge
- risk: high (consent is the load-bearing wall)
- data_classification: synthetic
- depends_on: R1 (repeat groups), CONS-001, P1-CORR-001
- goal: replace the multi-call service-role consent writes in
  `apps/admin/src/lib/consent-submit.ts` (person, contact_points,
  consent_events × N, consent_receipts as separate client calls) with ONE
  transactional Postgres RPC (`public.submit_consent(...)`) that writes
  identity, contact points, one consent event per granted channel pinned to
  the exact wording version, one receipt item per granted channel, and audit
  records — all in a single transaction, idempotent per survey session.
- non_goals: no new channels, no recording consent, no real collection,
  no membership changes (R3)
- files: apps/admin/src/lib/consent-submit.ts, apps/admin/src/app/api/consent/*
  (only if the RPC changes the route contract), supabase/migrations/
  20260801001100_r2_transactional_consent.sql (NEW), supabase/tests/
  consent-transaction.test.sql (NEW), consent-submit tests
- acceptance_tests:
  - pgTAP: a single `submit_consent` call creates the person, contact points,
    one consent event per ticked permission with its exact wording version,
    one receipt item per granted channel, and audit rows — verified in one
    transaction; a forced failure (invalid channel/wording) rolls back ALL
    writes (zero rows anywhere)
  - idempotency: a second call for the same survey session returns the
    existing receipt/state and creates no duplicate rows
  - deny-wins: an ordinary later grant never clears a channel/global STOP or
    withdrawal (existing trigger behaviour preserved and tested with the RPC)
  - app: submitConsent calls the RPC once; unit tests use a fake client
    capturing a single `rpc` invocation
- human_decisions: none for engineering; I04/AI wording still gated
- rollback: revert R2 commits; append-only migration never rewritten
- evidence: local gate output + GitHub Actions run recorded on PR #8
