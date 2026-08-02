# Work order — R1 survey conformance: repeat groups, required rules, browser journeys

- id: IRAAC-R1 (replaces the previously claimed SURV-002 conformance gap)
- title: Repeat-group survey conformance (contract + renderer + persistence + browser tests)
- owner: named human (Rhys Coombes)
- implementer: hermes (delegated agents) + codex integrated branch
- independent_reviewer: codex (PR #8 review) / named human merge
- risk: medium
- data_classification: synthetic
- depends_on: P1-CORR-001 (draft PR #8), SURV-001/SURV-002
- goal: `repeatFor` questions (E01/E02/E03 per D03 topic, max 3) render per
  instance, validate per instance, persist per instance (repeat_key column),
  and are covered by Playwright mobile/keyboard/stops/duplicate/release
  journeys. Required-question blocking and terminal pathways are browser-tested.
- non_goals: no real collection, no consent changes (R2), no membership changes (R3)
- files: packages/survey-contract/src/{branching,validators,fixtures,index}.ts,
  contract tests, apps/admin survey-client + survey-submit + submit route,
  supabase/migrations/20260801001000_r1_repeat_groups.sql,
  supabase/tests/survey-repeat.test.sql, apps/admin/e2e/*, playwright.config.ts,
  .github/workflows/ci.yml (browser job), docs/adr/0001 (already records the guardrail)
- acceptance_tests:
  - contract: visibleQuestionIds expands repeat instances and hides them when
    the source question (D03) has no selections; validateAnswers accepts and
    caps composite keys (base#topic); fixtures use composite keys
  - persistence: one session can store N repeat answers with repeat_key; the
    old (session, question) uniqueness no longer blocks repeats
  - app: survey submit writes repeat rows with repeat_key; renderer shows one
    field per D03 selection; required questions block Next natively
  - browser: mobile journey, required blocking, A01/A02 stops, duplicate
    submit, draft-release 503 all pass in Playwright
  - ci: browser job green on the PR
- human_decisions: none for this engineering slice; release remains gated
- rollback: revert R1 commits on the integrated branch; the append-only
  migration is not rewritten — a successor migration reverts if ever needed
- evidence: local gate output + GitHub Actions run recorded on PR #8
