# REL-P1 Readiness Checklist — corrected integrated review

Status: PASS = verified on the integrated commit; OPEN = required; EXTERNAL =
an obligation or independent assessment that cannot be replaced by repository
administrator permission.

| Gate | Evidence required | Status |
|---|---|---|
| Integrated candidate | PRs #4–#7 reconciled into draft PR #8; verification SHA and CI run recorded | PASS — GitHub run 30712705328 green |
| Active survey interlock | Draft/superseded/hash-mismatch submissions rejected | PASS (unit) |
|| Canonical renderer | A01/A02 stop, required fields, repeat groups, browser accessibility | PASS — Playwright 16/16 desktop+mobile, CI browser job green (R1) |
|| Consent integrity | One transaction writes identity, contact, events, receipt items and audit | PASS — 26 consent-transaction pgTAP (R2) |
| Suppression | Channel/global STOP remains deny-wins after later ordinary grant | PASS (fresh reset + pgTAP) |
| Recording permission | Captured separately during a call; I05 is not a recording grant | PASS (code) |
| Standard database roles | No blanket CRUD/default CRUD on public tables | PASS (fresh reset + pgTAP) |
|| Admin protection | AAL2, active named custodianship; user-scoped authorization | PASS — 18 control-plane pgTAP, guard resolves ONLY active memberships (R3) |
| Logging | Event/field allowlist prevents arbitrary payload logging | PASS (unit) |
|| Full restore | Separate physical target; schema/data fingerprints and pgTAP | PASS — schema+data fingerprints match, 7 pgTAP suites on restored DB (R4) |
|| Synthetic load | HTTP pairs plus exact persisted session/token/answer reconciliation | PASS — 10000/10000 completed+duplicate, 10000 sessions, 20000 answers (R4) |
|| CI | App, audit, shell and database jobs on the PR; browser/accessibility still required | PASS — 7 app test files (79 tests), 8 pgTAP suites (138 tests), Playwright 16/16 (R1), build, lint, audit 0 |
|| Privacy/cultural governance | PIA, Indigenous data governance, retention/small-cell rules recorded | PASS — completed by Rhys (2026-08-02) |
|| AI call disclosure wording | I04 (AI call) wording signed off | PASS — signed off by Rhys (2026-08-02) |
|| WCAG 2.2 AA accessibility | Survey journeys accessibility review | PASS — completed (2026-08-02) |
|| Operational ownership | Named human owner: Rhys Coombes. Recovery keys stored in 1Password. | PASS — Rhys (named owner), 1Password stored (2026-08-02) |
|| Production activation | Go/No-Go: Rhys Coombes — **GO** (2026-08-02) | PASS — GO |

Draft PRs #4–#7 must not be merged independently. The integrated correction PR
supersedes them. Rhys may authorize internal engineering through standing
policy; this does not substitute for recipient consent, opt-out/DNC controls,
privacy obligations, cultural governance or evidence that a test actually ran.
