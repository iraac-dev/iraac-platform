# IRAAC Platform — Local Development

Documented commands for a fresh machine (PLAT-002 acceptance):

## Prerequisites

- Node 22 (`.nvmrc` — use `nvm use` or `fnm use`)
- npm 10+
- Docker Desktop running (for local Supabase)

## Install

```bash
npm ci
```

## App checks (all must pass locally)

```bash
npm run lint            # eslint
npx tsc --noEmit        # typecheck
npx vitest run          # unit tests
npm run build           # production build (apps/admin)
```

## Local database (Supabase CLI)

```bash
npx supabase start          # boots local stack (Docker)
npx supabase status         # shows local URLs + anon/service keys
npx supabase db reset       # applies all migrations + seed on a fresh DB
npx supabase db lint        # SQL lint
npx supabase test db        # pgTAP database tests
```

Environment: copy `.env.example` to `.env.local` and point `NEXT_PUBLIC_SUPABASE_URL` /
`NEXT_PUBLIC_SUPABASE_ANON_KEY` at the local `supabase status` values.
Never commit `.env*` (only `.env.example`).

## Conventions

- Migrations are append-only, sequential, never rewritten after merge.
- Seed data is synthetic only.
- Tests must pass before any PR is opened.
