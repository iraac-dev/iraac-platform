/**
 * SURV-002 server-only survey submission.
 *
 * The public client NEVER talks to Supabase. This library is called only
 * from a Next.js server route, validates every answer against the frozen
 * @iraac/survey-contract contract, enforces the adult gate and branch
 * conformance, then writes one idempotent completion via the service role.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import {
  SURVEY_V1,
  SURVEY_V1_HASH,
  terminalStop,
  validateAnswers,
  visibleQuestionIds,
} from "@iraac/survey-contract";
import type { AnswerMap, CompletionMode } from "@iraac/survey-contract";

export interface SubmissionInput {
  answers: AnswerMap;
  clientToken: string;
  completionMode?: CompletionMode;
}

export interface SubmissionResult {
  ok: boolean;
  status: "completed" | "duplicate" | "blocked";
  completionRef?: string;
  sessionId?: string;
  reason?: string;
}

/** V1 release UUID inserted by migration 20260801000600. */
const V1_VERSION_ID = "10000000-0000-0000-0000-000000000002";
/** V1 survey definition UUID (survey_questions.survey_id references it). */
const V1_DEFINITION_ID = "10000000-0000-0000-0000-000000000001";

/**
 * Collection interlock. A deployed route must not turn a draft or superseded
 * contract into a live survey merely because it has the service-role key.
 */
export async function assertSurveyReleaseActive(client: SupabaseClient): Promise<void> {
  const { data: release, error } = await client
    .from("survey_versions")
    .select("status, content_hash")
    .eq("id", V1_VERSION_ID)
    .maybeSingle();

  if (error || !release) {
    throw new Error("Survey release is unavailable");
  }
  if (release.status !== "active") {
    throw new Error("Survey release is not active");
  }
  if (release.content_hash !== SURVEY_V1_HASH) {
    throw new Error("Survey release hash mismatch");
  }
}

/** The question ids that are NOT part of the anonymous V1 journey (H = follow-up contact, I = permissions). */
const NON_ANONYMOUS_IDS = new Set<string>([
  "H01", "H02", "H03", "H04", "H05", "H06",
  "I01", "I02", "I03", "I04", "I05",
]);

/**
 * Validate an anonymous submission:
 * - adult gate: A01 must be "Yes" (No/Prefer-not-to-say stores nothing)
 * - no terminal stop (A02 person/help paths never reach submission)
 * - only branch-visible, anonymous-eligible questions may carry answers
 * - every answer passes the Zod contract
 *
 * Returns the cleaned, validated answer map or throws.
 */
export function validateAnonymousSubmission(answers: AnswerMap): Record<string, string | string[]> {
  const stop = terminalStop(answers);
  if (stop.stop) {
    throw new Error(`Submission blocked: ${stop.reason}`);
  }
  if (answers.A01 !== "Yes") {
    throw new Error("Submission blocked: A01 must be Yes (adult gate)");
  }
  if (answers.A02 !== "Yes" && answers.A02 !== "I would like to skip personal questions") {
    throw new Error("Submission blocked: A02 safety choice is required");
  }

  const visible = new Set(visibleQuestionIds(answers));
  // Strip non-anonymous (H/I) and branch-hidden answers before validating,
  // so a hostile client cannot smuggle contact data or resurrect hidden branches.
  const cleaned: AnswerMap = {};
  for (const [id, value] of Object.entries(answers)) {
    if (NON_ANONYMOUS_IDS.has(id)) continue;
    if (!visible.has(id)) continue;
    if (value === undefined || value === null) continue;
    cleaned[id] = value;
  }

  const validated = validateAnswers(cleaned);
  return validated;
}

/** Format a short, answer-free completion reference (reveals no answers). */
function makeCompletionRef(): string {
  const rand = randomBytes(4).toString("hex");
  return `HYS-${Date.now().toString(36).toUpperCase()}-${rand.toUpperCase()}`;
}

/** Create the service-role client. Call only from the server. */
export function createAdminClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (server-only env)");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Idempotent anonymous submission. A duplicate clientToken returns the
 * original completion (one completion per token, never two).
 */
export async function submitAnonymousSurvey(
  client: SupabaseClient,
  input: SubmissionInput,
): Promise<SubmissionResult> {
  const validated = validateAnonymousSubmission(input.answers);
  await assertSurveyReleaseActive(client);

  // Duplicate check first: same token already completed?
  const { data: existing } = await client
    .from("survey_sessions")
    .select("id, status, client_token")
    .eq("client_token", input.clientToken)
    .maybeSingle();

  if (existing?.status === "completed") {
    return {
      ok: true,
      status: "duplicate",
      sessionId: existing.id,
      completionRef: existing.client_token ?? undefined,
      reason: "Duplicate submit; one completion already exists",
    };
  }

  // Question id -> db uuid lookup for the pinned release.
  const { data: questions, error: qErr } = await client
    .from("survey_questions")
    .select("id, question_key")
    .eq("survey_id", V1_DEFINITION_ID);

  if (qErr || !questions) {
    throw new Error(`Failed to load survey questions: ${qErr?.message ?? "no rows"}`);
  }
  const qidByKey = new Map(questions.map((q: { id: string; question_key: string }) => [q.question_key, q.id]));

  // Insert session; unique(client_token) makes the race safe: the second
  // concurrent submit fails with 23505 and we fall through to duplicate.
  const { data: session, error: sErr } = await client
    .from("survey_sessions")
    .insert({
      survey_version_id: V1_VERSION_ID,
      completion_mode: input.completionMode ?? "web",
      anonymous: true,
      status: "completed",
      client_token: input.clientToken,
      completed_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (sErr) {
    if (sErr.code === "23505") {
      return { ok: true, status: "duplicate", reason: "Concurrent duplicate submit; one completion" };
    }
    throw new Error(`Failed to create session: ${sErr.message}`);
  }

  const sessionId = session.id as string;
  const rows = Object.entries(validated)
    .filter(([id]) => !NON_ANONYMOUS_IDS.has(id))
    .map(([id, value]) => ({
      session_id: sessionId,
      question_id: qidByKey.get(id),
      answer_value: Array.isArray(value) ? value : value,
    }))
    .filter((r) => r.question_id);

  if (rows.length > 0) {
    const { error: aErr } = await client.from("survey_answers").insert(rows);
    if (aErr) {
      throw new Error(`Failed to record answers: ${aErr.message}`);
    }
  }

  return {
    ok: true,
    status: "completed",
    sessionId,
    completionRef: makeCompletionRef(),
  };
}

export { SURVEY_V1, SURVEY_V1_HASH };
