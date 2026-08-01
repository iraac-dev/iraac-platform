import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, submitAnonymousSurvey } from "@/lib/survey-submit";
import { rateLimit } from "@/lib/rate-limit";
import { SURVEY_V1_HASH } from "@iraac/survey-contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
} as const;

interface SubmitBody {
  answers?: Record<string, unknown>;
  clientToken?: string;
  completionMode?: string;
}

export async function POST(req: NextRequest) {
  // Rate limit by IP (x-forwarded-for first hop on Vercel).
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = rateLimit(`survey:${ip}`);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, status: "rate_limited", reason: "Too many submissions. Please try again later." },
      { status: 429, headers: { ...NO_STORE, "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  let body: SubmitBody;
  try {
    body = (await req.json()) as SubmitBody;
  } catch {
    return NextResponse.json({ ok: false, status: "invalid", reason: "Invalid JSON body" }, { status: 400, headers: NO_STORE });
  }

  const answers = body.answers;
  const clientToken = body.clientToken;
  if (!answers || typeof answers !== "object" || !clientToken || typeof clientToken !== "string") {
    return NextResponse.json(
      { ok: false, status: "invalid", reason: "answers and clientToken are required" },
      { status: 400, headers: NO_STORE },
    );
  }
  if (clientToken.length < 16 || clientToken.length > 128) {
    return NextResponse.json({ ok: false, status: "invalid", reason: "clientToken has an invalid length" }, { status: 400, headers: NO_STORE });
  }

  const mode = body.completionMode;
  if (mode && !["web", "staff", "phone", "ai_voice", "drop_in", "home_visit"].includes(mode)) {
    return NextResponse.json({ ok: false, status: "invalid", reason: "Invalid completionMode" }, { status: 400, headers: NO_STORE });
  }

  try {
    const client = createAdminClient();
    const result = await submitAnonymousSurvey(client, {
      answers: answers as never,
      clientToken,
      completionMode: (mode as never) ?? undefined,
    });

    if (result.status === "duplicate") {
      // Idempotent: same token -> same completion, 200 not 409.
      return NextResponse.json({ ok: true, status: "duplicate", reason: result.reason }, { status: 200, headers: NO_STORE });
    }
    return NextResponse.json(
      { ok: true, status: "completed", sessionId: result.sessionId, completionRef: result.completionRef, releaseHash: SURVEY_V1_HASH },
      { status: 200, headers: NO_STORE },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    // Validation failures are 400 (client problem); DB/server failures are 500.
    if (/blocked|invalid|unknown question/i.test(message)) {
      return NextResponse.json({ ok: false, status: "invalid", reason: message }, { status: 400, headers: NO_STORE });
    }
    console.error("SURV-002 submit failure", { message });
    return NextResponse.json({ ok: false, status: "error", reason: "Server error" }, { status: 500, headers: NO_STORE });
  }
}
