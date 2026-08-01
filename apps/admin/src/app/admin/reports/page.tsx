import Link from "next/link";
import { createAdminClient } from "@/lib/survey-submit";
import { listReports } from "@/lib/report-admin";

export const dynamic = "force-dynamic";

const AUDIENCE_LABEL: Record<string, string> = {
  community_public: "Community (public)",
  staff_partner: "Staff / partner",
  government: "Government",
};

export default async function AdminReportsPage() {
  const client = createAdminClient();
  const reports = await listReports(client).catch(() => []);

  return (
    <div className="admin-content">
      <h2>Governed reports</h2>
      <p className="hint">
        Reports precede any outbound communications. Publication requires a named human
        approval; no automated path publishes.
      </p>

      {reports.length === 0 ? (
        <p className="hint">No reports yet.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Audience</th>
              <th>Status</th>
              <th>Version</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id}>
                <td>
                  <Link href={`/admin/reports/${r.id}`}>{r.title}</Link>
                </td>
                <td>{AUDIENCE_LABEL[r.audience] ?? r.audience}</td>
                <td><span className={`status-badge status-${r.status}`}>{r.status}</span></td>
                <td>{r.current_version}</td>
                <td>{r.updated_at ? new Date(r.updated_at).toLocaleString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
