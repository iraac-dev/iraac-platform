# IRAAC survey platform decision

> **Implementation correction, 1 August 2026:** ADR 0001 supersedes this
> document's SurveyJS renderer selection. The TypeScript/Zod contract,
> Supabase system of record and cross-channel governance remain accepted. The
> current P1 renderer is the first-party React adapter in `apps/admin`.

## Superseded form status

The previous Google Form is cancelled, null and void as of 2026-07-31. It is
not a live destination, fallback, rollback target, migration baseline or source
of consent authority. IRAAC will build the new survey from scratch. Until the
new release is approved, `/survey` remains an IRAAC-owned page that collects no
responses.

## Decision

Build a small IRAAC-owned survey system. Use Next.js and TypeScript for the
public survey and staff interfaces, SurveyJS Form Library as the web form
renderer, a deterministic Zod-validated IRAAC survey contract and execution
engine, and Supabase Postgres in Sydney for responses, contact details,
consent receipts, releases and audit events. Deploy server functions in Sydney
and keep the stable public address at
`https://www.iraac-aco.com/survey`.

Do not adopt Google Forms, Typeform, Qualtrics, Formbricks, KoboToolbox,
LimeSurvey or REDCap as the system of record. Do not build a general-purpose
drag-and-drop form builder in phase one. SurveyJS is a replaceable presentation
component, not the survey authority. It remains selected only if the built
experience passes IRAAC's independent WCAG 2.2 AA, security, checkpoint and
branch-conformance gates; the IRAAC contract remains authoritative.

## Why this is the best fit

IRAAC needs more than a web form. The same stable instrument must work on the
web, with a worker, on a human phone call and through an approved AI voice
adapter. It also needs immutable consent evidence, contact/answer separation,
safe follow-up, report lineage, approval controls and Australian hosting. A
survey SaaS would still require a second custom platform for those duties and
would create two sources of truth.

One stable survey does not justify the operating burden of a full survey
product or self-hosted experience-management suite. SurveyJS supplies a mature,
MIT-licensed JSON-driven web renderer without taking ownership of response
data. A small IRAAC execution engine remains easier to test, audit and explain
than a general form factory. It also lets IRAAC give agents the
ability to draft, preview and test changes without letting them publish or
alter live evidence.

## Platform comparison

| Option | Strength | Why it is not the primary platform |
|---|---|---|
| Google Forms | Familiar and fast | Weak control over consent receipts, data separation, cross-mode state, release approvals and report lineage. |
| SurveyJS Form Library | MIT-licensed JSON-driven renderer with own-server storage | Useful UI component, but it does not supply IRAAC's governed backend, voice engine or approval controls. Survey Creator is separately licensed. |
| Formbricks | Open-source builder, APIs, webhooks and self-hosting | A broader XM platform. Current self-hosting adds Redis and S3-compatible storage, while IRAAC would still build phone parity and consent governance. |
| KoboToolbox | Strong field and offline collection | Good future option for remote/offline field work, but not the best canonical contact, consent, voice and reporting control plane. |
| Qualtrics | Mature enterprise survey and offline features | Higher cost and lock-in; API/offline capabilities depend on licensing and do not remove IRAAC's custom governance needs. |
| REDCap | Strong controlled research data collection | Requires an eligible institutional deployment and is not designed as IRAAC's public/community contact platform. |
| Custom Next.js + SurveyJS + Supabase | Exact control, Australian region, proven web renderer and one IRAAC contract across modes | The selected stack requires disciplined engineering, tests and governance. This is acceptable because the instrument is stable and the wider private platform is already required. |

## Selected components

| Concern | Selection |
|---|---|
| Public and staff UI | Next.js, React, TypeScript and SurveyJS Form Library with a tested IRAAC theme |
| Canonical definition | One immutable versioned JSON artifact with stable IDs and content hash; TypeScript, validators, docs and fixtures are generated |
| Validation and engine | Zod plus one deterministic IRAAC branch/state engine shared by all adapters; SurveyJS cannot own independent logic |
| Data system of record | Supabase Postgres project in `ap-southeast-2` (Sydney) |
| Security | Server-only writes, RLS, separate private schemas, Supabase Auth/MFA for staff, append-only audit events |
| Hosting | Vercel public assets and functions configured for `syd1`, subject to privacy/vendor review; Supabase functions explicitly invoked in Sydney where used |
| Testing | Vitest contract tests, Playwright browser/mobile/accessibility tests, database RLS tests and cross-adapter conformance fixtures |
| Public URL | IRAAC-owned `/survey` alias, never a provider URL or printed temporary deployment URL |

## Data and release boundaries

- Store contact identity separately from structured answers.
- Store safety incidents separately from analytics and expose only approved
  de-identified classifications to reporting.
- Accept anonymous responses only through a rate-limited, size-limited API with
  short-lived session challenges, accessible bot fallback and quarantine that
  excludes suspected poisoning from reports.
- Use hashed, rotating, short-lived same-device resume credentials outside URLs;
  cross-device recovery requires a separate approved design.
- Publish a retention/disposal schedule and a least-privilege role/action/data
  matrix before real collection. Cover exports, queues, vendors and backups.
- Use neutral no-store pages without third-party trackers or session replay.
  Treat all respondent free text as inert untrusted data.
- An active release is immutable. A change creates a successor draft.
- Agents can propose a draft, generate a semantic diff, preview every adapter
  and run tests. Humans approve meaning, consent, safety, comparability,
  publication, withdrawal and rollback.
- A started session pins its release. A partial session creates no future
  contact consent. A successful submission creates one completion event.
- Monthly reporting topics use an approved taxonomy and never silently mutate
  the survey.
- The public site may link to a public admin sign-in page only after the
  private dashboard is deployed. Use invite-only named Supabase Auth accounts,
  mandatory MFA, server-side session checks and RLS. Never use a shared PIN or
  a password embedded in the static site.
- Store end-of-survey and email-reply suggestions in a separate governed
  review queue. Treat the text as untrusted, require human triage and route an
  accepted item into the normal successor-release process rather than changing
  the active definition.

Before full implementation, run a time-boxed V1 spike and compare it with a
Qualtrics Australian-region trial/quote using mandatory accessibility, resume,
consent, phone-parity, immutable-release, export, incident-recovery, cost and
operator-burden criteria. The selected custom stack proceeds only if it meets
the recorded thresholds. This is a validation gate, not a return to Google
Forms as the long-term system of record.

## External grounding

- [SurveyJS Form Library overview and MIT licence](https://surveyjs.io/form-library/documentation/overview)
- [SurveyJS accessibility statement](https://surveyjs.io/accessibility-statement)
- [SurveyJS backend integration](https://surveyjs.io/documentation/backend-integration)
- [Formbricks self-hosting overview](https://formbricks.com/docs/self-hosting/overview)
- [Formbricks v4 self-hosting migration requirements](https://formbricks.com/docs/self-hosting/advanced/migration)
- [KoboToolbox data collection tools](https://support.kobotoolbox.org/data-collection-tools.html)
- [Supabase regions](https://supabase.com/docs/guides/platform/regions)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase regional function invocation](https://supabase.com/docs/guides/functions/regional-invocation)
- [Vercel regions and Sydney code](https://vercel.com/docs/regions)
- [Vercel function region configuration](https://vercel.com/docs/functions/configuring-functions/region)
- [AIATSIS Code of Ethics for Aboriginal and Torres Strait Islander Research](https://aiatsis.gov.au/research/ethical-research)
- [NHMRC National Statement on Ethical Conduct in Human Research](https://www.nhmrc.gov.au/about-us/publications/national-statement-ethical-conduct-human-research-2025)
