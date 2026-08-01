/**
 * R5 staff-side report administration (server-only).
 *
 * The dashboard manages governed reports: list, view, and transition through
 * the audited lifecycle (draft -> in_review -> approved_locked -> published |
 * retracted). Every transition goes through public.transition_report, which
 * appends an immutable version when content changes and writes an audit event.
 *
 * Only the service-role client may transition (the RPC is granted to
 * service_role only). Reads here are also service-role for staff/auditor rows;
 * the community-facing reads live in public-reports.ts with the ANON client so
 * RLS is the boundary there.
 *
 * NOTE: p_actor is currently a stable synthetic actor id. Real per-user auth
 * ids will be wired when named custodianship lands (R3 memberships carry
 * auth_user_id; the guard does not yet expose it).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export type ReportStatus =
  | "draft"
  | "in_review"
  | "approved_locked"
  | "published"
  | "retracted";

export interface ReportRow {
  id: string;
  title: string;
  audience: "community_public" | "staff_partner" | "government";
  status: ReportStatus;
  snapshot_id: string;
  current_version: number;
  content_hash: string;
  published_at: string | null;
  retracted_at: string | null;
  retract_reason: string | null;
  updated_at: string;
}

export interface ReportVersionRow {
  version: number;
  content: string;
  content_hash: string;
  change_note: string | null;
  created_at: string;
}

/** Transition result returned by the RPC. */
export interface TransitionResult {
  report_id: string;
  status: ReportStatus;
  current_version: number;
}

export const REPORT_STATUSES: ReportStatus[] = [
  "draft",
  "in_review",
  "approved_locked",
  "published",
  "retracted",
];

/** Synthetic actor id until named custodianship exposes real auth user ids. */
export const SYNTHETIC_ACTOR_ID = "00000000-0000-4000-8000-0000000000aa";

/**
 * List report documents for the dashboard, newest first.
 * Errors fail closed to [].
 */
export async function listReports(client: SupabaseClient): Promise<ReportRow[]> {
  const { data, error } = await client
    .from("report_documents")
    .select(
      "id, title, audience, status, snapshot_id, current_version, content_hash, published_at, retracted_at, retract_reason, updated_at",
    )
    .order("updated_at", { ascending: false });

  if (error || !data) return [];
  return data as ReportRow[];
}

/**
 * Fetch one report document for the dashboard, or null when missing.
 * Errors fail closed to null.
 */
export async function getReport(
  client: SupabaseClient,
  id: string,
): Promise<ReportRow | null> {
  const { data, error } = await client
    .from("report_documents")
    .select(
      "id, title, audience, status, snapshot_id, current_version, content_hash, published_at, retracted_at, retract_reason, updated_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data as ReportRow;
}

/**
 * List the immutable versions of a report document, oldest first.
 * Errors fail closed to [].
 */
export async function listReportVersions(
  client: SupabaseClient,
  documentId: string,
): Promise<ReportVersionRow[]> {
  const { data, error } = await client
    .from("report_document_versions")
    .select("version, content, content_hash, change_note, created_at")
    .eq("document_id", documentId)
    .order("version", { ascending: true });

  if (error || !data) return [];
  return data as ReportVersionRow[];
}

/**
 * Transition a report through its audited lifecycle.
 *
 * Calls public.transition_report; on an RPC error throws Error with the
 * Postgres message so the route can map it (report not found / invalid
 * transition / unchanged content -> 400, else 500).
 */
export async function transitionReport(
  client: SupabaseClient,
  args: {
    reportId: string;
    nextStatus: ReportStatus;
    reason?: string | null;
    content?: string | null;
    changeNote?: string | null;
  },
): Promise<TransitionResult> {
  const { reportId, nextStatus, reason = null, content = null, changeNote = null } = args;
  const { data, error } = await client.rpc("transition_report", {
    p_report_id: reportId,
    p_next_status: nextStatus,
    p_actor: SYNTHETIC_ACTOR_ID,
    p_reason: reason,
    p_content: content,
    p_change_note: changeNote,
  });

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Report transition returned no result");
  return data as TransitionResult;
}
