/**
 * CONS-001 server-only consent path.
 *
 * The anonymous survey (SURV-002) strips the H (contact) and I (permissions)
 * sections entirely. This library is the OPTIONAL follow-up journey a
 * respondent opts into AFTER completing the anonymous survey: they may leave
 * contact details and grant separate, unticked channel permissions. Every
 * write goes through the service role — anon has no direct consent access.
 *
 * Consent writes are now ONE transactional RPC (public.submit_consent):
 * it captures the session, person, contact points, consent events and
 * receipt atomically, and enforces deny-wins suppression via the existing
 * trigger.
 *
 * Receipt tokens are the no-login credential: the raw token is returned to
 * the respondent exactly once and only its SHA-256 hash is stored, so a
 * stolen DB never yields usable tokens.
 */
import { createHash, randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Contact permission id (I01–I05) → consent channel. */
const PERMISSION_CHANNEL: Record<string, string> = {
  I01: "email",
  I02: "sms",
  I03: "human_call",
  I04: "ai_call",
};

const ALL_PERMISSION_IDS = ["I01", "I02", "I03", "I04", "I05"];

export interface ConsentInput {
  sessionId: string;
  /** Contact details the person chose to leave (H03/H04/H05). */
  contact?: {
    name?: string;
    email?: string;
    mobile?: string;
  };
  /** Which I01–I05 boxes were ticked. Unticked = not granted. */
  permissions: Record<string, boolean>;
}

export interface ConsentResult {
  ok: true;
  receiptId: string;
  /** Show once; only its hash is stored. */
  receiptToken: string;
  expiresAt: string;
  grantedChannels: string[];
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Validate input shape; throws on any invalid permission id. */
export function validateConsentInput(input: unknown): ConsentInput {
  if (!input || typeof input !== "object") {
    throw new Error("Consent body is required");
  }
  const raw = input as Record<string, unknown>;
  const sessionId = raw.sessionId;
  if (typeof sessionId !== "string" || sessionId.length < 8) {
    throw new Error("sessionId is required");
  }
  const permissions = raw.permissions;
  if (!permissions || typeof permissions !== "object" || Array.isArray(permissions)) {
    throw new Error("permissions must be an object of I01–I05 booleans");
  }
  const perms = permissions as Record<string, unknown>;
  for (const [id, val] of Object.entries(perms)) {
    if (!ALL_PERMISSION_IDS.includes(id)) {
      throw new Error(`Unknown permission ${id}`);
    }
    if (typeof val !== "boolean") {
      throw new Error(`Permission ${id} must be a boolean`);
    }
  }
  // Contact is optional; if present validate shape loosely.
  let contact: ConsentInput["contact"];
  if (raw.contact !== undefined && raw.contact !== null) {
    const c = raw.contact as Record<string, unknown>;
    contact = {
      name: typeof c.name === "string" ? c.name.trim().slice(0, 120) : undefined,
      email: typeof c.email === "string" ? c.email.trim() : undefined,
      mobile: typeof c.mobile === "string" ? c.mobile.trim() : undefined,
    };
  }
  const emailGranted = perms.I01 === true;
  const mobileGranted = perms.I02 === true || perms.I03 === true || perms.I04 === true;
  if (emailGranted && !contact?.email) {
    throw new Error("An email address is required for email permission");
  }
  if (mobileGranted && !contact?.mobile) {
    throw new Error("A mobile number is required for SMS or call permission");
  }
  if (contact?.email && (contact.email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email))) {
    throw new Error("A valid email address is required");
  }
  if (contact?.mobile && (contact.mobile.length > 30 || !/^\+?[0-9 ()-]{8,20}$/.test(contact.mobile))) {
    throw new Error("A valid phone number is required");
  }
  const mappedPermissionGranted = Object.entries(perms).some(
    ([permissionId, granted]) => granted && Boolean(PERMISSION_CHANNEL[permissionId]),
  );
  if (!contact?.email && !contact?.mobile && !mappedPermissionGranted) {
    throw new Error("Choose a contact permission or skip this step");
  }
  return { sessionId, permissions: perms as Record<string, boolean>, contact };
}

/**
 * Record consent in a single transactional RPC (public.submit_consent).
 * The RPC atomically resolves the completed session, upserts the person and
 * contact points, writes one consent event per ticked permission, and issues
 * a receipt with a 12-month expiry. Idempotent per session: a re-submit for
 * the same session returns the existing receipt (created:false) instead of
 * writing a second one.
 */
export async function submitConsent(
  client: SupabaseClient,
  input: ConsentInput,
): Promise<ConsentResult> {
  // The raw token is returned to the respondent exactly once; only its
  // SHA-256 hash is passed to (and stored by) the RPC.
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = sha256Hex(rawToken);

  const { data, error } = await client.rpc("submit_consent", {
    p_session_id: input.sessionId,
    p_name: input.contact?.name ?? null,
    p_email: input.contact?.email ?? null,
    p_mobile: input.contact?.mobile ?? null,
    p_permissions: input.permissions,
    p_token_hash: tokenHash,
  });

  if (error) {
    throw new Error("Failed to record consent: " + error.message);
  }

  // The RPC sets expires_at 12 months out; mirror it here for display.
  const expiresAt = new Date(
    Date.now() + 12 * 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  // created:false means a receipt already exists for this session — the RPC
  // returned it, so an idempotent re-submit is not an error.
  return {
    ok: true,
    receiptId: data.receipt_id,
    receiptToken: rawToken,
    expiresAt,
    grantedChannels: data.granted_channels ?? [],
  };
}

/**
 * No-login withdrawal. Validates the raw token against its stored hash and
 * writes a suppression event (channel-scoped or global). The DB trigger
 * applies it to consent_state immediately.
 */
export async function withdrawConsent(
  client: SupabaseClient,
  token: string,
  channel?: string,
): Promise<{ ok: true; revokedChannels: string[] }> {
  if (!token || token.length < 20) {
    throw new Error("Valid receipt token is required");
  }
  const tokenHash = sha256Hex(token);
  const { data: receipt, error: rErr } = await client
    .from("consent_receipts")
    .select("id, person_id, channel, expires_at, revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (rErr || !receipt) {
    throw new Error("Receipt token not found");
  }
  if (receipt.revoked_at) {
    throw new Error("Receipt token already used");
  }
  if (new Date(receipt.expires_at).getTime() < Date.now()) {
    throw new Error("Receipt token expired");
  }

  // Channel must be one of the allowed consent channels when provided.
  if (channel && !["email", "sms", "human_call", "ai_call", "recording", "newsletter"].includes(channel)) {
    throw new Error("Unknown channel");
  }

  const { error: sErr } = await client.from("suppression_events").insert({
    person_id: receipt.person_id,
    reason: "withdrawal",
    channel: channel ?? null,
  });
  if (sErr) {
    throw new Error(`Failed to record withdrawal: ${sErr.message}`);
  }

  const { error: revErr } = await client
    .from("consent_receipts")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", receipt.id);
  if (revErr) {
    throw new Error(`Failed to revoke receipt: ${revErr.message}`);
  }

  return { ok: true, revokedChannels: channel ? [channel] : [] };
}

/** Re-export for callers that need the canonical permission map. */
export { ALL_PERMISSION_IDS, PERMISSION_CHANNEL };
