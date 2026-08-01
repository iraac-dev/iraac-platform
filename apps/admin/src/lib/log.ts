/**
 * OPS-001 structured JSON logger with a hard no-PII rule.
 *
 * Every log line is a single JSON object: { level, msg, ts, ...fields }.
 * Known PII keys (emails, mobiles, names, tokens, answers, session/person
 * ids that could identify a respondent) are STRIPPED even if a caller passes
 * them — the logger refuses to emit them, not merely warns.
 */
const LEVELS = ["debug", "info", "warn", "error"] as const;
type Level = (typeof LEVELS)[number];

/** Keys that must never appear in a log line, at any depth. */
const STRIPPED_KEYS = new Set([
  "email",
  "mobile",
  "mobile_number",
  "phone",
  "name",
  "full_name",
  "token",
  "token_hash",
  "receiptToken",
  "password",
  "answers",
  "answer",
  "answer_value",
  "clientToken",
  "person_id",
  "sessionId",
  "session_id",
  "contact",
  "permissions",
]);

function redact(value: unknown, key = ""): unknown {
  if (STRIPPED_KEYS.has(key)) return "[REDACTED]";
  if (Array.isArray(value)) return value.map((v) => redact(v));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, redact(v, k)]),
    );
  }
  return value;
}

export function log(level: Level, msg: string, fields: Record<string, unknown> = {}) {
  const line = JSON.stringify({
    level,
    msg,
    ts: new Date().toISOString(),
    ...(redact(fields) as Record<string, unknown>),
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
  return line;
}

export const logger = {
  debug: (msg: string, fields?: Record<string, unknown>) => log("debug", msg, fields),
  info: (msg: string, fields?: Record<string, unknown>) => log("info", msg, fields),
  warn: (msg: string, fields?: Record<string, unknown>) => log("warn", msg, fields),
  error: (msg: string, fields?: Record<string, unknown>) => log("error", msg, fields),
};
