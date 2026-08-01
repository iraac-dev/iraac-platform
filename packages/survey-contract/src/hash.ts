/**
 * Semantic content hash for the canonical survey definition.
 *
 * An active release is immutable: the hash is computed over a canonical JSON
 * serialization (deterministically sorted keys) of the definition. Any
 * mutation — question text, option, rule, permission — changes the hash, so a
 * release can never silently diverge. Web, staff and phone adapters all
 * consume the same hash, and the DB `survey_versions.content_hash` column
 * stores it.
 */

import { createHash } from "node:crypto";
import { SURVEY_V1 } from "./definition.ts";
import type { SurveyDefinition } from "./types.ts";

/** Deep-sort object keys so serialization is order-independent. */
export function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value !== null && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      out[key] = canonicalize(obj[key]);
    }
    return out;
  }
  return value;
}

/** SHA-256 hex digest of the canonical definition JSON. */
export function contentHash(definition: SurveyDefinition): string {
  const canonical = JSON.stringify(canonicalize(definition));
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

/** The V1 release hash. Compute once and freeze for the active release. */
export const SURVEY_V1_HASH: string = contentHash(SURVEY_V1);

/** True when the given definition exactly matches the V1 release. */
export function isV1Release(definition: SurveyDefinition): boolean {
  return contentHash(definition) === SURVEY_V1_HASH;
}
