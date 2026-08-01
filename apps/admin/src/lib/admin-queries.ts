/**
 * ADMIN-001 server-only dashboard queries.
 *
 * These run with the service role (bypasses RLS) but are ONLY reachable after
 * the role guard (admin-guard.ts) admits a verified staff/auditor session.
 * RLS remains the defence-in-depth for direct DB access; the app layer is the
 * staff-only gate.
 */
import { createAdminClient } from "./survey-submit";

export interface MaskedSubmission {
  sessionId: string;
  completedAt: string | null;
  completionMode: string;
  answerCount: number;
}

/** Recent submissions, PII-free by construction (anonymous sessions have no person link). */
export async function listSubmissions(limit = 25): Promise<MaskedSubmission[]> {
  const client = createAdminClient();
  const { data, error } = await client
    .from("survey_sessions")
    .select("id, completed_at, completion_mode, anonymous, person_id")
    .order("completed_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Failed to list submissions: ${error.message}`);

  const ids = (data ?? []).map((s) => s.id as string);
  const counts = new Map<string, number>();
  if (ids.length > 0) {
    const { data: answers, error: aErr } = await client
      .from("survey_answers")
      .select("session_id")
      .in("session_id", ids);
    if (aErr) throw new Error(`Failed to count answers: ${aErr.message}`);
    for (const row of answers ?? []) {
      counts.set(row.session_id as string, (counts.get(row.session_id as string) ?? 0) + 1);
    }
  }

  return (data ?? []).map((s) => ({
    sessionId: s.id as string,
    completedAt: s.completed_at as string | null,
    completionMode: s.completion_mode as string,
    answerCount: counts.get(s.id as string) ?? 0,
  }));
}

export interface ConsentTimelineRow {
  personId: string;
  name: string | null;
  email: string | null;
  events: {
    kind: "consent" | "suppression";
    channel: string | null;
    granted: boolean | null;
    reason: string | null;
    recordedAt: string;
  }[];
}

/** Per-person consent + suppression timeline (latest people first). */
export async function listConsentTimeline(limit = 20): Promise<ConsentTimelineRow[]> {
  const client = createAdminClient();
  const { data: people, error: pErr } = await client
    .from("people")
    .select("id, full_name, email")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (pErr) throw new Error(`Failed to list people: ${pErr.message}`);

  const rows: ConsentTimelineRow[] = [];
  for (const person of people ?? []) {
    const personId = person.id as string;
    const [consentRes, suppressionRes] = await Promise.all([
      client
        .from("consent_events")
        .select("channel, granted, recorded_at, consent_wording_version_id")
        .eq("person_id", personId)
        .order("recorded_at", { ascending: true }),
      client
        .from("suppression_events")
        .select("channel, reason, recorded_at")
        .eq("person_id", personId)
        .order("recorded_at", { ascending: true }),
    ]);
    if (consentRes.error) throw new Error(`Failed to list consent events: ${consentRes.error.message}`);
    if (suppressionRes.error) throw new Error(`Failed to list suppression events: ${suppressionRes.error.message}`);

    const events: ConsentTimelineRow["events"] = [
      ...(consentRes.data ?? []).map((e) => ({
        kind: "consent" as const,
        channel: e.channel as string | null,
        granted: e.granted as boolean,
        reason: null,
        recordedAt: e.recorded_at as string,
      })),
      ...(suppressionRes.data ?? []).map((e) => ({
        kind: "suppression" as const,
        channel: e.channel as string | null,
        granted: null,
        reason: e.reason as string,
        recordedAt: e.recorded_at as string,
      })),
    ].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));

    rows.push({
      personId,
      name: person.full_name as string | null,
      email: person.email as string | null,
      events,
    });
  }
  return rows;
}

export interface AuditRow {
  id: number;
  occurredAt: string;
  actorType: string;
  actorId: string | null;
  action: string;
  entityType: string | null;
  reason: string | null;
}

/** Read-only audit log. */
export async function listAuditLog(limit = 50): Promise<AuditRow[]> {
  const client = createAdminClient();
  const { data, error } = await client
    .from("audit_events")
    .select("id, occurred_at, actor_type, actor_id, action, entity_type, reason")
    .order("occurred_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Failed to list audit log: ${error.message}`);
  return (data ?? []).map((r) => ({
    id: r.id as number,
    occurredAt: r.occurred_at as string,
    actorType: r.actor_type as string,
    actorId: r.actor_id as string | null,
    action: r.action as string,
    entityType: r.entity_type as string | null,
    reason: r.reason as string | null,
  }));
}
