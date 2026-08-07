# ADR 0003: Keep Supabase for the 1800 Mob Link backbone

- Status: proposed
- Date: 2026-08-07

## Decision

Keep Supabase Postgres in `ap-southeast-2` (Sydney) as the IRAAC system of
record for 1800 Mob Link planning and prototype work.

Do not move the production backbone to Convex unless a later ADR proves the
requirements for Australian data residency, Indigenous Data Sovereignty,
auditable access control, SQL/reporting, export, restore, lock-in and cost.

## Why

1800 Mob Link needs a governed longitudinal record: service-directory entries,
intake cases, referral handoffs, consent receipts, suppression events,
follow-up outcomes, escalation records and report snapshots. Those records need
relational integrity, append-only migrations, SQL aggregates, RLS-style
enforcement, backup/restore evidence and a clear Australian-region deployment.

Supabase already matches the platform direction and has Sydney region support,
Postgres, Row Level Security and local migration/test workflows. Convex is a
strong realtime TypeScript platform, but its current public cloud regions are
US East and EU West, and it does not use SQL/Postgres. That makes it a poor
default for IRAAC's sensitive production system of record.

## Allowed experiment

Convex may be used for an isolated synthetic prototype or internal realtime
operator-console experiment if:

- no production personal, contact, referral, transcript or outcome data is
  stored there;
- the data-flow map identifies exactly what leaves Supabase;
- export and deletion are tested; and
- a human reviewer accepts the experiment boundary before it is connected to
  any real workflow.

## References

- Supabase regions: https://supabase.com/docs/guides/platform/regions
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Convex regions: https://docs.convex.dev/production/regions
- Convex database overview: https://docs.convex.dev/database/overview
