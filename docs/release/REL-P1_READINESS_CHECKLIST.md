# REL-P1 Readiness Checklist

Status legend: ✅ machine-verified · ⬜ human-gated (needs a named human)

## 1. Machine-verified (this repo proves these)

| # | Item | Evidence | Status |
|---|---|---|---|
| 1 | Canonical V1 survey contract frozen, hash approved | PR #1 merged; approval `docs/approvals/2026-08-01-surv-001-v1-release-approval.md`; hash `9f98a7b9...d5152f` | ✅ |
| 2 | Anonymous mobile survey built; submission server-only + idempotent | PR #3 merged; 41/41 app tests; `survey-submit.ts` | ✅ |
| 3 | RLS deny-by-default across all tables | 18/18 pgTAP (`supabase/tests/rls.test.sql`) | ✅ |
| 4 | Consent: per-channel grants, versioned receipts, no-login withdrawal | PR #4 (draft); 14 consent pgTAP; `consent-submit.ts` | ✅ |
| 5 | Admin dashboard: invite-only, role-guarded, masked submissions | PR #5 (draft); 6 admin pgTAP; `admin-guard.ts` | ✅ |
| 6 | Health endpoint + no-PII logging + backup/restore drill + runbooks | PR #6 (draft); `/api/health` live 200; drill PASS | ✅ |
| 7 | Local fresh-install REST works (schema-grants fix) | Migration `20260801000800`; verified 200 | ✅ |
| 8 | Duplicate submit cannot create two completions | Load rehearsal DB check: duplicate token → 1 row | ✅ |
| 9 | Secret scan clean; CI green on every feature branch | `.github/workflows/ci.yml` quality + secrets jobs | ✅ |
| 10 | Full DB suite green | `supabase test db` (RLS + consent + admin) | ✅ |

## 2. Human-gated (your decision / external review)

| # | Item | Who | Notes |
|---|---|---|---|
| 11 | Merge PRs #4, #5, #6 (CONS, ADMIN, OPS) | Rhys | All built + CI green; merge in any order |
| 12 | WCAG 2.2 AA accessibility review of the survey journeys | External/human | Required by the plan before real collection |
| 13 | Privacy Impact Assessment (PIA) | External/human | Indigenous Data Sovereignty + APP compliance |
| 14 | Final I04 (AI call) wording sign-off | Rhys + legal | Already flagged in the contract |
| 15 | Two named human owners per production platform | Rhys | §3 of the plan: GitHub, Supabase, Vercel, 1Password |
| 16 | Recovery-key storage in 1Password | Rhys | Never chat/repo |
| 17 | Push draft migrations to production? | Rhys | Safe (draft status, nothing collectable); optional pre-launch |
| 18 | Full 10k synthetic load run | Rhys or agent | `./scripts/load-rehearsal.sh 10000` with dev server up |
| 19 | **Go / No-Go decision** | Rhys (named) | Only after 11–18 done |

## 3. Suggested order to launch

1. Review + merge PRs #4 → #5 → #6 (each CI-green, additive).
2. Run the full load rehearsal (`scripts/load-rehearsal.sh 10000`).
3. Commission WCAG review + PIA (external).
4. Nominate the two owners per platform; move keys to 1Password.
5. Optional: push the draft migrations to production (still `draft`).
6. Sign the go/no-go on the evidence above → set the release `active`.

---

*Generated 2026-08-01 by hermes (agent_build_test). Evidence links in
`REL-P1_EVIDENCE_PACK.md`.*
