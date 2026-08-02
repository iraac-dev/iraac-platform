/**
 * R5 community-safe public reports (server-only).
 *
 * The community pages (/survey/reports) are anonymous: no login, no session.
 * They MUST NOT use the service-role client (that would bypass RLS and expose
 * staff/government documents). Instead they use a client built from the
 * PUBLIC anon key, so Postgres RLS ("community read published community
 * documents" — audience='community_public' AND status='published' AND
 * retracted_at is null, granted to iraac_anon) is the access boundary.
 *
 * These helpers only ever *request* community_public + published rows; the
 * query-level filters mirror the RLS policy as defence in depth. For version
 * content, report_document_versions has no anon RLS policy, so the parent
 * document's audience/status/retraction is enforced IN THE QUERY via the
 * inner join — a version row whose document is staff/government or not
 * published never comes back, and the caller renders it as plain text (no
 * raw HTML) so nothing can leak.
 *
 * Fail-closed: any query error yields [] / null so a public page can never
 * render rows it was not allowed to read.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** One row of a published community_public report (list + detail). */
export interface CommunityReportRow {
  id: string;
  title: string;
  audience: "community_public";
  status: "published";
  published_at: string | null;
  current_version: number;
  content_hash: string;
}

/** Columns the community pages may read off report_documents. */
const COMMUNITY_DOCUMENT_COLUMNS =
  "id, title, audience, status, published_at, current_version, content_hash";

/**
 * Create the anonymous (public) Supabase client for community pages.
 *
 * Uses ONLY the public env vars — never the service role. Same shape as
 * createAdminClient() in survey-submit.ts but with the anon key, so RLS
 * (not application code) decides what an anonymous reader may see.
 */
export function createAnonReportsClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY (public env)");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * List published community_public reports, newest first.
 *
 * The query requests exactly the rows the anon RLS policy allows; anything
 * else (drafts, staff/government, retracted) is invisible both to RLS and to
 * these filters. Errors fail closed to [].
 */
export async function listPublishedCommunityReports(
  client: SupabaseClient,
): Promise<CommunityReportRow[]> {
  const { data, error } = await client
    .from("report_documents")
    .select(COMMUNITY_DOCUMENT_COLUMNS)
    .eq("audience", "community_public")
    .eq("status", "published")
    .is("retracted_at", null)
    .order("published_at", { ascending: false });

  if (error || !data) return [];
  return data as CommunityReportRow[];
}

/**
 * Fetch one published community_public report by id, or null when it is not
 * publicly readable (draft / staff / government / retracted / missing).
 * Errors fail closed to null.
 */
export async function getPublishedCommunityReport(
  client: SupabaseClient,
  id: string,
): Promise<CommunityReportRow | null> {
  const { data, error } = await client
    .from("report_documents")
    .select(COMMUNITY_DOCUMENT_COLUMNS)
    .eq("audience", "community_public")
    .eq("status", "published")
    .is("retracted_at", null)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data as CommunityReportRow;
}

/**
 * Read the content of one immutable version of a report document.
 *
 * report_document_versions has NO anon RLS policy, so the parent document's
 * community_public + published (and non-retracted) state is enforced in this
 * query via the inner join: the version row only comes back when its parent
 * document is publicly readable. Returns the markdown string, or null when
 * the parent is not community-public/published or the version does not exist.
 * Errors fail closed to null.
 */
export async function getReportContent(
  client: SupabaseClient,
  documentId: string,
  version: number,
): Promise<string | null> {
  const { data, error } = await client
    .from("report_document_versions")
    .select("content, report_documents!inner(audience, status)")
    .eq("document_id", documentId)
    .eq("version", version)
    .eq("report_documents.audience", "community_public")
    .eq("report_documents.status", "published")
    .is("report_documents.retracted_at", null)
    .maybeSingle();

  if (error || !data) return null;
  return data.content as string;
}
