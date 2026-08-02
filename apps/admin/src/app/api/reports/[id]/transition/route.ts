import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-guard";
import { createAdminClient } from "@/lib/survey-submit";
import {
  transitionReport,
  REPORT_STATUSES,
  type ReportStatus,
} from "@/lib/report-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
} as const;

interface TransitionBody {
  nextStatus?: string;
  reason?: string | null;
  content?: string | null;
  changeNote?: string | null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, reason: "Unauthorized" }, { status: 401, headers: NO_STORE });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ ok: false, reason: "Report id required" }, { status: 400, headers: NO_STORE });
  }

  let body: TransitionBody;
  try {
    body = (await req.json()) as TransitionBody;
  } catch {
    return NextResponse.json({ ok: false, reason: "Invalid JSON body" }, { status: 400, headers: NO_STORE });
  }

  const nextStatus = body.nextStatus as ReportStatus | undefined;
  if (!nextStatus || !REPORT_STATUSES.includes(nextStatus)) {
    return NextResponse.json({ ok: false, reason: "Invalid nextStatus" }, { status: 400, headers: NO_STORE });
  }

  try {
    const client = createAdminClient();
    const result = await transitionReport(client, {
      reportId: id,
      nextStatus,
      reason: body.reason ?? null,
      content: body.content ?? null,
      changeNote: body.changeNote ?? null,
    });
    return NextResponse.json({ ok: true, ...result }, { status: 200, headers: NO_STORE });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    // Known client problems -> 400; everything else -> 500 (mirror the
    // survey submit route's mapping style).
    if (/report not found|invalid report transition|content is unchanged/i.test(message)) {
      return NextResponse.json({ ok: false, reason: message }, { status: 400, headers: NO_STORE });
    }
    return NextResponse.json({ ok: false, reason: "Server error" }, { status: 500, headers: NO_STORE });
  }
}
