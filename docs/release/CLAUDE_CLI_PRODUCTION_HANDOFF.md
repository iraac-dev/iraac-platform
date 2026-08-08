# Claude CLI Production Handoff: IRAAC Platform To Production

Audience: Claude Command Line Interface powered by DeepSeek V4 Flash.

Date: 2026-08-08.

Use this as the practical build book for taking IRAAC from the current visual
Next.js routes to a production-ready public site, MobLink app and staff admin
system.

## 1. Current State

The live public website repository has been converted to a single Next.js App
Router app:

- `/` public website.
- `/app/` visual 1800 Mob Link prototype.
- `/admin/` visual staff dashboard prototype.

Verified live behavior:

- Header `Login` links to `/app/`.
- Footer `Admin` links to `/admin/`.
- `/programs/` and `/insights/` still resolve.

The visual routes are not production systems yet. Treat them as proof that the
single-app route shape works. The production work is Supabase Auth, staff
authorization, RLS, PostGIS service search, referral tracking, reporting,
audit, backups, incident controls and release gates.

## 2. Architecture

Use one Next.js App Router application on `www.iraac-aco.com`.

Use Supabase as the system of record:

- Supabase Auth for community and staff login.
- Supabase Postgres for profiles, services, referrals, outcomes, consent,
  audit and reporting snapshots.
- Supabase Row Level Security everywhere.
- Supabase PostGIS for service locations and distance queries.

Use MapLibre GL JS for the map UI. MapLibre is a TypeScript/WebGL library for
interactive browser maps. Keep map rendering separate from service truth.

Use a provider adapter for tiles/geocoding:

- Default map UI: MapLibre GL JS.
- Default service distance search: Supabase PostGIS.
- Geocoding/search provider: server-side adapter.
- Possible adapters: static NSW demo adapter, Nominatim if policy allows,
  Mapbox Search, Google Places.
- Never let Mapbox, Google or any provider become the source of truth for
  IRAAC service eligibility, referral outcomes or reporting.

Research basis:

- MapLibre GL JS docs: `https://maplibre.org/maplibre-gl-js/docs/`.
- Supabase PostGIS docs:
  `https://supabase.com/docs/guides/database/extensions/postgis`.
- MapLibre geocoder docs: `https://maplibre.org/maplibre-gl-geocoder/`.
- Google Places billing docs:
  `https://developers.google.com/maps/documentation/places/web-service/usage-and-billing`.
- Mapbox pricing docs: `https://www.mapbox.com/pricing`.

## 3. Route Contract

Public:

- `/`
- `/about/`
- `/programs/`
- `/insights/`
- `/governance/`
- `/support/`
- `/news/`
- `/contact/`
- `/offices/`
- `/book-a-call/`
- `/survey/`
- `/enhanced-bail-article/`

MobLink:

- `/app/`
- `/app/search/`
- `/app/map/`
- `/app/service/[id]/`
- `/app/connected/`
- `/app/profile/`
- `/app/setup/`

Admin:

- `/admin/`
- `/admin/login/`
- `/admin/services/`
- `/admin/referrals/`
- `/admin/accounts/`
- `/admin/reports/`
- `/admin/audit/`

The public header Login button must always route directly to `/app/`.

The public footer Admin link must always route directly to `/admin/`.

## 4. Production Build Sequence

Follow this order.

1. Stabilize the current Next.js app and tests.
2. Add Playwright coverage for Login -> `/app/` and Admin -> `/admin/`.
3. Add Supabase client/server/admin helpers.
4. Add `.env.local.example` with no secrets.
5. Add auth callback route.
6. Make `/app/` login-first.
7. Make `/admin/` staff-only.
8. Add staff profile and membership tables.
9. Add audit tables and helper.
10. Enable PostGIS.
11. Add service directory tables.
12. Add service location tables.
13. Add service category and eligibility metadata.
14. Add RLS.
15. Add synthetic seed data.
16. Add nearby service SQL function.
17. Add `/api/app/services/search`.
18. Build service list search.
19. Build MapLibre map view.
20. Build geocoder adapter.
21. Build service detail page.
22. Build connect/request-help flow.
23. Build referral tables.
24. Build staff referral queue.
25. Build connected-services page.
26. Build safe-contact preferences.
27. Build setup-token account flow.
28. Build `/admin/accounts`.
29. Build reporting snapshots.
30. Build de-identified reports with small-cell suppression.
31. Add incident, restore, offboarding and key-rotation runbooks.
32. Run database tests.
33. Run browser tests.
34. Verify mobile screenshots.
35. Deploy preview.
36. Verify preview.
37. Deploy production.
38. Verify production.

## 5. Database Minimum

Create append-only migrations for:

- `user_profiles`
- `staff_profiles`
- `staff_memberships`
- `services`
- `service_locations`
- `service_categories`
- `service_eligibility_tags`
- `user_connected_services`
- `service_connection_requests`
- `referrals`
- `referral_events`
- `setup_tokens`
- `audit_events`
- `report_snapshots`

Every table with user, staff, contact, consent, referral, case or reporting
data must have RLS enabled before production.

## 6. Service Search Requirements

Search must work with manual location entry and without browser geolocation.

Location permission must be requested only after a user action and only after
plain-language explanation.

PostGIS should calculate distance and radius. The browser should not calculate
which private records a person is allowed to see.

The API must validate coordinates, radius and category filters.

The API must return published user-visible service data only.

The API must not return staff notes, private provenance notes or hidden review
fields.

## 7. Map UI Requirements

Use a client component for MapLibre.

Load MapLibre CSS where the map is used.

Add:

- markers;
- list/map synchronized selection;
- search-this-area button;
- category filters;
- selected-service mobile sheet;
- desktop split view;
- keyboard-accessible list fallback;
- loading, empty and error states;
- crisis support outside the map.

Verify the map is not blank using browser screenshots.

## 8. Admin Requirements

`/admin/` must not be a public dashboard.

Unauthenticated users see staff login.

Authenticated non-staff users see access denied.

Approved staff see the dashboard.

Every staff action that affects accounts, services, referrals, reports or roles
must write an audit event.

The first functional staff tool should be Create MobLink Account:

1. Staff enters phone/email.
2. Server verifies staff role.
3. Server creates or finds Supabase Auth user.
4. Server writes profile.
5. Server creates one-time setup token.
6. Server returns `/app/setup?token=...`.
7. No real SMS is sent until a later approved provider pass.

## 9. Verification Gate

Before calling anything production-ready, prove:

- `npm run build` passes.
- RLS tests pass.
- Browser tests pass.
- Login click lands on `/app/`.
- Admin click lands on `/admin/`.
- `/app/` is login-first.
- `/admin/` is staff-only.
- Map renders on desktop and mobile.
- Search near Nowra returns seeded published services.
- Referral creation is user-scoped.
- Staff account creation is server-only and audited.
- No secrets are in git or browser bundles.
- Backups, restore drill, offboarding and incident response are documented.

## 10. Do Not Do

Do not reintroduce the split static-site architecture.

Do not hard-code production users or staff.

Do not send real messages.

Do not import real contacts.

Do not put provider API keys in client code unless they are explicitly public,
restricted and approved for that provider.

Do not claim 1800 Mob Link is live until the production release gate passes.

Do not treat a visual dashboard as staff protection.
