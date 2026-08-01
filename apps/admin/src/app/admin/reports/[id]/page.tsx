import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/survey-submit";
import {
  getReport,
  listReportVersions,
  transitionReport,
  REPORT_STATUSES,
} from "@/lib/report-admin";

export const dynamic = "force-dynamic";

const AUDIENCE_LABEL: Record<string, string> = {
  community_public: "Community (public)",
  staff_partner: "Staff / partner",
  government: "Government",
};

interface DetailProps {
  params: Promise<{ id: string }>;
}

async function performTransition(id: string, nextStatus: string): Promise<void> {
  "use server";
  try {
    const client = createAdminClient();
    await transitionReport(client, {
      reportId: id,
      nextStatus: nextStatus as never,
      reason: null,
      content: null,
      changeNote: null,
    });
  } catch (err) {
    // Server actions cannot return rich errors to the form without extra
    // plumbing; log for the audit trail. Transitions are also reachable via
    // the JSON API route which does surface errors to callers.
    console.error("report_transition_failed", err instanceof Error ? err.message : err);
  }
}

export default async function AdminReportDetail({ params }: DetailProps) {
  const { id } = await params;
  const client = createAdminClient();
  const [report, versions] = await Promise.all([
    getReport(client, id).catch(() => null),
    listReportVersions(client, id).catch(() => []),
  ]);

  if (!report) notFound();

  return (
    <div className="admin-content">
      <h2>{report.title}</h2>
      <p className="hint">
        Audience: {AUDIENCE_LABEL[report.audience] ?? report.audience} · Status: {report.status} ·
        Version: {report.current_version} · Snapshot: {report.snapshot_id.slice(0, 8)}…
      </p>
      {report.status === "published" && report.published_at && (
        <p className="hint">Published {new Date(report.published_at).toLocaleString()}.</p>
      )}
      {report.status === "retracted" && report.retract_reason && (
        <p className="hint">Retracted: {report.retract_reason}</p>
      )}

      <h3>Transition</h3>
      <p className="hint">
        Allowed transitions: draft → in_review → approved_locked → published (or retracted).
        Publishing is a named-human action; every transition is audited. Content changes
        append an immutable version.
      </p>

      <div className="admin-cards">
        {REPORT_STATUSES.filter((s) => s !== report.status).map((s) => (
          <form
            key={s}
            action={performTransition.bind(null, id, s)}
            className="inline-form"
          >
            <button type="submit" className="btn btn-secondary">
              Move to {s}
            </button>
          </form>
        ))}
      </div>

      <h3>Versions (immutable)</h3>
      {versions.length === 0 ? (
        <p className="hint">No versions yet.</p>
      ) : (
        <ul className="admin-list">
          {versions.map((v) => (
            <li key={v.version}>
              <strong>v{v.version}</strong>
              {" — "}
              {v.change_note ?? "no change note"} ({new Date(v.created_at).toLocaleString()})
              <pre className="report-content-preview">{v.content.slice(0, 500)}</pre>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
