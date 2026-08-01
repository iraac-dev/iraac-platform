import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/survey-submit";
import { withdrawConsent } from "@/lib/consent-submit";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
} as const;

interface WithdrawBody {
  token?: string;
  channel?: string;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = rateLimit(`withdraw:${ip}`);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, status: "rate_limited", reason: "Too many requests. Please try again later." },
      { status: 429, headers: { ...NO_STORE, "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  let body: WithdrawBody;
  try {
    body = (await req.json()) as WithdrawBody;
  } catch {
    return NextResponse.json({ ok: false, status: "invalid", reason: "Invalid JSON body" }, { status: 400, headers: NO_STORE });
  }

  const token = body.token;
  if (!token || typeof token !== "string") {
    return NextResponse.json({ ok: false, status: "invalid", reason: "token is required" }, { status: 400, headers: NO_STORE });
  }

  try {
    const client = createAdminClient();
    const result = await withdrawConsent(client, token, body.channel);
    return NextResponse.json(result, { status: 200, headers: NO_STORE });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (/required|not found|already used|expired|Unknown channel/i.test(message)) {
      return NextResponse.json({ ok: false, status: "invalid", reason: message }, { status: 400, headers: NO_STORE });
    }
    console.error("CONS-001 withdrawal failure", { message });
    return NextResponse.json({ ok: false, status: "error", reason: "Server error" }, { status: 500, headers: NO_STORE });
  }
}
