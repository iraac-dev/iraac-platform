# IRAAC production launch plan

> **Integrated-review correction — 1 August 2026.** Draft PRs #4–#7 must not
> be merged independently. The integrated correction PR is the single review
> candidate and supersedes their completion claims. P1 is not released until
> the remaining R1–R4 gates in `ROADMAP.md` are proven on the integrated commit.
> Rhys has standing authority for routine internal engineering decisions; the
> platform therefore uses policy-driven automation and an exception queue, not
> repetitive approval prompts. External consent, suppression, privacy,
> cultural governance and publication boundaries remain mandatory controls.
>
> **Precedence:** `ROADMAP.md` controls product, governance, architecture and
> release ordering. This plan decomposes current work and must conform to it.
> The continuation handoff is informational only and overrides neither.

> **Operational purpose.** This is the shortest safe route from the current
> static website to an operating IRAAC listening platform. It converts
> [`ROADMAP.md`](ROADMAP.md) into ordered work packages that a human, Codex,
> Claude Code or another approved agent can claim and verify. The roadmap
> remains authoritative on product, consent, governance and compliance; this
> file is authoritative on delivery order.

**Plan date:** 1 August 2026

**Target:** begin useful production operation as soon as the release gates pass

**Account state rule:** no account, billing, MFA, region or access handoff is
assumed. Record each as `verified`, `unverified` or `not created` from current
evidence. Engineering continues only against confirmed sandbox/synthetic
resources and must not create duplicate organisations or projects.

**Production principle:** collecting an active, governed survey may launch
before outbound email; email may launch before SMS; human calling may launch
before AI calling. Never hold a safer completed channel for a later, riskier
channel.

## 1. What “production” means

IRAAC reaches production through four independently releasable capabilities:

| Release | Real capability | What remains off |
|---|---|---|
| **P1 — Listen** | Public, mobile-first Have Your Say survey; anonymous by default; optional contact/consent capture; private staff review; audit and withdrawal | All outbound campaigns |
| **R5 — Reports** | De-identified community reports and private staff/partner and government drafts with versioned publication controls | Outbound campaigns |
| **P2 / R6 — Email** | Approved full-audience newsletter and locked-cohort survey email for eligible pilot contacts; bounces, complaints and unsubscribe work end to end | SMS and outbound calls |
| **P3 — SMS + human phone** | SMS chase and phone-assisted survey for separately eligible contacts; immediate channel/global suppression | AI calls |
| **P4 — AI phone pilot** | Small, consented AI survey-call pilot with immediate disclosure, deterministic survey flow and human handoff | Expansion beyond approved pilot limits |
| **Phase 7 / R9 — Service Connector + 1800 Mob Link pilot** | Location-based Aboriginal service finder, Supabase Auth login, referral handoff, service portal foundation and longitudinal call-centre outcome follow-up | National launch, real outreach, named service-performance publication and production call recording |

P1 is the fastest useful production goal. P2 is the fastest outreach goal. P3
and P4 are separate releases because their legal, carrier, safety, speech
quality and operational dependencies are different.
Phase 7/R9 is a strategic expansion after the governed listening and reporting
foundations are stable. It is a separate product from Have Your Say: the app is
the service-navigation front door, while 1800 Mob Link is the call-centre
follow-up engine. It must not jump ahead of consent, safety, human operator,
service-directory and publication gates.

### Indicative critical-path targets

These are planning targets, not promises. They assume the account commitment
above is completed, named human decisions arrive the same business day, and no
vendor, legal, ethics or security gate returns material changes.

| Target window | Outcome |
|---|---|
| Days 0–2 | Owners appointed, accounts opened, legal/governance work started, repository and environments ready |
| Days 3–7 | Synthetic end-to-end slice: sign-in, survey submission, consent receipt, masked staff view and suppression |
| Days 8–12 | P1 release candidate, accessibility/security tests, restore and incident drills |
| Days 13–15 | Small approved P1 production launch and monitored stabilisation |
| Days 16–20 | P2 internal test then small opt-in email pilot, if SES/provider approval and exact-message legal approval exist |
| After stable P2 | P3 SMS/human-phone pilot; P4 AI calling only after its separate proof and approvals |
| After stable P4/R5 foundations | Phase 7/R9 Service Connector + 1800 Mob Link Illawarra design, synthetic prototype and human-reviewed pilot plan |

If a gate takes longer, engineering continues with synthetic data, but no agent
may describe the blocked capability as live or bypass the gate to meet a date.

## 2. Decisions that are already settled for V1

- **Contact groups:** Business Contacts and Citizen Contacts.
- **Monthly operation:** newsletter to 100% of eligible email recipients; an
  independently selected 30% of each contact group becomes one locked survey
  chase cohort; a selected person cannot be selected in the next two calendar
  months.
- **Chase:** direct survey email → SMS to remaining eligible non-completers →
  phone survey for remaining eligible non-completers.
- **Survey:** one stable IRAAC-owned Have Your Say instrument, rendered by the
  first-party React adapter and governed by the IRAAC TypeScript/Zod contract.
  ADR 0001 supersedes the earlier SurveyJS assumption.
- **Application:** Next.js, React and TypeScript, with Vitest and Playwright.
- **System of record and identity:** Supabase Postgres and Supabase Auth
  in `ap-southeast-2` (Sydney), deny-by-default RLS, named invitations,
  community phone OTP and mandatory staff AAL2 MFA.
- **Community Service Connector login:** Supabase Auth is selected for Phase
  7/R9 community login. Phone OTP should be sent through the approved SMS
  provider after privacy, sender-registration and safe-contact review.
- **Hosting:** public site remains on Vercel; private app and survey use a
  Sydney-configured execution path subject to the approved data-flow map.
- **Jobs:** Postgres transactional outbox plus Supabase Queues/Cron and a
  Sydney worker; providers do not own eligibility or suppression state.
- **Email:** Amazon SES candidate, initially limited to synthetic/internal and
  explicit opt-in recipients unless AWS and counsel approve the exact Business
  Contacts use case.
- **SMS:** Sinch MessageMedia is the primary provider. AWS End User Messaging
  stays the AWS-aligned emergency alternative.
- **Voice:** Amazon Connect Sydney proof of concept; human calls first; AI
  calls remain a separate opt-in pilot.
- **Delivery:** Codex implements narrow work orders; Claude Code is the
  recommended independent reviewer/test adversary; deterministic CI and named
  humans decide releases.

Changing one of these requires a written architecture decision. Rhys may
activate a versioned standing policy after required legal, privacy, cultural
and security inputs exist. Unchanged in-policy runs need no repeated approval;
policy changes and exceptions do.

## 3. Websites and accounts Rhys needs

Do not create duplicate organisations or projects. Use an IRAAC-controlled
business email, two named human owners, MFA, least privilege and billing alerts.
Never paste credentials or recovery codes into chat, GitHub or this repository.

### Create or confirm now

| Website | Action | Exact configuration / reason | Owner evidence to record |
|---|---|---|---|
| [GitHub](https://github.com/) | **Confirm existing organisation/repository** | Keep `rhy-collab/iraac-website` for the public site. Create a **private** `iraac-platform` repository for the app, migrations and operational code. Protect `main`; require PR, current approval, checks and resolved conversations. | Two owners, recovery method, branch rules screenshot/URL |
| [Supabase](https://supabase.com/dashboard) | **Create organisation and production project** | Paid production plan; choose the exact **Oceania (Sydney) `ap-southeast-2`** region. Create separate local/test, staging and production environments. Enforce organisation MFA and require app AAL2 for every staff role. | Organisation/project IDs, region evidence, billing cap, two owners, backup policy |
| [Vercel](https://vercel.com/) | **Confirm existing team and create app projects** | Keep the public website project. Add separate survey/admin projects or one deliberately separated app; pin sensitive functions to `syd1`; disable body/PII logging and preview indexing. | Team/project IDs, domain ownership, region/config evidence, two owners |
| [AWS](https://aws.amazon.com/) | **Create or harden IRAAC account** | Use an organisation-owned account, root MFA, IAM Identity Center, Sydney (`ap-southeast-2`) as the working region, budgets and least-privilege roles. This one account supports SES, KMS, SNS, End User Messaging and Amazon Connect proofs. | Account ID, two break-glass owners, budget alerts, support contacts, region/data map |
| [1Password Business](https://1password.com/business-security) | **Create shared credential vault** | Store recovery material, vendor admin credentials and secret-rotation records. Agents receive environment-scoped secrets through deployment systems, never vault-wide access. | Two recovery owners, vault/access groups, offboarding test |
| [Anthropic / Claude Code](https://claude.ai/) | **Optional but recommended now** | Create an organisation-controlled account for the independent reviewer. Install its GitHub app only on the private platform repo with minimum permissions and trusted manual triggers. Codex can start without it. | Named account owner, app permissions, spending/turn limits |

### Apply inside existing accounts now

| Website | Action | Important dependency |
|---|---|---|
| [Amazon SES](https://console.aws.amazon.com/ses/) | Verify IRAAC sending domain in Sydney, configure DKIM and a custom MAIL FROM domain, connect bounce/complaint events, then request production access for the truthful approved use case. | AWS says new SES accounts are sandboxed by region and its production request requires a consent and bounce/complaint process. Do not misdescribe directory-derived contacts as explicit opt-ins. |
| [GoDaddy](https://www.godaddy.com/) | Confirm domain/DNS access; publish provider verification, DKIM, SPF and staged DMARC records without breaking Google Workspace mail. | Preserve the existing Google Workspace records; one owner makes DNS changes and another verifies them. |
| [Google Admin](https://admin.google.com/) | Confirm DKIM is active, create monitored reply/complaint/privacy addresses and restrict admin access with MFA. | IRAAC must monitor replies and opt-outs; sending infrastructure cannot be a no-reply dead end. |
| [ACMA SMS Sender ID Register](https://www.acma.gov.au/sms-sender-id-register) | Confirm ABR contact details and register any branded `IRAAC` sender ID before using it. | Since 1 July 2026, unregistered branded IDs are labelled `Unverified`. The chase should still use a reply-capable number so `STOP` works. |

### Create only when the relevant pilot is approved

| Website | Trigger | Decision |
|---|---|---|
| [Sinch MessageMedia](https://messagemedia.com/au/) | P2 is stable and P3 SMS wording/legal basis is approved | Open a trial/production account as the primary SMS provider and test Australian two-way replies, `STOP`, delivery receipts, webhooks, sender registration, subprocessor locations, support and cost. Do not run two production suppression sources. |
| [Amazon Connect](https://console.aws.amazon.com/connect/) | Human-phone P3 design is approved | Create the Sydney instance, claim/port a working caller-ID number, request outbound quotas (default campaign concurrency may be zero), configure KMS, queues and human escalation, and prove the exact Australian flow. |
| [Telnyx](https://telnyx.com/sign-up) | P4 voice proof needs a genuine challenger | Time-box an Australian Voice AI bake-off only if Amazon Connect fails a defined latency, speech-quality, locality, handoff or cost threshold. Do not send production data during the comparison. |
| [Qualtrics](https://www.qualtrics.com/au/) | V1 survey spike fails a mandatory threshold | Request an Australian-region trial/quote for the already-defined comparison. It is a fallback validation exercise, not a second system of record. |

No new CRM, workflow automation, dashboard, analytics or mass-mailing product
is required for V1. GitHub Issues/Projects can track work; Supabase holds
governed state; provider-native telemetry plus IRAAC's audit tables is enough
to start. Every additional SaaS adds identity, data-location, contract and
incident-response work.

## 4. Day-zero human work — run in parallel

Engineering starts immediately with synthetic data, while named humans complete
these launch-critical items:

1. **Name the authorities:** executive sponsor, product owner, Aboriginal and
   Torres Strait Islander data-governance lead/group, privacy/data custodian,
   security incident owner, survey owner, campaign approver and release owner.
2. **Approve the V1 boundary:** adult-only P1; canonical survey questions;
   anonymous-by-default design; optional channel permissions; reports excluded
   from the first release unless separately approved.
3. **Obtain written determinations:** IRAAC entity/ACNC and Privacy Act status;
   research vs consultation/evaluation; Business Contacts data source/licence;
   exact newsletter, chase email, SMS and human/AI call classifications;
   youth exclusion; call recording/transcript decision; NSW and cross-border
   duties.
4. **Approve governance artefacts:** PIA, data-flow/vendor register, retention
   and disposal schedule, role/action/data matrix, small-cell/quotation rules,
   privacy notice, consent text, withdrawal/correction process, incident plan
   and community return-of-results commitment.
5. **Provide controlled inputs:** named staff invitation register with one
   accountable custodian per mailbox; approved business-source sample; domain
   access; brand assets; monitored reply addresses; and pilot test contacts.
6. **Open vendor requests early:** SES domain and production access, SMS sender
   registration, and later Connect phone/quota requests can take longer than
   coding.

These are human decisions. An agent may draft the record, checklist or test,
but cannot supply the authority or legal conclusion.

## 5. Engineering critical path

Each work package produces a demonstrable vertical result. IDs and dependencies
are stable so another agent can take over without re-planning.

### Foundation

| ID | Work package | Depends on | Done when |
|---|---|---|---|
| `PLAT-001` | Create private platform repo, `AGENTS.md`, ADR template, work-order template, CODEOWNERS, CI and protected environments | GitHub account | PR checks run on a minimal Next.js app; production environment requires named approval |
| `PLAT-002` | Scaffold Next.js/TypeScript app, packages and local Supabase; pin toolchain and lockfile | `PLAT-001` | A new machine can run lint, typecheck, unit tests, production build and local DB from documented commands |
| `PLAT-003` | Define environment/secret contract for local, test, staging and production | `PLAT-001` | No secret is committed; startup fails clearly on missing values; CI and preview use synthetic/test resources only |
| `DATA-001` | Create append-only migrations for identity/contact, answers, consent, suppression, audit and survey releases | `PLAT-002`, approved data boundary | Generated types and schema docs match; migration up/down/restore rehearsal passes on synthetic data |
| `SEC-001` | Implement Supabase named invitations, roles, server session checks, mandatory AAL2 and deny-by-default RLS | `DATA-001` | Anonymous, wrong-role and AAL1 tests are denied; every approved action and data class has an explicit test |

### P1 — Listen

| ID | Work package | Depends on | Done when |
|---|---|---|---|
| `SURV-001` | Freeze Have Your Say V1 contract, stable IDs, validators, fixtures and semantic hash | Human survey approval, `PLAT-002` | Web, staff and future phone adapters consume one contract; active release is immutable |
| `SURV-002` | Build anonymous mobile survey with rate limit, accessible bot fallback, server-only idempotent submission and no trackers | `SURV-001`, `DATA-001` | Anonymous adult completes without contact details; duplicate submit creates one completion; response tables cannot be read publicly |
| `CONS-001` | Add optional contact details, separate unticked permissions, versioned receipts and no-login withdrawal/preferences | `SURV-002` | Each channel is independently provable; withdrawal and global/channel stops apply immediately and are audit logged |
| `ADMIN-001` | Build invite-only dashboard for masked submissions, consent/suppression timeline, audit log and staff access review | `SEC-001`, `CONS-001` | Least-privilege staff can do only approved actions; shared/generic mailbox cannot become admin without named custodianship |
| `OPS-001` | Add health checks, structured no-PII logs, backup/restore, key rotation, access/offboarding and incident runbooks | `ADMIN-001` | Restore and lost-MFA/offboarding drills pass; high/critical findings are zero |
| `REL-P1` | Accessibility, privacy, security, load and production-release rehearsal | All P1 packages, Phase 0 approvals | WCAG 2.2 AA review, mobile journeys, RLS tests, 10,000-contact synthetic load, PIA and human go/no-go are recorded |

### R5 — Reports and publication controls

| ID | Work package | Depends on | Done when |
|---|---|---|---|
| `RPT-001` | Reproducible de-identified snapshot and community, staff/partner and government report views | Stable governed response base, `REL-P1` | Metrics reproduce from a locked snapshot; small cells/quotes are suppressed; a versioned standing publication policy or exception decision controls release |

### P2 / R6 — Email

| ID | Work package | Depends on | Done when |
|---|---|---|---|
| `CAMP-001` | Build deterministic eligibility service, audience preview, approval token, immutable manifest and emergency pause | `REL-P1` | Same inputs reproduce the same audience; suppression always wins; no agent can self-approve |
| `SAMP-001` | Implement independent 30% Business/Citizen sampling, three-month rotation and locked combined cohort | `CAMP-001` | Edge cases, shortfalls, deduplication, fairness and Jan→Apr eligibility tests in roadmap pass |
| `MAIL-001` | Build SES adapter, signed/replay-safe events, bounce/complaint handling, RFC 8058 one-click and body unsubscribe | SES sandbox/domain, `CAMP-001` | Synthetic/internal test proves idempotency, immediate suppression, scanner-safe body links and cancellation races |
| `MAIL-002` | Build versioned newsletter and clear survey-chase email approval/preview | Approved exact copy, `MAIL-001`, `SAMP-001` | Human preview matches immutable content and recipient hashes; replies reach monitored IRAAC staff |
| `REL-P2` | Internal seed → small explicit-opt-in pilot → controlled expansion | SES production/provider acceptance, legal/governance approval | Every wave has limits and stop thresholds; no directory-derived send occurs without written provider and legal acceptance |

### P3 — SMS and human phone

| ID | Work package | Depends on | Done when |
|---|---|---|---|
| `SMS-001` | Sinch MessageMedia data-flow, contract and integration proof | Stable P2, SMS approval | Sinch passes tested delivery, two-way STOP, webhooks, locality, support and cost; ADR 0006 remains approved |
| `SMS-002` | Add provider adapter, `STOP`/`STOP ALL`, preferences, delivery events and remaining-non-completer transition | `SMS-001` | Stop is immediate and idempotent; email unsubscribe does not silently block separately permitted SMS; global stop blocks all |
| `CALL-001` | Build phone-assisted operator mode against the canonical survey | `REL-P1`, human-call approval | Masked identity, eligibility reason, quiet hours, attempt cap, dispositions, stop interrupt and safety/human escalation pass |
| `REL-P3` | Small approved SMS and human-phone pilot | `SMS-002`, `CALL-001`, sender/number/quota readiness | Every recipient passes live eligibility; complaint/stop and incident drills pass before expansion |

### P4 / R8 — AI phone pilot

| ID | Work package | Depends on | Done when |
|---|---|---|---|
| `VOICE-001` | Amazon Connect Sydney proof: number, quotas, answer detection, disclosure, canonical survey tools, human transfer, events and data map | Stable human pilot, AI-call approval | Test proves the exact end-to-end Australian flow; no assumed capability remains |
| `VOICE-002` | Deterministic call controller with AI intent assistance, interruption-safe stop, fail-closed quarantine and no persistent recording by default | `VOICE-001` | All approved stop phrases interrupt every state; ambiguous/safety events reach a human; consent and AAL/data boundaries pass |
| `REL-P4` | Small named AI-consented pilot | Community speech/accessibility testing, `VOICE-002` | Immediate IRAAC/AI/purpose disclosure, permission to continue, human alternative, quiet hours, caller ID, return number and stop handling are evidenced |

### Phase 7 / R9 — Service Connector + 1800 Mob Link pilot

| ID | Work package | Depends on | Done when |
|---|---|---|---|
| `R9-A` | Groundwork: product boundary, technology ADR, directory research, user journeys and taxonomy | R5, safety/legal/governance input | ADR 0005, journeys, taxonomy and integration decisions are accepted |
| `R9-B` | Service-directory data model and synthetic Illawarra seed | `R9-A` | HSDS-shaped Supabase tables, pgTAP/RLS tests and synthetic records pass |
| `R9-C` | Basic postcode/suburb search and service detail UI | `R9-B` | List-first search, crisis routing, safety UX and accessibility checks pass |
| `R9-D` | Supabase Auth community-login architecture and account home | `R9-A`, privacy review | Phone OTP, Supabase RLS mapping and account-home tests pass with synthetic users |
| `R9-E` | Referral request flow | `R9-C`, `R9-D`, consent approval | Request help, consent receipts, safe contact, referral status and audit pass |
| `R9-F` | 1800 Mob Link operator console | `R9-E` | Staff queue, manual phone logging, scripts, escalation and provider-adapter boundaries pass |
| `R9-G` | Follow-up and outcome measurement | `R9-F` | Referral -> check-in -> outcome -> referral improvement runs with synthetic data |
| `R9-H` | Service freshness and de-identified reporting | `R9-G` | Stale-listing workflow and locked report snapshots pass privacy controls |
| `R9-I` | Illawarra release gates | `R9-B`-`R9-H` | Legal, privacy, Aboriginal governance, crisis, youth, accessibility, operator training, incident, rollback and named go/no-go are evidenced |

## 6. Agent operating contract

Every agent starts by reading, in order:

1. `AGENTS.md` in the private platform repository;
2. this plan;
3. `ROADMAP.md` sections relevant to the claimed work;
4. the current ADRs and work order; and
5. the latest branch, PR, CI and deployment state.

Use one work order and one branch per outcome. A valid work order contains:

```yaml
id: IRAAC-###
title: one reviewable outcome
owner: named human
implementer: codex | claude | human
independent_reviewer: claude | codex | named human
risk: low | medium | high
data_classification: synthetic | operational | personal | sensitive
depends_on: [IRAAC-###]
goal: measurable result
non_goals: explicit exclusions
files: expected areas only
acceptance_tests: [deterministic checks]
human_decisions: [anything an agent cannot approve]
rollback: exact recovery action
evidence: links added before completion
```

Rules:

- Codex and Claude never live-edit the same branch, files or migration.
- Agents use synthetic fixtures and sandbox destinations only. No contact list,
  response, credential or recovery material enters prompts, commits or logs.
- Schema/PII/region/auth/retention/vendor changes require an ADR and human
  design approval before implementation.
- A draft PR opens early. Formatting, lint, types, unit/contract tests, pgTAP
  RLS tests, Playwright mobile/accessibility tests, production build, secret
  scan, dependency scan and migration review must pass on the latest commit.
- Agent review is advisory. Protected branch rules and the standing merge
  policy decide routine integration. Merge never authorises production contact
  or report release.
- The handoff records commit/PR, decisions, tests, preview evidence, migrations,
  residual risks, rollback and the next unblocked work order.

## 7. Release gates and stop conditions

No real person, business, response or contact detail enters a capability until
its release owner verifies all applicable gates:

- named legal, privacy, research/ethics and Aboriginal data-governance records;
- exact survey/message/script, recipient class, source and channel approval;
- approved vendor/subprocessor/data-location map and contract;
- named staff accounts, AAL2, RLS, access review and offboarding;
- consent provenance and deny-wins suppression tested at every provider race;
- no PII, sensitive answers or raw free text in application, provider, Vercel,
  CI or AI logs;
- backup restore, deletion, incident, complaint, accessibility and emergency
  pause rehearsed;
- domain authentication, reply monitoring, provider events and rate/cost caps;
- synthetic, internal and small-pilot stages completed in order; and
- a signed go/no-go record containing environment, commit, migration, content
  hash, audience hash, rate limit, approver and rollback.

Stop automatically on an unapproved audience/content hash, stale consent,
suppression uncertainty, failed opt-out write, missing provider-event
verification, unknown recipient timezone for calls, threshold breach, data
leakage, unresolved high/critical finding or inability to activate the global
pause. Quarantine for human review; do not “best effort” a contact decision.

## 8. First dashboard Rhys should see

The first useful dashboard is operational, not an analytics showpiece. It shows:

- P1/P2/P3/P4 release state and which human gate blocks the next release;
- current survey release and response count, with no small-cell disclosure;
- staff invitations, named custodian, MFA and last access-review status;
- consent and suppression health, including failed or quarantined writes;
- upcoming campaign preview, exact content/audience hashes and approver;
- sends/completions/stops/bounces/complaints by channel;
- emergency pause, incident owner and last drill; and
- backups, last verified restore and current production commit/migration.

## 9. Immediate next ten actions

1. Review the integrated correction PR; do not merge draft PRs #4–#7 separately.
2. Make survey session plus answers one idempotent transaction.
3. Make consent identity, endpoints, events, receipt items and audit one transaction.
4. Add server-managed membership, narrow authorization and complete MFA recovery.
5. Finish repeat-group rendering and mobile/browser accessibility journeys.
6. Run database reset, migration lint and pgTAP in CI on the integrated commit.
7. Execute the corrected full restore in a separately identified disposable database.
8. Execute and reconcile the corrected 10,000-response HTTP rehearsal.
9. Mark every provider/account state verified, unverified or not created; create no duplicates.
10. Complete privacy and Indigenous data-governance outcomes, then build R5 reports before R6 email.

## 10. Research basis

This execution plan was checked on 1 August 2026 against the current official
sources below. Vendor documentation establishes capability and setup
requirements; it does not replace IRAAC's legal, contractual, security,
accessibility or Aboriginal data-governance review.

- Supabase: [Sydney region](https://supabase.com/docs/guides/platform/regions),
  [MFA and AAL2 enforcement](https://supabase.com/docs/guides/auth/auth-mfa),
  [organisation MFA](https://supabase.com/docs/guides/platform/mfa/org-mfa-enforcement),
  [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
  [server invitations](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail),
  [Queues](https://supabase.com/docs/guides/queues/pgmq) and
  [backups](https://supabase.com/docs/guides/platform/backups)
- Vercel: [function regions](https://vercel.com/docs/functions/configuring-functions/region)
- AWS: [SES production access](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html),
  [DMARC](https://docs.aws.amazon.com/ses/latest/dg/send-email-authentication-dmarc.html),
  [deliverability](https://docs.aws.amazon.com/ses/latest/dg/send-email-concepts-deliverability.html)
  and [Amazon Connect outbound setup, quotas and caller ID](https://docs.aws.amazon.com/connect/latest/adminguide/enable-outbound-campaigns.html)
- GitHub: [protected branches, reviews and required checks](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/managing-a-branch-protection-rule)
- ACMA: [spam and unsubscribe](https://www.acma.gov.au/avoid-sending-spam),
  [calling rules](https://www.acma.gov.au/say-no-to-telemarketers) and
  [SMS Sender ID Register](https://www.acma.gov.au/sms-sender-id-register)
- OAIC: [privacy impact assessments](https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/more-guidance/guide-to-undertaking-privacy-impact-assessments),
  [APP 3 sensitive-information collection](https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-3-app-3-collection-of-solicited-personal-information)
  and [data-breach preparation and response](https://www.oaic.gov.au/privacy/notifiable-data-breaches/preventing-preparing-for-and-responding-to-data-breaches/data-breach-preparation-and-response)
- Indigenous research governance: [AIATSIS Code of Ethics](https://aiatsis.gov.au/research/ethical-research)
  and [NHMRC National Statement 2025](https://www.nhmrc.gov.au/about-us/publications/national-statement-ethical-conduct-human-research-2025)
