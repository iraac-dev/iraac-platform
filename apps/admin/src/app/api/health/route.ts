import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/survey-submit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * OPS-001 public health endpoint.
 *
 * Liveness + DB readiness. Returns no PII, no internal hostnames, no keys.
 * Used by load balancers / uptime checks / the REL-P1 rehearsal.
 */
export async function GET() {
  const started = Date.now();
  try {
    const client = createAdminClient();
    const { error } = await Promise.race([
      client.from("survey_sessions").select("id").limit(1),
      new Promise<{ error: Error }>((resolve) => {
        setTimeout(() => resolve({ error: new Error("Database readiness timeout") }), 3000);
      }),
    ]);
    if (error) {
      return NextResponse.json(
        { ok: false, db: "down", ms: Date.now() - started },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(
      { ok: true, db: "up", ms: Date.now() - started },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { ok: false, db: "down", ms: Date.now() - started },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
