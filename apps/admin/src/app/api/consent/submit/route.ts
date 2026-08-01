import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/survey-submit";
import { submitConsent, validateConsentInput } from "@/lib/consent-submit";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
} as const;

export async function POST(req: NextRequest) {
  // Rate limit by IP (x-forwarded-for first hop on Vercel).
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = rateLimit(`consent:${ip}`);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, status: "rate_limited", reason: "Too many requests. Please try again later." },
      { status: 429, headers: { ...NO_STORE, "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, status: "invalid", reason: "Invalid JSON body" }, { status: 400, headers: NO_STORE });
  }

  let input;
  try {
    input = validateConsentInput(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid consent body";
    return NextResponse.json({ ok: false, status: "invalid", reason: message }, { status: 400, headers: NO_STORE });
  }

  try {
    const client = createAdminClient();
    const result = await submitConsent(client, input);
    // The receipt token is returned exactly once. It is never logged.
    return NextResponse.json(result, { status: 200, headers: NO_STORE });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (/required|not found|not completed|already recorded|wording/i.test(message)) {
      return NextResponse.json({ ok: false, status: "invalid", reason: message }, { status: 400, headers: NO_STORE });
    }
    console.error("CONS-001 consent submit failure", { message });
    return NextResponse.json({ ok: false, status: "error", reason: "Server error" }, { status: 500, headers: NO_STORE });
  }
}
