# Runbook: Key Rotation

**Owner:** named human (Rhys Coombes until REL-P1 nomination)
**Goal:** replace any platform credential with zero downtime and no
credential reuse in logs, chat, or repo.

## Which keys rotate

| Credential | Where it lives | Rotation trigger |
|---|---|---|
| Supabase service role (`sb_secret_…`) | `apps/admin/.env.local` + 1Password | Suspected leak, quarterly, or REL-P1 |
| Supabase anon/publishable (`sb_publishable_…`) | `NEXT_PUBLIC_*` env + 1Password | Suspected leak |
| Supabase CLI access token (`sbp_…`) | `~/.supabase-access-token` | Leak or 90 days |
| Supabase DB password | `~/.supabase-db-password` + 1Password | Leak or quarterly |
| GitHub PAT | 1Password | Leak; prefer `gh` OAuth/SSH keys |
| JWT signing secret | Supabase dashboard | Suspected compromise only (rotating breaks all sessions) |

## Procedure

1. Create the new key in the dashboard (Settings → API / Access Tokens).
2. **Never log or paste the new key into chat.** Write it straight into the
   secret store: `1Password` for humans, `apps/admin/.env.local`
   (git-ignored) for the app.
3. Verify the app still connects: `/api/health` → `{ ok: true, db: "up" }`;
   one anonymous survey submit succeeds; one staff login succeeds.
4. Revoke the old key **after** verification.
5. Record the rotation in `audit_events` via a staff action (or note in the
   REL-P1 release log). Do not record the key value anywhere.

## Rotation of the JWT signing secret (high impact)

- Rotate only during a maintenance window.
- Every existing session is invalidated; all staff must re-login.
- Run the full quality gate + DB suites afterwards.

## Success criteria

- Old key revoked, new key in 1Password + git-ignored env only.
- Health + survey submit + staff login all green with the new key.
- `grep -rInE "(sb_secret_|sbp_|password\\s*[:=])"` over the repo finds
  nothing (except `.example`).
