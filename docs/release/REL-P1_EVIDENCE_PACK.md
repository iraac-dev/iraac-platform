# REL-P1 Evidence Pack — integrated correction

## Review conclusion

The Hermes P1 branches contain substantial useful implementation, but the
claim “P1 build complete” was not supported when the branches were tested as a
system. Three independent reviews and the integrated diff identified release
blockers. Draft PR #8 is the only P1 review candidate. Local verification
applies to commit `25d715944b866f9e700bbc12c1f20083a2b68fbe`; the following
handoff commit changes documentation only.

## Executed evidence on the verification checkpoint

- lint and typecheck: PASS
- application/contract tests: 70 PASS
- production build: PASS
- dependency audit: 0 vulnerabilities
- fresh Supabase reset and schema lint: PASS
- pgTAP: 42 PASS
- shell syntax and diff checks: PASS

GitHub Actions run `30712705328` passed quality, secrets and database jobs on
the corrected code/CI head. The full restore, browser/accessibility suite and
10,000-response rehearsal remain outside these claims.

## Confirmed defects and disposition

| Finding | Correction | Remaining proof |
|---|---|---|
| Draft survey could still accept responses | API verifies active status and approved content hash | Integration test against reset DB |
| Public caller could spoof completion mode | Public route always records `web` | Route test |
| Load script used invalid UUIDs and a one-row fallback | HTTP-only, valid UUIDs, exact-count fail-closed script | Execute 10,000 run |
| Blanket current/future CRUD for standard roles | Successor migration revokes grants; service role remains server-only | Execute pgTAP/reset |
| Later grant could undo STOP | Successor state trigger makes suppression deny-wins | Execute concurrency tests |
| I05 was stored as recording consent | I05 removed from permission-channel map | Contract/UX review |
| Dashboard accepted role claims without AAL2/active status | Guard requires AAL2, active flag and named generic-mailbox custodian | Membership model + MFA enrollment tests |
| Logger redaction was case-sensitive and metadata forgeable | Normalized keys and trusted metadata written last | Unit gate |
| Restore drill restored one table into its source | Full dump/restore requires distinct, confirmed disposable target | Execute drill |
| Roadmap was absent from platform repo | Canonical roadmap and launch plan copied and corrected here | Keep both in future PRs |

## Verification rule

Evidence applies only to the exact integrated commit on which it ran. A green
unit suite does not imply a database reset, browser accessibility review,
restore, 10,000-submission rehearsal, privacy review or production readiness.
Record commands, commit SHA, environment class, timestamp and sanitized output
for every executed gate.

## Work that remains before P1

Transactional consent and receipt evidence, user-scoped authorization, complete
MFA enrollment/recovery, repeat-group rendering, browser/accessibility tests,
CI database coverage, corrected restore/load execution, privacy and Indigenous
data governance outcomes, and private operational role assignment.
