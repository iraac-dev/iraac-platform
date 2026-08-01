import { getAdminSession } from "@/lib/admin-guard";
import { listAuditLog, listConsentTimeline, listSubmissions } from "@/lib/admin-queries";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const session = await getAdminSession();
  const [submissions, consent, audit] = await Promise.all([
    listSubmissions(10).catch(() => []),
    listConsentTimeline(5).catch(() => []),
    listAuditLog(10).catch(() => []),
  ]);

  const grantedChannels = consent.reduce(
    (acc, p) => acc + p.events.filter((e) => e.kind === "consent" && e.granted).length,
    0,
  );
  const suppressions = consent.reduce(
    (acc, p) => acc + p.events.filter((e) => e.kind === "suppression").length,
    0,
  );

  return (
    <div className="admin-content">
      <h2>Overview</h2>
      <div className="admin-cards">
        <div className="admin-card">
          <strong>{submissions.length}+</strong>
          <span>recent submissions</span>
        </div>
        <div className="admin-card">
          <strong>{grantedChannels}</strong>
          <span>granted channels</span>
        </div>
        <div className="admin-card">
          <strong>{suppressions}</strong>
          <span>suppressions</span>
        </div>
        <div className="admin-card">
          <strong>{audit.length}+</strong>
          <span>audit events</span>
        </div>
      </div>

      <h3>Latest submissions (PII-free)</h3>
      {submissions.length === 0 ? (
        <p className="hint">No submissions yet.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Session</th>
              <th>Completed</th>
              <th>Mode</th>
              <th>Answers</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((s) => (
              <tr key={s.sessionId}>
                <td><code>{s.sessionId.slice(0, 8)}…</code></td>
                <td>{s.completedAt ? new Date(s.completedAt).toLocaleString() : "—"}</td>
                <td>{s.completionMode}</td>
                <td>{s.answerCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="hint">Signed in as {session?.email} ({session?.role}).</p>
    </div>
  );
}
