# ADR 0006: Use Supabase Auth and Sinch MessageMedia for Service Connector

- Status: proposed
- Date: 2026-08-07

## Decision

Use **Supabase Auth** as the primary community-login layer for the
Location-based Aboriginal Service Connector.

Use **Sinch MessageMedia** as the SMS provider for 1800 Mob Link
transactional messages, callback reminders, consent confirmations and
follow-up messages.

## Why Supabase Auth is selected

The Service Connector will handle sensitive Aboriginal community, justice,
health, family violence, location and referral information. The safest first
choice is the auth system already attached to the Sydney Supabase project and
the existing RLS model.

Supabase Auth supports phone OTP, MFA and auth hooks. The Send SMS Hook can
route auth SMS through an approved provider, which means IRAAC can use the same
Australian SMS compliance pathway for login and follow-up messaging.

## Why Sinch MessageMedia is selected

IRAAC needs Australian SMS compliance, two-way replies, STOP handling,
delivery receipts, webhooks, local support and a simple operational path for
staff. Sinch MessageMedia is Australia-oriented, has built-in
unsubscribe/contact-management workflows and is already positioned around local
business messaging.

## Implementation rules

- Use Supabase Auth for community accounts and staff accounts unless a later
  identity ADR says otherwise.
- Use Supabase phone OTP with a custom Send SMS Hook routed through Sinch
  MessageMedia after legal, privacy and sender-registration approval.
- Do not use a branded alphanumeric SMS sender until the sender ID is
  registered under the Australian SMS Sender ID Register.
- Prefer a reply-capable Australian number for service and follow-up SMS so
  STOP can work naturally.
- Store consent, contact preferences, suppressions, delivery events and
  follow-up eligibility in Supabase, not inside the SMS provider.
- Treat SMS delivery as a channel, not consent. A successful OTP or delivered
  message never creates permission for marketing, survey chase or follow-up.
- Require immediate, idempotent STOP handling in Supabase before any production
  SMS pilot.

## Acceptance tests before production SMS

- Sender ID registration position is documented.
- Test messages deliver to Australian mobile numbers.
- Replies arrive through webhooks.
- STOP, STOP ALL and free-text stop requests suppress future SMS immediately.
- Delivery receipts are logged.
- Failed delivery does not trigger repeated unsafe retries.
- Safe-contact preferences block messages at unsafe times or unsafe channels.
- Provider dashboard state and Supabase suppression state reconcile.
- Incident rollback can disable all outbound SMS quickly.

## References

- Supabase phone login: https://supabase.com/docs/guides/auth/phone-login
- Supabase Send SMS Hook: https://supabase.com/docs/guides/auth/auth-hooks/send-sms-hook
- Supabase regions: https://supabase.com/docs/guides/platform/regions
- Supabase security and data residency: https://supabase.com/security
- Sinch MessageMedia unsubscribe management: https://support.messagemedia.com/hc/en-us/articles/4413582520463-Unsubscribing-and-re-subscribing-contacts
- Sinch opt-out management: https://support.app.sinch.com/hc/en-us/articles/10526516506383-Opt-out-unsubscribe-management
- ACMA SMS Sender ID Register: https://www.acma.gov.au/sms-sender-id-register
