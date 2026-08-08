# CODEX CONTINUATION SUPER PROMPT: IRAAC SINGLE NEXT.JS APP

Paste this into Codex, Hermes, Claude Code or another engineering agent when
continuing the IRAAC platform build.

## 1. Mission

Build IRAAC's digital presence as **one Next.js App Router application**:

| Route | Surface | Audience | Access |
|---|---|---|---|
| `/` | IRAAC public website and content pages | Everyone | Public |
| `/app` | MobLink service finder | Community members with an account | Login-first |
| `/admin` | IRAAC staff console | Approved IRAAC staff | Staff auth only |

The goal is one codebase, one Supabase backend, one Vercel deployment and one
canonical domain: `www.iraac-aco.com`.

This replaces the split product direction where the public website remains a
flat static site and the app/admin experience lives elsewhere. The old static
site and the current MobLink prototype are reference material, not the target
architecture.

## 2. Non-Negotiable Route Behaviour

### Public Login Button

The top-right public header **Login** button must route straight to `/app`.

Implementation rules:

- Use a first-party Next.js link or equivalent plain anchor to `/app`.
- Do not point it at a Vercel preview, old static-site placeholder, local port
  or external app domain.
- Do not rely on a fragile JavaScript-only click handler.
- On desktop and mobile, clicking Login must land on `/app`.
- If the visitor is not authenticated, `/app` must show only the MobLink login
  screen, not the service finder.
- If the visitor is authenticated, `/app` must show the MobLink home screen.

Verification:

1. Start the app locally.
2. Open `/` at desktop width and click Login.
3. Confirm the URL is `/app` and the unauthenticated login screen appears.
4. Repeat below the mobile breakpoint with the hamburger/menu state.
5. Repeat after login and confirm the full MobLink app appears.

### Footer Admin Link

The public footer **Admin** link must route straight to `/admin`.

Implementation rules:

- Place Admin in the footer only, preferably near the existing contact/footer
  navigation.
- Do not place Admin in the top navigation.
- Do not expose a shared PIN, static password or public dashboard.
- Do not ship the footer link until `/admin` exists and is protected.
- Clicking Admin must land on `/admin`, where the app performs the staff auth
  check.

Verification:

1. Open `/` at desktop width and click footer Admin.
2. Confirm the URL is `/admin`.
3. Confirm unauthenticated visitors see the staff login surface.
4. Log in as a non-staff account and confirm access denied.
5. Log in as an approved staff account and confirm the admin dashboard appears.
6. Repeat on mobile.

## 3. Read First

Before editing, read:

1. `AGENTS.md`
2. `ROADMAP.md`
3. `PRODUCTION_LAUNCH_PLAN.md`
4. `BOT_TASKS.md`
5. `docs/adr/0005-service-connector-technology-stack.md`
6. `docs/adr/0006-use-supabase-auth-and-sinch-for-service-connector.md`
7. This file
8. `docs/release/CLAUDE_CLI_PRODUCTION_HANDOFF.md`

Treat `ROADMAP.md` as authoritative. It now contains the single Next.js app
consolidation decision under Phase 7/R9.

## 4. Current Reference Material

Use, but do not blindly copy:

- Public content and visual language from the current static website in
  `../iraac-website-live`.
- Existing generated public-site routing patterns from
  `../iraac-website-live/build.py`.
- The MobLink prototype in `apps/admin/src/app/mob-link/page.tsx` and
  `apps/admin/src/app/mob-link/page.module.css`.
- Existing Supabase migrations, survey contracts, tests and release gates in
  this repository.

Historical notes:

- The static site header source of truth was `build.py`, including `LOGIN_URL`
  and `.nav-login`. That matters only while the old site is still live.
- The new target is a Next.js header component with Login linking to `/app`.
- The old MobLink prototype route was `/mob-link`; the new route is `/app`.
- The admin dashboard target is `/admin`.

## 5. Safety And Governance Boundaries

Use synthetic data unless Rhys explicitly authorizes a real-data operation in
the correct environment.

Do not:

- import real contacts;
- send real email, SMS or calls;
- activate production survey collection;
- publish reports;
- expose staff emails, phone numbers, secrets, Supabase service-role keys,
  call transcripts or case notes;
- use a shared admin password or four-digit PIN;
- treat footer Admin as adequate protection;
- imply 1800 Mob Link replaces 000, 13YARN, crisis, legal or medical services.

Preserve:

- channel-specific consent;
- deny-wins suppression;
- Aboriginal-led governance and data sovereignty;
- named staff accounts;
- MFA/audit/offboarding requirements;
- de-identified reporting and publication controls.

## 6. Build Shape

The public website repository has now proved the target route shape in
production: `/`, `/app/` and `/admin/` all live under one Next.js app on
`www.iraac-aco.com`. Continue toward production from that shape; do not
reintroduce the old split static-site architecture.

If keeping work inside the existing repository, create or adapt a single
Next.js App Router package. If starting fresh, create:

```text
iraac-moblink/
  src/
    app/
      layout.tsx
      page.tsx
      about/page.tsx
      programs/page.tsx
      insights/page.tsx
      governance/page.tsx
      support/page.tsx
      news/page.tsx
      contact/page.tsx
      offices/page.tsx
      book-a-call/page.tsx
      survey/page.tsx
      enhanced-bail-article/page.tsx
      app/
        layout.tsx
        page.tsx
        search/page.tsx
        service/[id]/page.tsx
        connected/page.tsx
        survey/page.tsx
        profile/page.tsx
        setup/page.tsx
      admin/
        layout.tsx
        page.tsx
        login/page.tsx
      api/
        auth/callback/route.ts
        admin/create-account/route.ts
    components/
      Header.tsx
      Footer.tsx
      FrontDoor.tsx
      LoginForm.tsx
      QuickExit.tsx
      CrisisBanner.tsx
      BottomNav.tsx
      ServiceCard.tsx
    lib/
      supabase/client.ts
      supabase/server.ts
      auth.ts
      services.ts
      admin.ts
  supabase/
    migrations/
```

Use TypeScript strict mode. Use Supabase Auth and Supabase Postgres. Keep
service-role work server-only.

## 6A. Map, Location And Service Search Stack

Use Supabase PostGIS as the canonical location engine for service-directory
search. The database should store service locations and run distance/radius
queries. The browser should not decide which private records a user is allowed
to see.

Use MapLibre GL JS for the map UI because it is a TypeScript/WebGL map library
that can render custom interactive maps without locking the whole product to a
single paid mapping provider.

Use a server-side geocoding adapter for place search. Start with a synthetic
NSW demo adapter for development. Add Nominatim, Mapbox Search or Google
Places only behind provider-specific environment variables, attribution,
rate/cost controls and privacy review.

Provider notes for future agents:

- MapLibre GL JS docs: `https://maplibre.org/maplibre-gl-js/docs/`.
- Supabase PostGIS docs:
  `https://supabase.com/docs/guides/database/extensions/postgis`.
- MapLibre geocoder control:
  `https://maplibre.org/maplibre-gl-geocoder/`.
- Google Places is pay-as-you-go by SKU:
  `https://developers.google.com/maps/documentation/places/web-service/usage-and-billing`.
- Mapbox has useful free tiers but still needs billing/token governance:
  `https://www.mapbox.com/pricing`.

Never let Google, Mapbox or any places API become the source of truth for
Aboriginal service eligibility, availability, consent, referral status,
follow-up outcome or reporting. They may render maps or help convert user
search text into coordinates. IRAAC data remains in Supabase.

## 7. Public Website Requirements

Routes:

- `/`
- `/about`
- `/programs`
- `/insights`
- `/governance`
- `/support`
- `/news`
- `/contact`
- `/offices`
- `/book-a-call`
- `/survey`
- `/enhanced-bail-article`

Header:

- Dark charcoal background.
- Wordmark `IRAAC.` with ochre dot.
- Main links: Home, Programs, Insights.
- More dropdown: Our Story, Governance & Reporting, Support, News, Contact.
- Top-right Login button linking to `/app`.
- Mobile hamburger below the chosen breakpoint.

Footer:

- Acknowledgement of Country.
- Public navigation links.
- Contact links.
- Admin link to `/admin`, footer only.

Homepage:

- Compact hero.
- Programs grid for MCC, YouthScape, The Crew and DARC.
- Governance/reporting section.
- FrontDoor CTA strip: Book a Call, Visit Office/Drop In, Request Home Visit,
  Have Your Say.

Content:

- Migrate key public content from the static website.
- Keep Book a Call, Drop In, Home Visit and Have Your Say distinct.
- Keep 1800 Mob Link language proposed unless the production service is
  actually approved and live.

## 8. `/app` MobLink Requirements

`/app` is login-first. No service browsing without auth.

Auth methods:

- Google OAuth.
- Phone OTP.
- Email/password and magic link.

Unauthenticated state:

- Show a MobLink login screen only.
- No bottom nav, no service cards, no directory search.
- Include crisis disclaimer and safe wording.

Authenticated screens:

- Home.
- Search.
- Service Detail at `/app/service/[id]`.
- Connected.
- Survey.
- Profile.
- Setup at `/app/setup`.

Mandatory safety:

- Quick Exit button throughout the app.
- Quick Exit executes `window.location.replace("https://google.com")`.
- Home and Search show 13YARN and 000 before ordinary service content.
- 1800 Mob Link follow-up copy says it is not a crisis service.
- Callback requests ask whether it is safe to call the number.

Core flows:

- Search services by text, category and location.
- Show local and national services.
- Show service detail with phone, website, hours, eligibility, accessibility,
  transport, tags, source and last checked date.
- Connect with a service.
- Show connected services and status.
- Offer 1800 Mob Link follow-up on service detail.
- Let users manage safe contact settings and follow-up consent in Profile.

## 9. `/admin` Staff Console Requirements

`/admin` is protected. It is not a public page.

Access behaviour:

- No session: show or redirect to staff login.
- Session without staff marker: access denied.
- Session with staff marker: show staff console.
- The single-app brief treats staff as one equal access level for the console,
  but the implementation must still preserve named accounts, MFA, audit and
  server-side checks.

Dashboard shell cards:

- 1800 Mob Link Operator Queue.
- AI Call Management.
- Messaging and Campaigns.
- Service Directory.
- Create MobLink Account.
- User Management.
- Survey Management.
- Reporting.

Build now:

- Create MobLink Account must be functional.

Create account flow:

1. Staff enters a mobile number.
2. Protected server route verifies staff access.
3. Server uses Supabase Admin API to create or locate the Auth user.
4. Server writes `user_profiles` with `onboarding_source = 'admin_created'`.
5. Server creates a one-time setup token with 24-hour expiry.
6. Server returns a setup link like `/app/setup?token=...`.
7. Do not send a real SMS in this iteration; show the link for testing.

## 10. Data Model

Create append-only migrations for:

- `services`
- `user_profiles`
- `user_connected_services`
- `setup_tokens`

Minimum service fields:

- name
- kind
- provider
- description
- location address/suburb/area
- distance
- phone
- website
- opening hours
- transport
- accessibility
- eligibility
- tags
- status
- category
- crisis flag
- Aboriginal-led flag
- Aboriginal-specific flag
- source/source URL
- coordinates if available
- last checked

Minimum connected-service fields:

- user
- service
- connected date
- status
- follow-up opted in
- follow-up channel
- safe contact preferences
- outcome
- outcome detail
- followed-up date

Seed synthetic Illawarra and national services, including at least:

- South Coast Medical Service
- Waminda
- ALS Nowra
- Cullunghutti Child and Family Centre
- Illawarra AMS
- Illawarra LALC
- Jerrinja LALC
- Aboriginal Housing Office
- Services Australia
- 13YARN
- YouthScape
- ALS Wollongong
- Mission Australia Wollongong
- Link-Up NSW
- Karitane
- Grand Pacific Health
- Headspace Wollongong

Add RLS:

- Authenticated users can read public service entries.
- Users can read/update only their own profile.
- Users can read/update only their own connected services.
- Setup tokens are server-read/write only.
- Staff/admin routes use server-side authorization and never expose service
  role keys to the browser.

## 11. Build Order

1. Inspect current repo shape and decide whether to adapt the existing
   Next.js app package or scaffold a new `iraac-moblink` app.
2. Create the App Router route structure for `/`, `/app` and `/admin`.
3. Build shared layout, global styles and Supabase clients.
4. Build the public Header with Login linking to `/app`.
5. Build the public Footer with Admin linking to `/admin`.
6. Build the public homepage and priority content pages.
7. Build Supabase migrations, RLS and synthetic seed data.
8. Build auth helpers and callback route.
9. Build the `/app` auth gate and LoginForm.
10. Build MobLink Home, Search, Service Detail, Connected, Survey, Profile and
    Setup screens.
11. Add Quick Exit and Crisis Banner to the required app screens.
12. Build service query/connect helpers.
13. Build `/admin` staff auth gate and login surface.
14. Build admin dashboard shells.
15. Build functional Create MobLink Account tool and API route.
16. Add focused tests for auth gates, route links, service queries and setup
    token behaviour.
17. Run lint, typecheck, tests, build and database tests.
18. Start local app and verify desktop/mobile routes in a real browser.
19. Deploy to a preview/temporary Vercel URL first.
20. Verify `/`, `/app`, `/admin`, Login click and footer Admin click on the
    preview.
21. Only after verification, move `www.iraac-aco.com` to the single Next.js
    app or update the old static links as an interim bridge.

## 12. Verification Checklist

Public site:

- `/` renders with hero, programs, governance and FrontDoor CTAs.
- All public content routes resolve.
- Header Login visibly appears and links to `/app`.
- Footer Admin visibly appears and links to `/admin`.
- Desktop and mobile navigation work.

Login route:

- Clicking Login from `/` lands on `/app`.
- Unauthenticated `/app` shows only login.
- Google auth returns to `/app`.
- Phone OTP flow works in the configured environment.
- Email/password or magic link flow works.
- Logout returns to login.

MobLink:

- Quick Exit is visible and works.
- Crisis content appears above ordinary content on Home and Search.
- Services load from Supabase, not from hardcoded UI-only data.
- Search and filters work.
- Service details render.
- Connect flow creates a connected-service record.
- Connected tab shows created connections.
- Follow-up opt-in is visible and records the intended state.
- Profile stores safe contact preferences.
- Setup token accepts valid tokens and rejects invalid, used or expired tokens.

Admin:

- Clicking footer Admin lands on `/admin`.
- Unauthenticated users see staff login.
- Non-staff users see access denied.
- Staff users see the dashboard.
- Create MobLink Account creates/locates the user, writes profile, creates
  token and returns setup link.

Database:

- Migrations are append-only.
- RLS is enabled and tested.
- Service-role keys stay server-side.
- Synthetic seed data is loaded.

Deployment:

- Build succeeds.
- Preview deployment resolves all routes.
- Browser verification captures route proof for Login and Admin.
- Production domain is moved only after preview proof.

## 13. Commands To Run

Use the repo's actual package manager and workspace scripts. Typical commands:

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

If the app uses a dev server for browser QA, start it and keep it running until
verification is complete.

## 14. Completion Standard

The work is complete when a tester can:

1. Visit `www.iraac-aco.com`.
2. Click Login in the top-right header and land at `/app`.
3. See only the MobLink login screen when unauthenticated.
4. Log in and use the service finder.
5. Search services near Nowra.
6. Open a service detail page.
7. Connect with a service.
8. Sign up for follow-up.
9. See crisis information and use Quick Exit.
10. Click Admin in the footer and land at `/admin`.
11. See staff login when unauthenticated.
12. Log in as staff and create a MobLink account.
13. Use the returned setup link at `/app/setup`.
14. Confirm everything runs from one Next.js app, one Vercel project and one
    domain.

Do not claim completion from code changes alone. Completion requires build/test
evidence and browser route proof for both Login -> `/app` and Admin -> `/admin`.
