# ADR 0004: Use Clerk for community Service Connector login

- Status: proposed
- Date: 2026-08-07

## Decision

Use Clerk for the community-facing login layer of the Location-based Aboriginal
Service Connector, starting with verified mobile-number sign-in where approved.
Keep Supabase Postgres as the system of record and enforcement layer.

This decision does not automatically replace the current staff/admin
authentication path. Staff and administrator access still require named
accounts, MFA, local membership checks, audit and offboarding controls.

## Why

The Service Connector needs a low-friction account experience for community
members who may be using mobile phones, shared devices, low-bandwidth
connections or assisted workflows. Clerk gives a polished Next.js login layer,
phone OTP options and account-management UI faster than rebuilding those
pieces from scratch.

Supabase remains the authority for service requests, referrals, consent,
suppression, follow-up outcomes, report snapshots and access rules. Clerk is
the front door, not the filing cabinet.

## Required architecture

- Use Supabase's current third-party Clerk integration rather than deprecated
  legacy JWT-template approaches.
- Verify Clerk sessions server-side.
- Map Clerk identity to an internal IRAAC person profile.
- Keep service-role keys server-side only.
- Write Supabase RLS policies that depend on stable identity claims plus local
  membership/profile rows, not on client-side trust.
- Do not treat a verified phone number as permission for SMS outreach.
- Do not auto-link community and staff accounts by phone number alone.
- Test duplicate phones, shared phones, changed numbers, withdrawal, deletion,
  suppression and account-recovery edge cases.

## Privacy gate

Before production use with real community phone numbers, IRAAC must approve the
Clerk data-flow map, overseas processing position, SMS-subprocessor handling,
retention/deletion process, export process, breach/incident path and consent
copy. Synthetic users and Clerk test phones are allowed before that gate.

## References

- Clerk phone/email OTP: https://clerk.com/docs/guides/development/custom-flows/authentication/email-sms-otp
- Clerk phone number object: https://clerk.com/docs/nextjs/reference/types/phone-number
- Clerk + Supabase integration: https://clerk.com/docs/guides/development/integrations/databases/supabase
- Supabase Clerk third-party auth: https://supabase.com/docs/guides/auth/third-party/clerk
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Clerk DPA: https://clerk.com/legal/dpa
