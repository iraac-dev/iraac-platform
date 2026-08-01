# Runbook: Access & Offboarding

**Owner:** named human (Rhys Coombes until REL-P1 nomination)
**Goal:** remove a person's access completely and promptly, and prove it.
A shared/generic mailbox must NEVER hold an admin role — all access is per
named person.

## Who has access

| System | Account type | Role |
|---|---|---|
| GitHub `iraac-dev` org | Named personal account | Admin (Rhys), others by invitation |
| Supabase `iraac-supabase` | Named email | Owner (Rhys); staff via `iraac_role` claim |
| Vercel project | Named account | Owner (Rhys) |
| Platform dashboard | Supabase Auth user | `iraac_staff` or `iraac_auditor` (app_metadata) |
| Hetzner VPS | Named keys | root (Rhys) |

## Offboarding procedure

1. **Dashboard:** sign in as admin, disable the user's Supabase Auth account
   (`DELETE /auth/v1/admin/users/{id}` via service role or dashboard
   → Authentication → Users → delete). This kills the session immediately.
2. **GitHub:** org → People → remove the member (or demote to read-only if
   they need repo access for review).
3. **Supabase project:** remove from project members; confirm no API keys
   are shared with their account.
4. **Vercel:** remove from the project team.
5. **VPS:** remove their SSH key from `~/.ssh/authorized_keys`; revoke any
   RustDesk/NoMachine password; kill their sessions.
6. **Verify:** attempt a dashboard login with their credentials → must fail.
   Check `audit_events` for their last actions.
7. **Record:** log the offboarding (who, when, which systems) in the
   REL-P1 ops log. Do not store the reason's sensitive detail in chat.

## Lost-MFA drill

1. Named human verifies identity out-of-band (call/video, not email alone).
2. Reset the user's MFA in Supabase dashboard (Authentication → Users →
   their user → reset MFA). For GitHub: owner can reset via org settings.
3. User sets a new authenticator immediately.
4. Log the reset. The user's dashboard role is unchanged — least privilege
   is preserved.

## Success criteria

- Removed user cannot log into dashboard, GitHub org, Vercel, or VPS.
- No shared/generic mailbox appears in any role list (`iraac_*` roles only).
- Offboarding and MFA resets are recorded in the ops log.
