import { getAdminSession } from "@/lib/admin-guard";
import { listAuditLog } from "@/lib/admin-queries";

export const dynamic = "force-dynamic";

export default async function AdminAudit() {
  await getAdminSession();
  const audit = await listAuditLog(100).catch(() => []);

  return (
    <div className="admin-content">
      <h2>Audit log</h2>
      <p className="hint">Read-only. Nothing in the audit log is mutable.</p>
      {audit.length === 0 ? (
        <p className="hint">No audit events yet.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {audit.map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.occurredAt).toLocaleString()}</td>
                <td>{r.actorType}{r.actorId ? ` (${r.actorId.slice(0, 8)})` : ""}</td>
                <td><code>{r.action}</code></td>
                <td>{r.entityType ?? "—"}</td>
                <td>{r.reason ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
