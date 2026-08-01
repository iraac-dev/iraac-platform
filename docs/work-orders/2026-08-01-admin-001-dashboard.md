---
id: IRAAC-ADMIN-001
title: Invite-only staff dashboard — masked submissions, consent/suppression timeline, audit log, access review
owner: Rhys Coombes
implementer: hermes (agent_build_test)
independent_reviewer: rhy-collab
risk: high
data_classification: personal
depends_on: [SEC-001, CONS-001]
---

# ADMIN-001 — Staff dashboard

## Goal

An invite-only dashboard where named, least-privilege staff can review survey
submissions with personal details masked, see a per-person consent/suppression
timeline, browse the audit log, and review staff access. A shared/generic
mailbox must never become admin without named custodianship.

## Non-goals

- No outbound campaigns or sending (MAIL-* / P2).
- No consumer-facing UI changes (this is staff-only).
- No production data — synthetic fixtures only.
- No real invitations yet: SEC-001's named-invitation flow is consumed, but
  inviting real people is a human action gated by REL-P1.

## Files

- `apps/admin/src/app/admin/**` — dashboard routes (login-gated, staff role)
- `apps/admin/src/lib/admin-*.ts` — server-only queries (service role,
  staff/auditor RLS respected)
- `supabase/tests/admin.test.sql` — pgTAP for dashboard read paths
- `.env.example` — any new server-only env vars

## Acceptance tests

1. Dashboard requires an authenticated `iraac_staff` (or `iraac_auditor`
   read-only) session; anonymous access returns 401/redirect.
2. Submissions list shows answers with PII masked by default (name/email/
   phone hidden until a staff member explicitly reveals, audit-logged).
3. Consent/suppression timeline per person shows grants, revocations and
   withdrawals with timestamps, channel and wording version.
4. Audit log is browsable read-only; nothing in it is mutable.
5. Staff access review lists named staff + roles; no shared/generic mailbox
   role exists (enforced by policy + test).
6. Quality gate green: lint, typecheck, vitest, `next build`; pgTAP suite
   (18 RLS + 14 consent + admin additions) passes 100%.

## Human decisions

- Which named humans get initial staff access (Rhys nominates before any
  real invite).
- Mask-reveal policy: who may reveal PII, and whether it's logged per view.
- Whether auditor role needs dashboard access in this package.

## Rollback

Revert the PR; additive routes only, no destructive migrations.

## Evidence

- PR link, CI run link, pgTAP output, quality-gate output — added before
  completion.
