# Runbook: Incident Response

**Owner:** named human (Rhys Coombes until REL-P1 nomination)
**Goal:** contain, investigate, and recover from an incident with clear
ownership and a written record. Never delete evidence.

## Severity levels

| Level | Example | Response |
|---|---|---|
| SEV-1 | PII exposure, DB compromise, outage of survey | Immediate, page the owner |
| SEV-2 | Consent/suppression integrity issue, auth break | Same day |
| SEV-3 | Non-critical bug, degraded dashboard | Next working day |

## First actions (all levels)

1. **Contain before fixing.** If the survey may collect bad data, set the
   release back to `draft` (nothing collectable) — or pause the submit
   endpoint. If keys may be exposed, rotate them (see key-rotation.md).
2. **Write it down.** Open a notes file:
   `docs/incidents/YYYY-MM-DD-<short>.md` with: time, severity, who found
   it, what was affected, what was contained.
3. **Collect evidence** (read-only): `/api/health`, DB row counts
   (`people`, `survey_sessions`, `consent_events`, `audit_events`), recent
   logs (no-PII logger output).
4. **Notify** the named human owner. No public statement without their
   approval.

## Common runbooks

- **Suspected PII exposure** → rotate service role key; revoke any session
  that could have read people/answers; audit `audit_events` for reads;
  document what data was visible and to whom.
- **Consent integrity** → verify `consent_state` vs `consent_events`; do NOT
  hand-edit ledgers (append-only); a correction is a new event, never an
  UPDATE of a merged migration.
- **Spam / bot flood on survey** → rate limiter + client_token idempotency
  are the first line; check duplicate token counts; tighten rate limits;
  never delete rows as cleanup without an audit event.
- **Auth broken** → check JWT secret, staff role claims, `@supabase/ssr`
  cookie handling; test `/admin/login`; roll back the last deploy if a
  deploy preceded it.

## Post-incident (within 5 working days)

1. Root-cause summary in the incident file (what, why, how it was caught).
2. One or more prevention actions (test, runbook update, alert) — tracked
   as a follow-up task.
3. Owner signs off; file stays in `docs/incidents/` permanently.

## Success criteria

- Incident file exists with timeline, containment, evidence.
- No evidence deleted; all corrective actions logged to `audit_events`.
- Follow-up prevention task created and owned.
