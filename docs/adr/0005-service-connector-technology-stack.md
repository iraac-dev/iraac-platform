# ADR 0005: Service Connector technology stack

- Status: proposed
- Date: 2026-08-07

## Decision

Use the existing IRAAC platform stack as the base for Phase 7/R9:

- Next.js App Router, React and TypeScript for the app;
- Vercel for hosting, with Sydney-configured server execution where required;
- Supabase Postgres in Sydney as the system of record;
- Supabase RLS, append-only migrations and pgTAP database tests;
- Clerk for community login only, subject to privacy approval;
- Open Referral HSDS-inspired local service-directory schema;
- outbound links to Ask Izzy/Infoxchange and Healthdirect/NHSD first, with API
  or widget integrations only after partnership/licensing review;
- postcode/suburb search first, Mapbox later if map/autocomplete value is
  proven;
- Postgres outbox plus Supabase Cron/Queues or a Sydney worker for follow-up
  tasks;
- a small IRAAC-owned operator console and manual/human phone logging first;
- Amazon Connect Sydney only when live call queues, supervision, call
  recording or multi-operator routing are justified;
- Sinch MessageMedia and Twilio as first SMS bake-off candidates, with AWS End
  User Messaging as the AWS-aligned alternative;
- Amazon SES for email receipts, consent confirmations and internal notices;
- locked Supabase snapshots for reporting.

## Why

The Service Connector has three jobs: help a person find services, help IRAAC
follow up safely, and create de-identified accountability evidence. The stack
must therefore prioritise data control, consent, audit, regional deployment,
RLS, reporting and operator workflows over rapid prototype convenience.

Supabase remains the backbone because the project needs relational records:
services, locations, eligibility, users, saved services, intakes, referrals,
consent receipts, follow-ups, outcomes, suppressions and report snapshots.

Clerk is useful for low-friction community login, but it is not the data
authority and real phone numbers cannot enter Clerk until privacy and
subprocessor review is complete.

The directory approach should integrate rather than duplicate. Ask Izzy,
Infoxchange and Healthdirect already carry national directory maintenance
burdens. IRAAC's strongest role is an Aboriginal-led local front door, local
priority directory, referral accountability loop and government/community
reporting layer.

## Technology decisions

| Project element | Selected technology | First release rule |
|---|---|---|
| Public app shell | Next.js App Router + React + TypeScript | Use existing app conventions |
| Hosting | Vercel | Sensitive functions must use approved region/data-flow map |
| System of record | Supabase Postgres Sydney | No Convex production data |
| Community login | Clerk phone OTP | Synthetic/test phones until privacy gate |
| Staff/operator access | Existing admin auth path | Do not migrate casually to Clerk |
| Directory model | HSDS-inspired Supabase tables | Local priority records only at first |
| Broad welfare search | Ask Izzy/Infoxchange links, then API/widget review | Do not scrape |
| Health search | Healthdirect/NHSD links, then API/widget review | Do not scrape |
| Search | Postgres structured filters and full-text search | Add trigram/synonym tuning only after real search data |
| Location search | suburb/postcode + radius | Device GPS optional later |
| Mapping | Mapbox Search/Geocoding optional | Not required for first release |
| Jobs | Postgres outbox + Supabase Cron/Queues/Sydney worker | Providers never own eligibility |
| SMS | Sinch MessageMedia vs Twilio bake-off; AWS End User Messaging as AWS alternative | Require two-way STOP |
| Email | Amazon SES | Receipts, consent confirmations, internal notices |
| Voice | Manual/human phone logging first; Amazon Connect Sydney later | Add Connect only when queue/call-centre needs are real |
| AI | Advisory summaries/search/script support | No crisis or eligibility decisions |
| Reporting | Locked SQL snapshots and de-identified views | No named service reporting without approval |

## Rejected or delayed

- Rebuilding a national directory: too much maintenance burden.
- Scraping directories: legal, accuracy and freshness risk.
- Map-first UI: weaker for safety, low bandwidth and accessibility.
- Convex as production backbone: region, SQL/reporting and data-governance
  concerns.
- Provider dashboards as the control plane: consent, suppression, task
  eligibility and reporting must remain in IRAAC-owned Supabase tables.
- Amazon Connect on day one: too heavy before volume, live queues and
  supervision are proven.
- AI-first call centre: too risky before human scripts, consent and crisis
  routing are proven.
- Provider-scheduled follow-ups: IRAAC must keep eligibility, suppression and
  cancellation inside its own queue.

## References

- Next.js on Vercel: https://vercel.com/docs/frameworks/full-stack/nextjs
- Supabase Clerk integration: https://supabase.com/docs/guides/auth/third-party/clerk
- Clerk Supabase integration: https://clerk.com/docs/guides/development/integrations/databases/supabase
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase scheduled functions: https://supabase.com/docs/guides/functions/schedule-functions
- Supabase regional invocation: https://supabase.com/docs/guides/functions/regional-invocation
- Infoxchange Service Directory: https://www.infoxchange.org/au/products-and-services/service-directory
- NHSD API guide: https://developers.nhsd.healthdirect.org.au/docs/consumer-api/index.html
- Open Referral HSDS: https://docs.openreferral.org/en/latest/hsds/overview.html
- Mapbox Search Box: https://docs.mapbox.com/api/search/search-box/
- Amazon Connect regions: https://docs.aws.amazon.com/connect/latest/adminguide/regions.html
- Amazon Connect Tasks: https://docs.aws.amazon.com/connect/latest/adminguide/tasks.html
- AWS two-way SMS: https://docs.aws.amazon.com/sms-voice/latest/userguide/two-way-sms.html
- Twilio TaskRouter: https://www.twilio.com/docs/taskrouter
- Twilio Australia SMS guidelines: https://www.twilio.com/en-us/guidelines/au/sms
- Sinch opt-out management: https://support.app.sinch.com/hc/en-us/articles/10526516506383-Opt-out-unsubscribe-management
- OAIC APP 3: https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-3-app-3-collection-of-solicited-personal-information
