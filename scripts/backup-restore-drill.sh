#!/usr/bin/env bash
# OPS-001 backup/restore drill against the LOCAL Supabase stack.
#
# Proves the documented restore procedure on synthetic data: snapshot the
# people table, corrupt it, restore from the snapshot, verify row counts.
# Never touches production. Run from the repo root:
#
#   ./scripts/backup-restore-drill.sh
#
# Exit 0 = drill passed. Prints PASS/FAIL per step.
set -euo pipefail

DB_CONTAINER="supabase_db_iraac-platform"
DB_USER="postgres"
DB_NAME="postgres"

echo "== OPS-001 backup/restore drill (local, synthetic) =="

# 0. Preconditions
if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
  echo "FAIL: ${DB_CONTAINER} not running. Start the local stack first."
  exit 1
fi

psql_exec() { docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -tAc "$1"; }

# 1. Seed a known synthetic marker row (idempotent).
MARKER_ID="40000000-0000-0000-0000-000000000001"
psql_exec "insert into public.people (id, full_name, email) values ('${MARKER_ID}', 'Drill Marker Person', 'drill.marker@example.com') on conflict (id) do nothing;" >/dev/null
BEFORE=$(psql_exec "select count(*) from public.people;")
echo "  people rows before: ${BEFORE}"
[ "$BEFORE" -ge 1 ] || { echo "FAIL: no rows to back up"; exit 1; }

# 2. Backup: dump people to a local file.
BACKUP_FILE="/tmp/ops001-people-backup-$(date +%s).sql"
docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" -t public.people --data-only > "$BACKUP_FILE"
echo "  backup written: ${BACKUP_FILE} ($(wc -l < "$BACKUP_FILE") lines)"

# 3. Corrupt: delete the marker row (simulating a bad delete).
psql_exec "delete from public.people where id = '${MARKER_ID}';" >/dev/null
AFTER_DELETE=$(psql_exec "select count(*) from public.people;")
echo "  people rows after simulated loss: ${AFTER_DELETE}"
[ "$AFTER_DELETE" -lt "$BEFORE" ] || { echo "FAIL: corruption did not reduce rows"; exit 1; }

# 4. Restore: replace the table state from the backup (a real restore is
#    point-in-time replacement, not an upsert — truncate first, then load).
psql_exec "truncate table public.people cascade;" >/dev/null
docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" < "$BACKUP_FILE" >/dev/null
RESTORED=$(psql_exec "select count(*) from public.people;")
MARKER_BACK=$(psql_exec "select count(*) from public.people where id = '${MARKER_ID}';")
echo "  people rows after restore: ${RESTORED} (marker present: ${MARKER_BACK})"

# 5. Verify.
if [ "$RESTORED" = "$BEFORE" ] && [ "$MARKER_BACK" = "1" ]; then
  echo "PASS: restore returned to pre-loss state (${RESTORED} rows, marker present)"
  rm -f "$BACKUP_FILE"
  echo "== drill complete =="
else
  echo "FAIL: restored state does not match backup (before=${BEFORE}, restored=${RESTORED}, marker=${MARKER_BACK})"
  exit 1
fi
