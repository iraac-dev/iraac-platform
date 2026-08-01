# Runbook: Backup & Restore

**Owner:** named human (to be nominated at REL-P1)
**Goal:** recover the platform database to a known-good point in time.
**Drill:** `./scripts/backup-restore-drill.sh` (local, synthetic) — must pass.

## Backup

| What | How | When |
|---|---|---|
| Schema + data (local) | `./supabase-cli.sh db dump` (or `pg_dump` on the container) | Before every migration push; weekly |
| Production data | Supabase dashboard → Database → Backups (PITR if enabled) + scheduled `pg_dump` via the CLI to encrypted storage | Daily minimum; before any release |
| Secrets / env | 1Password (never chat, never repo) | On rotation; on any change |

Backup file naming: `iraac-<env>-<date>.sql.gz`, stored outside the repo
(e.g. `~/Backups/iraac/` or object storage with encryption).

## Restore

1. Stop writes: pause the survey submit endpoint (or set the release to
   `draft`) so no new rows land mid-restore.
2. Take a **pre-restore snapshot** of the current state (so restore is
   reversible).
3. Restore the target backup (PITR in the dashboard, or apply a `pg_dump`
   file). For the local stack the drill shows the exact mechanics:
   `truncate table <t> cascade;` then load the dump.
4. Verify: run the pgTAP suites (`supabase test db`), check row counts on
   `people`, `survey_sessions`, `consent_events`, `audit_events`.
5. Resume writes and confirm `/api/health` returns `{ ok: true, db: "up" }`.

## Success criteria

- Restore drill passes (exit 0).
- Post-restore row counts match the backup's snapshot.
- RLS + consent suites green after restore (nothing silently dropped).

## Rollback of a restore

Re-apply the pre-restore snapshot taken in step 2.
