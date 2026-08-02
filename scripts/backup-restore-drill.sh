#!/usr/bin/env bash
# Restore rehearsal using two disposable PostgreSQL databases.
# The source is read-only. The restore target is erased and must never be production.
set -euo pipefail

: "${REHEARSAL_SOURCE_DATABASE_URL:?Set REHEARSAL_SOURCE_DATABASE_URL}"
: "${REHEARSAL_RESTORE_DATABASE_URL:?Set REHEARSAL_RESTORE_DATABASE_URL}"
: "${IRAAC_CONFIRM_DISPOSABLE_RESTORE:?Set IRAAC_CONFIRM_DISPOSABLE_RESTORE=YES}"

if [[ "$IRAAC_CONFIRM_DISPOSABLE_RESTORE" != "YES" ]]; then
  echo "FAIL: destructive restore was not explicitly confirmed"
  exit 1
fi
database_identity() {
  psql "$1" -At -F '|' -v ON_ERROR_STOP=1 -c \
    "select (pg_control_system()).system_identifier, current_database();"
}

SOURCE_IDENTITY="$(database_identity "$REHEARSAL_SOURCE_DATABASE_URL")"
RESTORE_IDENTITY="$(database_identity "$REHEARSAL_RESTORE_DATABASE_URL")"
RESTORE_DATABASE="${RESTORE_IDENTITY#*|}"
if [[ "$SOURCE_IDENTITY" == "$RESTORE_IDENTITY" ]]; then
  echo "FAIL: source and restore resolve to the same physical database"
  exit 1
fi
if [[ ! "$RESTORE_DATABASE" =~ (_restore|_rehearsal|_test)$ ]]; then
  echo "FAIL: restore database name must end in _restore, _rehearsal, or _test"
  exit 1
fi

DRILL_DIR="$(mktemp -d)"
chmod 700 "$DRILL_DIR"
trap 'rm -rf "$DRILL_DIR"' EXIT
DUMP_FILE="$DRILL_DIR/iraac-full.dump"
SOURCE_FINGERPRINTS="$DRILL_DIR/source-fingerprints.tsv"
RESTORE_FINGERPRINTS="$DRILL_DIR/restore-fingerprints.tsv"
SOURCE_SCHEMA="$DRILL_DIR/source-schema.sql"
RESTORE_SCHEMA="$DRILL_DIR/restore-schema.sql"

fingerprint_public_tables() {
  local database_url="$1"
  local output_file="$2"
  local tables
  tables="$(psql "$database_url" -Atc "select quote_ident(tablename) from pg_tables where schemaname='public' order by tablename")"
  : > "$output_file"
  while IFS= read -r table_name; do
    [[ -z "$table_name" ]] && continue
    printf '%s\t' "$table_name" >> "$output_file"
    psql "$database_url" -At -F $'\t' -v ON_ERROR_STOP=1 -c \
      "select count(*), md5(coalesce(string_agg(md5(row_to_json(t)::text), '' order by md5(row_to_json(t)::text)), '')) from public.${table_name} t" \
      >> "$output_file"
  done <<< "$tables"
}

echo "Creating a full schema-and-data backup from the read-only source..."
# Scope to the platform-owned schema: Supabase runtime schemas (auth, realtime,
# storage, vault, etc.) are platform machinery, not IRAAC data, and cannot be
# restored into a plain disposable Postgres target. The fingerprints and the
# pgTAP suites operate on public; extensions are created by the target image.
# ACLs are deliberately NOT stripped (--no-owner only): a faithful restore must
# preserve grants, so the target must hold the platform role set first.
pg_dump --schema=public --format=custom --no-owner "$REHEARSAL_SOURCE_DATABASE_URL" --file "$DUMP_FILE"
fingerprint_public_tables "$REHEARSAL_SOURCE_DATABASE_URL" "$SOURCE_FINGERPRINTS"
# Strip pg_dump session metadata (random \restrict/\unrestrict tokens and the
# "Dumped from database version" banner) plus ACL serialization lines
# (GRANT/REVOKE — their representation differs between dumps for the same
# effective grants; the pgTAP suites below verify the actual grants by
# exercising them) so the schema diff compares actual schema, policies,
# functions and triggers — not per-run dump or ACL-format artifacts.
pg_dump --schema=public --schema-only --no-owner "$REHEARSAL_SOURCE_DATABASE_URL" \
  | grep -vE '^(\\restrict|\\unrestrict|-- Dumped from database version|GRANT |REVOKE |-- (Name|Owner|Access))' > "$SOURCE_SCHEMA"

echo "Restoring into the separately confirmed disposable target..."
# Ensure the platform role set exists in the target (the source dump carries
# ACLs referencing them; a disposable plain Postgres starts without them).
psql "$REHEARSAL_RESTORE_DATABASE_URL" -v ON_ERROR_STOP=1 -c "
do \$\$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'supabase_admin') then create role supabase_admin nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'iraac_anon') then create role iraac_anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'iraac_authenticated') then create role iraac_authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'iraac_staff') then create role iraac_staff nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'iraac_auditor') then create role iraac_auditor nologin; end if;
end \$\$;" >/dev/null
pg_restore --clean --if-exists --no-owner --exit-on-error \
  --dbname "$REHEARSAL_RESTORE_DATABASE_URL" "$DUMP_FILE"
fingerprint_public_tables "$REHEARSAL_RESTORE_DATABASE_URL" "$RESTORE_FINGERPRINTS"
pg_dump --schema=public --schema-only --no-owner "$REHEARSAL_RESTORE_DATABASE_URL" \
  | grep -vE '^(\\restrict|\\unrestrict|-- Dumped from database version|GRANT |REVOKE |-- (Name|Owner|Access))' > "$RESTORE_SCHEMA"

if ! diff -u "$SOURCE_FINGERPRINTS" "$RESTORE_FINGERPRINTS"; then
  echo "FAIL: restored table counts or content fingerprints differ"
  exit 1
fi
if ! diff -u "$SOURCE_SCHEMA" "$RESTORE_SCHEMA"; then
  echo "FAIL: restored schema, policies, functions or triggers differ"
  exit 1
fi
if ! command -v pg_prove >/dev/null 2>&1; then
  echo "FAIL: pg_prove is required to verify restored database policies"
  exit 1
fi
# The pgTAP suites call select plan(N) before their in-file
# `create extension if not exists pgtap`, so the extension must already exist
# in the restored target — exactly as it does in the local `supabase test db`
# runner (where prior runs leave it installed). Mirror that precondition.
psql "$REHEARSAL_RESTORE_DATABASE_URL" -v ON_ERROR_STOP=1 -c "create extension if not exists pgtap;" >/dev/null
pg_prove --dbname "$REHEARSAL_RESTORE_DATABASE_URL" supabase/tests/*.sql

echo "PASS: full backup restored to a separately identified disposable database; schema, data and pgTAP match"
