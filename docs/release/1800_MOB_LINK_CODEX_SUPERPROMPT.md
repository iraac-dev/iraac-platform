# IRAAC 1800 Mob Link — Codex Super Prompt

Paste this into a fresh Codex task when you want an agent to bring the IRAAC
codebase up to date and prepare the next major 1800 Mob Link change.

## Mission

You are working on IRAAC, an Aboriginal Community Organisation. Its core loop
is:

**You share -> We listen -> We recommend to government -> We report back.**

The current project is moving from a governed survey/reporting platform into a
larger backbone: **1800 Mob Link**, proposed as **1800 662 5465**. The idea is
an Illawarra-first, later national, toll-free service-navigation line and
service portal for Aboriginal and Torres Strait Islander people. A caller can
explain where they are and what they need, be connected to the right local
services, and consent to later follow-up that checks whether those services
actually helped.

This is not a live service yet. Do not import real contacts, call anyone, send
email/SMS, activate outreach, store secrets, publish sensitive reports or
claim production is operating.

## Repositories and links

Load these before making decisions:

- Public website: https://www.iraac-aco.com/
- GitHub organisation: https://github.com/iraac-dev
- Private platform repo: https://github.com/iraac-dev/iraac-platform
- Public website repo: https://github.com/iraac-dev/iraac-website
- 13YARN reference service: https://www.13yarn.org.au/

Local workspace paths may include:

- `/Users/rhys/Downloads/Projects/IRAAC/iraac-platform`
- `/Users/rhys/Downloads/Projects/IRAAC/iraac-website-live`

## Required reading order

In `iraac-platform`, read:

1. `AGENTS.md`
2. `ROADMAP.md`
3. `PRODUCTION_LAUNCH_PLAN.md`
4. `BOT_TASKS.md`
5. `docs/work-orders/2026-08-07-mob-001-1800-mob-link.md`
6. `docs/adr/0003-keep-supabase-for-mob-link-backbone.md`
7. `docs/release/REL-P1_READINESS_CHECKLIST.md`
8. `docs/survey/IRAAC_SURVEY_PLATFORM_DECISION.md`

In `iraac-website`, read:

1. `README.md`
2. `ROADMAP.md`
3. `PRODUCTION_LAUNCH_PLAN.md`
4. `build.py`
5. the live public pages that would be affected by the work

Do not assume older website branches or old Google Form references are current.
The current public site is the front door only. The governed system belongs in
`iraac-platform`.

## Current truth to verify

Start by checking:

```bash
git status --short --branch
git remote -v
git fetch origin
git branch -a
```

Then check whether you can push a harmless testing branch:

```bash
git checkout -b test/codex-push-check-$(date +%Y%m%d-%H%M%S)
git push -u origin HEAD
```

If push succeeds, report the branch URL. If push fails, stop and report the
exact reason without asking for or storing credentials.

Do not push directly to `main`. Do not force-push. Do not merge. A successful
test branch proves write access; it does not prove production release approval.

## Strategic brief

The new direction is 1800 Mob Link:

- one memorable national number for Aboriginal and Torres Strait Islander
  community members;
- pilot first in the Illawarra region;
- connect people with local support based on location and need;
- cover needs such as housing, Centrelink, legal help, bail/court support,
  domestic and family violence, youth support, education, transport, health,
  mental health, cultural connection and local community programs;
- use an approved service directory as the backbone;
- allow a human operator and carefully bounded AI assistance;
- collect safe contact details only with consent;
- send referral summaries to services only where consented and safe;
- follow up over time to ask whether the organisation contacted the person,
  what support occurred, whether the need was resolved and whether escalation
  is needed;
- generate de-identified reporting for community and government about what is
  working, what is not working and where service gaps remain.

The accountability thesis is that fragmented services often make it difficult
for community members to know who to contact, and difficult for government to
see whether funded services produce outcomes. IRAAC can help by acting as the
trusted listening and referral evidence layer, not by pretending to replace
every service provider.

## Legal, cultural and safety constraints

Think deeply about the Australian context, but do not give legal advice or
embed legal conclusions as code. Treat these as gates requiring named human
approval:

- Privacy Act, Australian Privacy Principles and state duties where applicable.
- Indigenous Data Sovereignty and Aboriginal-led governance.
- Do Not Call, SMS spam, email unsubscribe and channel-specific consent rules.
- Youth, child safety, bail, domestic/family violence, health, mental health
  and mandatory-reporting pathways.
- Crisis routing: 1800 Mob Link must not replace 000, 13YARN, Lifeline, ALS,
  emergency accommodation, police, ambulance or specialist crisis services.
- Call recording and transcript storage require separate explicit permission.
- Service-performance reports about named organisations require governance,
  legal review, small-cell/privacy controls and a right-of-reply process where
  appropriate.

## Backend decision

Default recommendation: keep **Supabase Postgres in Sydney** as the system of
record.

Reason: 1800 Mob Link needs relational service directories, longitudinal
intake/referral/outcome records, SQL reporting, RLS, migrations, audit logs,
restore drills and Australian-region control. Supabase supports Sydney
deployment and Postgres RLS. Convex is attractive for rapid realtime
interfaces, but current public Convex regions are US East and EU West, and it
does not use SQL/Postgres. Do not switch the backbone to Convex without a
separate ADR that proves data residency, governance, audit, reporting,
RLS-equivalent access control, export/exit, lock-in and cost requirements.

Convex may be considered only for an isolated synthetic prototype or internal
operator-console experiment after the data-flow map is approved.

## Step-by-step implementation path

1. Sync both repositories and confirm the current branch, remotes and push
   access.
2. Open a new review branch, never `main`.
3. Update `ROADMAP.md` so 1800 Mob Link is an R9 strategic program after
   Listen, Reports, Email, SMS/human phone and AI voice gates.
4. Add or refine the `MOB-001` work order with goals, non-goals, acceptance
   tests, human decisions and rollback.
5. Write an ADR comparing Supabase and Convex for 1800 Mob Link before any
   backend switch. The likely decision is Supabase unless evidence changes.
6. Design the data model on paper first: service directory, intake case,
   referral handoff, consent receipt, follow-up event, service outcome,
   escalation and report snapshot.
7. Build only synthetic-data prototypes until legal, cultural-governance,
   privacy and safety scripts are approved.
8. Create an Illawarra service-directory seed using public information only,
   separating public contact facts from private referral details.
9. Build a staff/operator console slice for searching services, recording a
   synthetic intake, creating a synthetic referral and scheduling a synthetic
   follow-up.
10. Add the future community account/service portal only after auth, consent
    and safety designs are approved.
11. Add reports from locked de-identified snapshots only. Feedback from
    services or community is comment/evidence, not approval.
12. Run lint, typecheck, tests, build and database checks appropriate to the
    files touched.
13. Push the branch to GitHub and open a draft PR or report the branch URL if
    PR creation is unavailable.
14. If the website repo is touched, confirm whether Vercel creates a preview
    deployment and inspect the preview. Do not claim production unless the
    production deployment is actually updated and approved.

## Verification commands

For `iraac-platform`, prefer:

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run build
npm audit --audit-level=high
supabase db reset
supabase db lint --level error
supabase test db
git diff --check
```

Use the subset that matches the change if the work is documentation-only, and
say exactly which checks were skipped and why.

## Completion response

Finish with:

- branch name and GitHub URL;
- files changed;
- checks run and result;
- whether testing push worked;
- whether Vercel preview/production was checked;
- risks still needing human approval;
- the next smallest practical step.
