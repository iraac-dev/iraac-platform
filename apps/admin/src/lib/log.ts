/** Structured operational logger. Events and fields are allowlisted. */
type Level = "debug" | "info" | "warn" | "error";
type EventCode =
  | "survey_submit_failure"
  | "consent_submit_failure"
  | "consent_withdraw_failure"
  | "health_check_failure"
  | "unknown_event";

const EVENTS = new Set<EventCode>([
  "survey_submit_failure",
  "consent_submit_failure",
  "consent_withdraw_failure",
  "health_check_failure",
  "unknown_event",
]);

function safeFields(fields: Record<string, unknown>): Record<string, string | number | boolean> {
  const output: Record<string, string | number | boolean> = {};
  if (typeof fields.errorType === "string" && /^[A-Za-z0-9_.-]{1,64}$/.test(fields.errorType)) {
    output.errorType = fields.errorType;
  }
  for (const key of ["durationMs", "statusCode", "count"] as const) {
    if (typeof fields[key] === "number" && Number.isFinite(fields[key])) output[key] = fields[key];
  }
  return output;
}

export function log(level: Level, event: EventCode, fields: Record<string, unknown> = {}) {
  const trustedEvent = EVENTS.has(event) ? event : "unknown_event";
  const line = JSON.stringify({
    ...safeFields(fields),
    level,
    event: trustedEvent,
    ts: new Date().toISOString(),
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
  return line;
}

export const logger = {
  debug: (event: EventCode, fields?: Record<string, unknown>) => log("debug", event, fields),
  info: (event: EventCode, fields?: Record<string, unknown>) => log("info", event, fields),
  warn: (event: EventCode, fields?: Record<string, unknown>) => log("warn", event, fields),
  error: (event: EventCode, fields?: Record<string, unknown>) => log("error", event, fields),
};
