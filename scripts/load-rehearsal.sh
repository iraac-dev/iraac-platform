#!/usr/bin/env bash
# REL-P1 fail-closed synthetic HTTP rehearsal.
#
# The endpoint must be a deliberately activated local/staging release. This
# script never falls back to a one-row database check and never treats a partial
# run as success.
set -euo pipefail

COUNT="${1:-1000}"
ENDPOINT="${2:-http://127.0.0.1:3000/api/survey/submit}"
CONCURRENCY="${REHEARSAL_CONCURRENCY:-10}"
: "${IRAAC_LOAD_REHEARSAL_KEY:?Set the non-production rehearsal key}"
: "${REHEARSAL_DATABASE_URL:?Set the disposable environment database URL for reconciliation}"

if [ "${#IRAAC_LOAD_REHEARSAL_KEY}" -lt 32 ]; then
  echo "IRAAC_LOAD_REHEARSAL_KEY must be at least 32 characters" >&2
  exit 2
fi

case "$COUNT" in
  ''|*[!0-9]*) echo "COUNT must be a positive integer" >&2; exit 2 ;;
esac
if [ "$COUNT" -lt 1 ] || [ "$COUNT" -gt 10000 ]; then
  echo "COUNT must be between 1 and 10000" >&2
  exit 2
fi

case "$ENDPOINT" in
  http://127.0.0.1:*|http://localhost:*|https://*.vercel.app/*) ;;
  *)
    if [ "${IRAAC_ALLOW_REMOTE_REHEARSAL:-}" != "YES" ]; then
      echo "Refusing a non-local/non-preview endpoint without IRAAC_ALLOW_REMOTE_REHEARSAL=YES" >&2
      exit 2
    fi
    ;;
esac

RUN_DIR=$(mktemp -d "${TMPDIR:-/tmp}/iraac-rel-p1.XXXXXX")
chmod 700 "$RUN_DIR"
trap 'rm -rf "$RUN_DIR"' EXIT INT TERM
RUN_HEX=$(od -An -N3 -tx1 /dev/urandom | tr -d ' \n')

echo "== REL-P1 synthetic HTTP rehearsal =="
echo "  endpoint: $ENDPOINT"
echo "  submissions: $COUNT"
echo "  concurrency: $CONCURRENCY"

request_once() {
  local body="$1" output="$2"
  curl -sS --max-time 30 -o "$output" -w "%{http_code}" \
    -X POST -H 'Content-Type: application/json' -H "x-iraac-rehearsal-key: $IRAAC_LOAD_REHEARSAL_KEY" \
    -d "$body" "$ENDPOINT"
}

run_one() {
  local idx="$1" idx_hex token body code first second
  idx_hex=$(printf '%06x' "$idx")
  token="10000000-0000-4000-8000-${RUN_HEX}${idx_hex}"
  body="{\"answers\":{\"A01\":\"Yes\",\"A02\":\"Yes\"},\"clientToken\":\"${token}\",\"completionMode\":\"web\"}"
  first="$RUN_DIR/first-${idx}.json"
  second="$RUN_DIR/second-${idx}.json"

  code=$(request_once "$body" "$first" || true)
  if [ "$code" != "200" ] || ! grep -q '"status":"completed"' "$first"; then
    printf 'first-%s-http-%s\n' "$idx" "${code:-000}" > "$RUN_DIR/fail-${idx}"
    return
  fi

  code=$(request_once "$body" "$second" || true)
  if [ "$code" != "200" ] || ! grep -q '"status":"duplicate"' "$second"; then
    printf 'duplicate-%s-http-%s\n' "$idx" "${code:-000}" > "$RUN_DIR/fail-${idx}"
    return
  fi

  : > "$RUN_DIR/pass-${idx}"
}

export ENDPOINT RUN_DIR RUN_HEX IRAAC_LOAD_REHEARSAL_KEY
export -f request_once run_one

seq 1 "$COUNT" | xargs -P "$CONCURRENCY" -I{} bash -c 'run_one "$1"' _ {}

pass=$(find "$RUN_DIR" -name 'pass-*' -type f | wc -l | tr -d ' ')
fail=$(find "$RUN_DIR" -name 'fail-*' -type f | wc -l | tr -d ' ')

echo "  completed + duplicate verified: $pass"
echo "  failed: $fail"

if [ "$fail" -ne 0 ] || [ "$pass" -ne "$COUNT" ]; then
  echo "FAIL: expected $COUNT complete-and-duplicate pairs" >&2
  find "$RUN_DIR" -maxdepth 1 -name 'fail-*' -type f -exec head -n 1 {} \; | head -10 >&2
  exit 1
fi

read -r persisted distinct_tokens answer_rows incomplete < <(
  psql "$REHEARSAL_DATABASE_URL" -At -F ' ' -v ON_ERROR_STOP=1 -c "
    with run_sessions as (
      select id, client_token, status from public.survey_sessions
      where client_token::text like '10000000-0000-4000-8000-${RUN_HEX}%'
    )
    select
      (select count(*) from run_sessions),
      (select count(distinct client_token) from run_sessions),
      (select count(*) from public.survey_answers a join run_sessions s on s.id = a.session_id),
      (select count(*) from run_sessions where status <> 'completed');"
)

if [ "$persisted" -ne "$COUNT" ] || [ "$distinct_tokens" -ne "$COUNT" ] || \
   [ "$answer_rows" -ne $((COUNT * 2)) ] || [ "$incomplete" -ne 0 ]; then
  echo "FAIL: persistence reconciliation sessions=${persisted} tokens=${distinct_tokens} answers=${answer_rows} incomplete=${incomplete}" >&2
  exit 1
fi

echo "  persisted sessions/tokens: $persisted/$distinct_tokens; answers: $answer_rows"

echo "== rehearsal passed =="
