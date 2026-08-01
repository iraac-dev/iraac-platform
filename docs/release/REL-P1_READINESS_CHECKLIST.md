# REL-P1 Readiness Checklist — corrected integrated review

Status: PASS = verified on the integrated commit; OPEN = required; EXTERNAL =
an obligation or independent assessment that cannot be replaced by repository
administrator permission.

| Gate | Evidence required | Status |
|---|---|---|
| Integrated candidate | PRs #4–#7 reconciled into draft PR #8; verification SHA and CI run recorded | PASS — GitHub run 30712705328 green |
| Active survey interlock | Draft/superseded/hash-mismatch submissions rejected | PASS (unit) |
| Canonical renderer | A01/A02 stop, required fields, repeat groups, browser accessibility | OPEN |
| Consent integrity | One transaction writes identity, contact, events, receipt items and audit | OPEN |
| Suppression | Channel/global STOP remains deny-wins after later ordinary grant | PASS (fresh reset + pgTAP) |
| Recording permission | Captured separately during a call; I05 is not a recording grant | PASS (code) |
| Standard database roles | No blanket CRUD/default CRUD on public tables | PASS (fresh reset + pgTAP) |
| Admin protection | AAL2, active named custodianship; user-scoped authorization | PARTIAL — enrollment/challenge implemented; membership/recovery OPEN |
| Logging | Event/field allowlist prevents arbitrary payload logging | PASS (unit) |
| Full restore | Separate physical target; schema/data fingerprints and pgTAP | OPEN — corrected drill not yet executed |
| Synthetic load | HTTP pairs plus exact persisted session/token/answer reconciliation | OPEN — corrected 10,000 run not yet executed |
| CI | App, audit, shell and database jobs on the PR; browser/accessibility still required | PARTIAL — run 30712705328 green; browser gate OPEN |
| Privacy/cultural governance | PIA, Indigenous data governance, retention/small-cell rules recorded | EXTERNAL/OPEN |
| Operational ownership | Named account, incident and recovery roles stored privately | OPEN |
| Production activation | All preceding P1 gates pass against the exact release commit | OPEN |

Draft PRs #4–#7 must not be merged independently. The integrated correction PR
supersedes them. Rhys may authorize internal engineering through standing
policy; this does not substitute for recipient consent, opt-out/DNC controls,
privacy obligations, cultural governance or evidence that a test actually ran.
