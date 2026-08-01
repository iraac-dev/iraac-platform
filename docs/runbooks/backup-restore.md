# Runbook: Backup & Restore

**Owner:** operations role assigned in the private access register
**Goal:** recover the platform database to a known-good point in time.
**Drill:** `./scripts/backup-restore-drill.sh` — requires separate source and disposable restore databases.

## Backup

| What | How | When |
|---|---|---|
| Schema + data | `pg_dump --format=custom --no-owner --no-acl "$DATABASE_URL"` | Before every migration push; weekly |
| Production data | Supabase dashboard → Database → Backups (PITR if enabled) + scheduled `pg_dump` via the CLI to encrypted storage | Daily minimum; before any release |
| Secrets / env | 1Password (never chat, never repo) | On rotation; on any change |

Backup file naming: `iraac-<env>-<date>.sql.gz`, stored outside the repo
(e.g. `~/Backups/iraac/` or object storage with encryption).

## Restore

1. Stop writes: pause the survey submit endpoint (or set the release to
   `draft`) so no new rows land mid-restore.
2. Take a **pre-restore snapshot** of the current state (so restore is
   reversible).
3. Restore the target backup using PITR in the dashboard or `pg_restore` into
   a separate, explicitly confirmed disposable database whose name ends in
   `_restore`, `_rehearsal` or `_test`. The drill compares PostgreSQL system
   identity plus database name, not merely URL text. Never rehearse by
   truncating the source database.
4. Verify: run the pgTAP suites (`supabase test db`), check row counts on
   `people`, `survey_sessions`, `consent_events`, `audit_events`.
5. Resume writes and confirm `/api/health` returns `{ ok: true, db: "up" }`.

## Success criteria

- Restore drill passes (exit 0).
- Every public-table count and content fingerprint matches the source.
- Schema objects (including policies, functions and triggers) match and the
  full pgTAP suite passes against the restored database.
- RLS + consent suites green after restore (nothing silently dropped).

## Rollback of a restore

Re-apply the pre-restore snapshot taken in step 2.
