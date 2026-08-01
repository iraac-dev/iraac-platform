import { getAdminSession } from "@/lib/admin-guard";
import { listSubmissions } from "@/lib/admin-queries";

export const dynamic = "force-dynamic";

export default async function AdminSubmissions() {
  await getAdminSession();
  const submissions = await listSubmissions(50).catch(() => []);

  return (
    <div className="admin-content">
      <h2>Submissions</h2>
      <p className="hint">
        Personal details are masked by default. Anonymous submissions carry no
        person link, so nothing here reveals an identity unless staff
        explicitly linked a consent record.
      </p>
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
    </div>
  );
}
