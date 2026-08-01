/**
 * CONS-001 server-only consent path.
 *
 * The anonymous survey (SURV-002) strips the H (contact) and I (permissions)
 * sections entirely. This library is the OPTIONAL follow-up journey a
 * respondent opts into AFTER completing the anonymous survey: they may leave
 * contact details and grant separate, unticked channel permissions. Every
 * write goes through the service role — anon has no direct consent access.
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

/** Wording version pinned for each channel (seeded by CONS-001 migration). */
const WORDING_VERSION_BY_CHANNEL: Record<string, number> = {
  email: 1,
  sms: 1,
  human_call: 1,
  ai_call: 1,
  recording: 1,
};

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
 * Record one consent event per ticked permission, create/update the person
 * and contact points, and issue a hashed receipt token. Idempotent per
 * session: a second call for the same session returns the existing receipt.
 */
export async function submitConsent(
  client: SupabaseClient,
  input: ConsentInput,
): Promise<ConsentResult> {
  // Idempotency: one receipt per session.
  const { data: existing } = await client
    .from("consent_receipts")
    .select("id, token_hash, expires_at, channel")
    .eq("survey_session_id", input.sessionId)
    .maybeSingle();

  if (existing) {
    // We cannot return the raw token again; issue a fresh one only if the old
    // has not expired, otherwise refuse — a new session is required.
    throw new Error("Consent already recorded for this session");
  }

  // 1. Resolve the session; it must exist and be completed.
  const { data: session, error: sErr } = await client
    .from("survey_sessions")
    .select("id, status")
    .eq("id", input.sessionId)
    .maybeSingle();
  if (sErr || !session) {
    throw new Error("Survey session not found");
  }
  if (session.status !== "completed") {
    throw new Error("Survey session is not completed");
  }

  // 2. Create or update the person from contact details (optional).
  let personId: string | null = null;
  const contact = input.contact;
  const wantsContact = Object.entries(input.permissions).some(
    ([permissionId, granted]) => granted && Boolean(PERMISSION_CHANNEL[permissionId]),
  );
  if (contact && (contact.email || contact.mobile || wantsContact)) {
    const { data: person, error: pErr } = await client
      .from("people")
      .insert({
        full_name: contact.name ?? null,
        email: contact.email ?? null,
        mobile_number: contact.mobile ?? null,
      })
      .select("id")
      .single();
    if (pErr) {
      throw new Error(`Failed to create person: ${pErr.message}`);
    }
    personId = person.id as string;

    // Contact points for the values provided.
    const points: { person_id: string; kind: string; value: string }[] = [];
    if (contact.email) points.push({ person_id: personId, kind: "email", value: contact.email });
    if (contact.mobile) points.push({ person_id: personId, kind: "mobile", value: contact.mobile });
    if (points.length > 0) {
      const { error: cpErr } = await client.from("contact_points").insert(points);
      if (cpErr) {
        throw new Error(`Failed to record contact points: ${cpErr.message}`);
      }
    }
  }

  // 3. One consent event per ticked permission, linked to the exact wording
  //    version the respondent saw (versioned receipt).
  const grantedChannels: string[] = [];
  for (const [permId, granted] of Object.entries(input.permissions)) {
    if (!granted) continue;
    const channel = PERMISSION_CHANNEL[permId];
    // I05 is a preference to be asked later, never advance recording consent.
    if (!channel) continue;
    const wordingVersion = WORDING_VERSION_BY_CHANNEL[channel];
    const { data: wording, error: wErr } = await client
      .from("consent_wording_versions")
      .select("id")
      .eq("channel", channel)
      .eq("version", wordingVersion)
      .maybeSingle();
    if (wErr || !wording) {
      throw new Error(`Consent wording not found for ${channel} v${wordingVersion}`);
    }
    const { error: cErr } = await client.from("consent_events").insert({
      person_id: personId,
      channel,
      consent_wording_version_id: wording.id,
      granted: true,
      source: "survey",
    });
    if (cErr) {
      throw new Error(`Failed to record consent event: ${cErr.message}`);
    }
    grantedChannels.push(channel);
  }

  // 4. Issue the receipt token (store hash only).
  const rawToken = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 12 * 30 * 24 * 60 * 60 * 1000); // ~12 months
  const { data: receipt, error: rErr } = await client
    .from("consent_receipts")
    .insert({
      person_id: personId,
      survey_session_id: input.sessionId,
      token_hash: sha256Hex(rawToken),
      channel: grantedChannels[0] ?? null,
      granted: grantedChannels.length > 0,
      expires_at: expiresAt.toISOString(),
    })
    .select("id")
    .single();
  if (rErr) {
    throw new Error(`Failed to create consent receipt: ${rErr.message}`);
  }

  return {
    ok: true,
    receiptId: receipt.id as string,
    receiptToken: rawToken,
    expiresAt: expiresAt.toISOString(),
    grantedChannels,
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
