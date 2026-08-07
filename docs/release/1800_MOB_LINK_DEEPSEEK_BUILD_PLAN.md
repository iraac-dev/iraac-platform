# IRAAC Phase 7/R9 DeepSeek Build Plan

## Purpose

This plan is for building the **Location-based Aboriginal Service Connector**
and **1800 Mob Link follow-up engine**. It is separate from the Have Your Say
survey.

Have Your Say asks community members what should change. The Service Connector
helps a person find, request and track services near them. The 1800 Mob Link
call centre then follows up: referral -> check-in -> outcome -> referral
improvement -> government/community reporting.

## Product Frame

IRAAC is both an advocacy organisation and a service provider. YouthScape, The
Crew, DARC and MCC are direct-service programs or program pathways, while the
listening/reporting loop gives IRAAC evidence to take to government. The
Service Connector must support both sides: help the person now, and generate
safe evidence about whether services are actually working.

## Core Decisions

- Clerk is selected for community login, starting with verified mobile-number
  sign-in where approved.
- Supabase Postgres in Sydney remains the system of record.
- Clerk sessions must be checked server-side and mapped into Supabase RLS-aware
  claims.
- Do not rebuild a national service directory from scratch. Build IRAAC's local
  Aboriginal-led front door and integrate or link to existing trusted
  directories where possible.
- Start with suburb/postcode search before precise device location.
- Use synthetic data until legal, privacy, cultural-governance, youth-safety,
  crisis-routing and call-centre scripts are approved.

## 40-Step Build Process

1. Confirm the product boundary in writing: Have Your Say is the survey;
   Service Connector is the location-based service app; 1800 Mob Link is the
   follow-up engine.
2. Correct every project document that says IRAAC is not a service provider.
   Replace it with the dual model: advocacy plus direct-service programs.
3. Write the YouthScape product description carefully: real IRAAC program,
   Aboriginal youth crisis centre and bail accommodation pathway, seeking
   funding and implementation support unless live operations are confirmed.
4. Define the first pilot geography as Illawarra only.
5. Define the first user groups: community member, carer/support person,
   IRAAC operator, service-directory maintainer, program manager and report
   reviewer.
6. Define the main community journeys: urgent help, find nearby help, save a
   service, request referral help, record an existing service, request a
   callback and check referral status.
7. Define the main operator journeys: receive referral task, call back, confirm
   safety, update referral status, record outcome, escalate and close.
8. Define the service taxonomy: housing, bail/court, legal, Centrelink,
   domestic/family violence, youth, education, transport, health, mental
   health, social and emotional wellbeing, cultural connection, employment and
   local community programs.
9. Map the taxonomy to existing directory patterns: Ask Izzy/Infoxchange for
   welfare/community services, Healthdirect/NHSD for health services and local
   IRAAC labels for culturally specific pathways.
10. Define the minimum service-directory schema using human-service directory
    concepts: organisation, service, location, service-at-location, eligibility,
    opening hours, delivery method, referral requirements and last checked.
11. Separate public service fields from private referral fields.
12. Add classification fields: Aboriginal-led, Aboriginal-specific, mainstream,
    government, crisis-only, referral-only, walk-in, appointment, phone, online,
    outreach and home visit.
13. Create an Illawarra synthetic seed directory with no private contact data.
14. Add outbound links to trusted broad directories first, rather than copying
    their records.
15. Evaluate Infoxchange/Ask Izzy API or widget access for welfare/community
    service discovery.
16. Evaluate Healthdirect/NHSD API or widget access for health service
    discovery.
17. Decide whether Mapbox is needed for release one. Default to postcode/suburb
    search first, with list results and a map only when safe and useful.
18. Build the first location model: suburb, postcode, region, distance radius,
    service catchment and virtual/phone availability.
19. Add "not sure where to start" triage for people who cannot pick a category.
20. Add crisis routing before ordinary results: 000 for immediate danger,
    13YARN for Aboriginal and Torres Strait Islander crisis support, and other
    approved crisis pathways such as domestic/family violence services.
21. Add safety UI for domestic and family violence: quick exit, safe-device
    wording, no surprise messages and plain warnings about shared phones.
22. Add accessibility requirements: mobile-first, WCAG 2.2 AA, keyboard use,
    screen-reader labels, large tap targets, plain English and low-bandwidth
    behaviour.
23. Design Clerk community login: phone OTP first, email optional, no password
    requirement unless approved, and clear account-recovery rules.
24. Design account linking so one person can later add email, phone or other
    verified contact methods without creating duplicate records.
25. Design the Clerk-to-Supabase trust boundary: server verifies Clerk session,
    creates internal person profile, maps safe claims to RLS and never exposes
    privileged database keys to the browser.
26. Add privacy controls for location: ask suburb/postcode first, request
    device location only with clear purpose, store only what is needed, and
    let the user remove saved location.
27. Build the synthetic account home: saved services, current requests,
    referral status, safe contact preferences and help/history.
28. Build the synthetic service search: category, location, distance, open now,
    Aboriginal-specific, walk-in, phone, online and home-visit filters.
29. Build the service detail page: what it does, who can use it, how to contact,
    documents needed, opening hours, transport notes, accessibility, last
    checked and "request IRAAC help".
30. Build the referral request flow: selected service, reason for contact,
    safe contact method, permission to share details, permission for follow-up
    and urgent-risk check.
31. Store each request as an intake case with consent receipt, selected service,
    referral status, operator assignment and audit trail.
32. Build the 1800 Mob Link operator queue: new requests, due callbacks,
    overdue follow-ups, urgent holds, service corrections and escalations.
33. Build operator scripts for common pathways: ALS/legal, YouthScape/bail,
    housing, Centrelink, domestic/family violence, transport, health and
    cultural connection.
34. Build referral handoff: phone transfer, SMS details, email summary or
    operator note, only where consent and safety rules allow it.
35. Schedule first follow-up automatically after the approved interval, such as
    two to five days, with safe-time and no-surprise-contact rules.
36. Ask outcome questions: did the service contact you, did you attend, did it
    help, what blocked you, what could improve, do you need another service and
    should IRAAC escalate?
37. Convert outcome answers into service-improvement signals: stale listing,
    wrong eligibility, no answer, long delay, referral rejected, helped,
    partially helped, unsafe, needs escalation or service gap.
38. Build the service freshness workflow: show last checked, flag stale records,
    allow "suggest an edit", route changes to staff review and preserve source
    evidence.
39. Build de-identified reporting: searches with no result, most requested
    needs, referral acceptance, follow-up completion, outcome rates, service
    gaps, stale data and Illawarra pilot limitations.
40. Run pilot readiness gates before any real launch: legal/privacy review,
    Aboriginal-led governance review, crisis-safety review, youth-safety review,
    Clerk/Supabase security test, accessibility test, operator training,
    service-directory review, call scripts, incident plan, rollback plan and
    named human go/no-go.

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
