# IRAAC Phase 7/R9 DeepSeek V4 Flash Build Plan

## One-Screen Summary

Build the **Location-based Aboriginal Service Connector** first, then connect
it to the **1800 Mob Link follow-up engine**.

This is not the Have Your Say survey. Have Your Say gathers community evidence.
The Service Connector helps a person find local and national services, request
help, track referrals and receive a follow-up check. 1800 Mob Link is the
call-centre engine that asks whether the service actually worked.

Core technology decisions:

- Frontend/app: Next.js App Router, React, TypeScript, deployed on Vercel.
- Community login: Clerk phone OTP, after privacy approval.
- Data backbone: Supabase Postgres in Sydney, with RLS and append-only
  migrations.
- Directory shape: Open Referral HSDS-inspired local schema.
- External directories: outbound links first; evaluate Infoxchange/Ask Izzy and
  Healthdirect/NHSD integration before copying data.
- Location: suburb/postcode first; Mapbox later if needed.
- Call centre: IRAAC-owned human operator console and manual phone logging
  first; Amazon Connect Sydney later only if call-centre volume justifies it.
- SMS: Sinch MessageMedia or Twilio first, with AWS End User Messaging as the
  AWS-aligned alternative.
- Email: Amazon SES for receipts, consent confirmations and internal notices.
- Jobs/follow-up: Postgres outbox, Supabase Cron/Queues or a Sydney worker.
- Reporting: locked Supabase snapshots and de-identified report views.
- Safety: 000 and 13YARN before ordinary search results where risk appears.

## Nine Work Packages

### Phase A — Groundwork and Research

Scope: no code. Lock the product boundary, service taxonomy, pilot geography,
technology decisions and user journeys.

Output:

- updated roadmap;
- technology-stack ADR;
- directory-integration notes;
- user journey notes;
- taxonomy notes.

### Phase B — Service Directory Data Model and Seed Data

Build the Supabase schema for local priority services using HSDS-shaped objects:
organisations, services, locations, service-at-location, categories,
eligibility, classifications, opening hours, contact channels and last-checked
metadata.

Use synthetic Illawarra seed records only.

### Phase C — Basic Search and Service Detail UI

Build postcode/suburb search, category filters, crisis routing, list results,
service detail pages, "not sure where to start", accessibility and safety UI.

Do not build a map first. A list works earlier, safer and better on low-bandwidth
phones.

### Phase D — Clerk Community Login and Account

Add Clerk phone OTP for community login after privacy review. Clerk identifies
the person; Supabase controls the records. The account home shows saved
services, current requests, referral status and safe contact preferences.

### Phase E — Referral Request Flow

Add "Request IRAAC help" from service detail pages. Capture reason for contact,
safe contact method, permission to share details, permission for follow-up and
urgent-risk check. Write server-side only.

### Phase F — 1800 Mob Link Operator Console

Build the staff queue: new requests, due callbacks, overdue follow-ups, urgent
holds, service corrections and escalations. Add scripts for ALS/legal,
YouthScape/bail, housing, Centrelink, domestic/family violence, transport,
health and cultural connection.

Start with a small IRAAC-owned console and manual/human phone logging. Add
Amazon Connect only when multiple operators, live queues, supervision, call
recording, live transfers or outbound-campaign tooling become real needs.

### Phase G — Follow-Up and Outcome Measurement

Schedule follow-ups after the approved interval. Ask whether the service
contacted the person, helped, failed, delayed, created barriers or needs
escalation. Convert answers into service-improvement signals.

### Phase H — Service Freshness and De-identified Reporting

Add "last checked", stale listing flags, "suggest an edit", staff review and
audit. Report no-result searches, top needs, referral acceptance, follow-up
completion, outcome rates, stale data and service gaps.

### Phase I — Release Gates

No real launch until legal/privacy, Aboriginal governance, crisis-safety,
youth-safety, Clerk/Supabase security, accessibility, operator training,
service-directory review, call scripts, incident plan, rollback and named human
go/no-go are complete.

## 40-Step Build Sequence

1. Confirm the boundary: Have Your Say is the survey; Service Connector is the
   location app; 1800 Mob Link is the follow-up engine.
2. Correct all project wording so IRAAC is both an advocacy organisation and a
   direct-service provider.
3. Confirm YouthScape wording: real IRAAC program and Aboriginal youth crisis
   centre/bail accommodation pathway seeking funding and implementation support
   unless live status is independently confirmed.
4. Lock Illawarra as the first pilot region and record national expansion as a
   later phase.
5. Define personas: community member, carer/support person, IRAAC operator,
   directory maintainer, program manager, report reviewer and service partner.
6. Write journeys for urgent help, find nearby help, save a service, request
   referral help, record an existing service, request callback and check status.
7. Write operator journeys for callback, safety check, referral handoff,
   follow-up, outcome entry, escalation and closure.
8. Approve taxonomy: housing, bail/court, legal, Centrelink, DFV, youth,
   education, transport, health, mental health, wellbeing, culture, employment
   and community programs.
9. Map taxonomy to external patterns: Ask Izzy/Infoxchange for welfare and
   community services, Healthdirect/NHSD for health, and IRAAC-specific labels
   for local Aboriginal programs.
10. Add ADR 0005 as the technology authority before any code starts.
11. Build Supabase migrations for local service directory tables using
    HSDS-shaped objects.
12. Add synthetic Illawarra seed data across every category, with no private
    contacts and no real client records.
13. Add service classification fields: Aboriginal-led, Aboriginal-specific,
    mainstream, government, crisis-only, referral-only, walk-in, appointment,
    phone, online, outreach and home visit.
14. Add data freshness fields: source, source URL, last checked, checked by,
    confidence, review due, stale reason and correction state.
15. Add outbound links to Ask Izzy and Healthdirect before attempting API
    integrations.
16. Evaluate Infoxchange Service Seeker API/widget access and record cost,
    licensing, branding, correction workflow and data-use constraints.
17. Evaluate Healthdirect/NHSD API/widget access and record API-key, health
    taxonomy, search, data-sharing and support constraints.
18. Implement postcode/suburb search first using the local Supabase directory.
19. Add distance, region, virtual, phone, outreach, home-visit and open-now
    filters without requiring precise GPS.
20. Defer Mapbox until a map adds clear value; if used, start with Search Box or
    Geocoding for suburb/address help, not persistent location tracking.
21. Add crisis routing before ordinary results: 000 for immediate danger,
    13YARN for Aboriginal and Torres Strait Islander crisis support, and
    approved DFV pathways.
22. Add safety UX: quick exit, safe-device wording, shared-phone warning, no
    surprise SMS/calls and a list fallback for people who cannot use maps.
23. Add accessibility acceptance: WCAG 2.2 AA, keyboard, screen reader, large
    tap targets, plain English and low-bandwidth testing.
24. Design Clerk phone OTP with synthetic users and test phone numbers only.
25. Configure Supabase third-party auth for Clerk; do not use deprecated custom
    Clerk JWT-template patterns.
26. Create internal Supabase person profiles mapped from Clerk user IDs, with
    account-linking and duplicate/shared-phone review.
27. Write RLS tests proving Clerk login can access only that person's saved
    services, requests and preferences.
28. Build account home: saved services, current requests, referral status, safe
    contact preferences and help history.
29. Build service detail pages: description, eligibility, documents, contact,
    opening hours, transport, accessibility, last checked and request help.
30. Build referral request flow with consent for sharing details and separate
    consent for follow-up by phone, SMS or email.
31. Write intake cases server-side only, with consent receipt, selected service,
    referral status, operator assignment and audit events.
32. Build operator queue with role-gated access: new requests, due callbacks,
    overdue follow-ups, urgent holds, corrections and escalations.
33. Add operator scripts for ALS/legal, YouthScape/bail, housing, Centrelink,
    DFV, transport, health, mental health and cultural connection.
34. Build referral handoff modes: phone transfer, SMS details, email summary
    and operator note, each blocked unless consent and safety rules allow it.
35. Add follow-up scheduling through Postgres outbox plus Supabase Cron/Queues
    or a Sydney worker; do not schedule directly inside external providers.
36. For SMS, evaluate Sinch MessageMedia and Twilio first, with AWS End User
    Messaging as an AWS-aligned alternative. Require two-way STOP, Australian
    sender rules, webhooks and suppression tests.
37. For voice, begin with manual/human phone logging inside the operator
    console. Evaluate Amazon Connect Sydney only when queues, supervision,
    call recording, live transfers or outbound-campaign controls are needed.
38. Capture outcomes: contacted, attended, helped, partially helped, did not
    help, blocked, unsafe, wrong eligibility, stale listing, no answer, service
    gap and escalation needed.
39. Build de-identified reports from locked snapshots: no-result searches, top
    needs, referral acceptance, outcomes, stale data, service gaps and pilot
    limitations.
40. Run release gates: legal/privacy, Indigenous Data Sovereignty, crisis,
    youth, Clerk/Supabase security, accessibility, operator training,
    service-directory review, scripts approval, incident/rollback and named
    human go/no-go.

## Technology Stack by Element

| Element | Decision | Why |
|---|---|---|
| Web app | Next.js App Router + React + TypeScript | Matches existing platform and Vercel deployment |
| Hosting | Vercel, Sydney-configured where sensitive server code runs | Existing hosting path; keep server work close to Sydney data |
| Database | Supabase Postgres in `ap-southeast-2` | Relational data, RLS, SQL reporting, migrations, restore |
| Community auth | Clerk phone OTP | Low-friction mobile login, subject to privacy gate |
| Staff auth | Existing staff/admin path until separate approval | Avoid casual staff identity migration |
| Directory schema | Open Referral HSDS-inspired local tables | Standard shape for organisations, services and locations |
| External welfare directory | Ask Izzy/Infoxchange outbound links first; API/widget later | Avoid rebuilding national directory maintenance |
| External health directory | Healthdirect/NHSD outbound links first; API/widget later | Use trusted health-service source |
| Location | Postcode/suburb first | Safer and easier than device GPS |
| Maps/geocoding | Mapbox optional later | Useful for search/autocomplete, not required for release one |
| Queue/jobs | Postgres outbox + Supabase Cron/Queues or Sydney worker | Keeps eligibility and suppression inside IRAAC control |
| SMS | Sinch MessageMedia or Twilio after bake-off; AWS End User Messaging as AWS alternative | Need Australian two-way STOP and sender compliance |
| Email | Amazon SES | Receipts, consent confirmations, internal notices |
| Voice | Manual phone logging first; Amazon Connect Sydney later | Avoid heavy contact-centre platform until volume justifies it |
| AI assistance | Advisory only, behind human operator | Summaries/search/scripts only; no crisis decisions |
| Reporting | Supabase locked snapshots + SQL/TypeScript aggregates | Reproducible de-identified evidence |
| Tests | Vitest, Playwright, pgTAP/RLS, accessibility checks | Matches existing platform evidence pattern |

## Completion Standard

The build is not complete when the app can display services. It is complete
only when a person can safely find a service, request help, consent to a
referral, receive a human-safe follow-up, have their outcome recorded, and see
that IRAAC uses that outcome evidence to improve referrals and report service
gaps without exposing private information.

## Research Grounding

- Ask Izzy proves the value of mobile, anonymous, location-based service
  discovery and broad welfare-service categories.
- Infoxchange Service Seeker proves that national directory freshness requires
  an ongoing data-maintenance operation, not just a database table.
- Healthdirect/NHSD proves the value of structured service type, proximity,
  suburb/postcode, coverage, virtual/physical/home-visit and opening-hours
  search for health services.
- Open Referral HSDS is a useful neutral schema reference for organisation,
  service, location and service-at-location objects.
- 13YARN and 000 define crisis-routing boundaries. 1800 Mob Link must route
  crisis needs, not replace crisis services.
- OAIC guidance means referral notes, health, justice, family violence,
  location and Aboriginal identity-related information require minimisation,
  consent, security, accuracy and retention controls.
- Indigenous Data Sovereignty means Aboriginal governance must control what is
  collected, how it is interpreted, who sees it, what is published and how
  service gaps are prioritised.
- Clerk is useful for community login, but real phone numbers require privacy,
  overseas-processing and SMS-subprocessor review before production.

Reference links:

- https://askizzy.org.au/
- https://askizzy.org.au/add-service
- https://www.infoxchange.org/au/products-and-services/service-directory
- https://about.healthdirect.gov.au/what-we-do/portfolio/nhsd
- https://developers.nhsd.healthdirect.org.au/docs/consumer-api/index.html
- https://docs.openreferral.org/en/latest/hsds/overview.html
- https://www.13yarn.org.au/
- https://www.infrastructure.gov.au/media-communications/phone/triple-zero
- https://www.oaic.gov.au/privacy/australian-privacy-principles
- https://www.maiamnayriwingara.org/mnw-principles
- https://clerk.com/docs/guides/development/custom-flows/authentication/email-sms-otp
- https://supabase.com/docs/guides/auth/third-party/clerk
- https://docs.aws.amazon.com/connect/latest/adminguide/regions.html
- https://docs.aws.amazon.com/sms-voice/latest/userguide/two-way-sms.html
- https://www.twilio.com/docs/taskrouter
- https://www.twilio.com/en-us/guidelines/au/sms
- https://support.app.sinch.com/hc/en-us/articles/10526516506383-Opt-out-unsubscribe-management
- https://docs.mapbox.com/api/search/search-box/
