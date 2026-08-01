import { getAdminSession } from "@/lib/admin-guard";
import { listConsentTimeline } from "@/lib/admin-queries";

export const dynamic = "force-dynamic";

export default async function AdminConsent() {
  await getAdminSession();
  const timeline = await listConsentTimeline(20).catch(() => []);

  return (
    <div className="admin-content">
      <h2>Consent &amp; suppression timeline</h2>
      <p className="hint">
        Grants, revocations and withdrawals per person, newest first. Every
        grant links to the exact wording version the person saw.
      </p>
      {timeline.length === 0 ? (
        <p className="hint">No consent records yet.</p>
      ) : (
        timeline.map((p) => (
          <section key={p.personId} className="admin-person">
            <h3>{p.name ?? "Unnamed person"}{p.email ? ` — ${p.email}` : ""}</h3>
            <p className="hint"><code>{p.personId}</code></p>
            {p.events.length === 0 ? (
              <p className="hint">No events.</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Kind</th>
                    <th>Channel</th>
                    <th>State</th>
                  </tr>
                </thead>
                <tbody>
                  {p.events.map((e, i) => (
                    <tr key={i}>
                      <td>{new Date(e.recordedAt).toLocaleString()}</td>
                      <td>{e.kind}</td>
                      <td>{e.channel ?? "global"}</td>
                      <td>
                        {e.kind === "consent"
                          ? e.granted ? "granted" : "revoked"
                          : e.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        ))
      )}
    </div>
  );
}
