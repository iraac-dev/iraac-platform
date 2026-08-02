import { getAdminSession } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

/**
 * Staff access review. ADMIN-001 acceptance: shared/generic mailbox can never
 * become admin without named custodianship. In this platform, staff roles are
 * granted per named user via app_metadata.iraac_role — there is no shared
 * "admin" mailbox role, and the role claim is set at user creation, never by
 * a shared inbox. This page documents that posture and lists the known roles.
 */
export default async function AdminStaff() {
  await getAdminSession();

  return (
    <div className="admin-content">
      <h2>Staff access review</h2>
      <p className="hint">
        Roles are granted to named individuals only (app_metadata.iraac_role on
        the Supabase Auth user). There is no shared or generic-mailbox admin
        role. Audit events record who acted, never a shared credential.
      </p>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Role</th>
            <th>Can</th>
            <th>Cannot</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>staff</code></td>
            <td>Read submissions (masked), consent timeline, audit log</td>
            <td>Nothing beyond reviewed actions (enforced by RLS + guard)</td>
          </tr>
          <tr>
            <td><code>auditor</code></td>
            <td>Read-only ledger access</td>
            <td>Any write; no consent management</td>
          </tr>
        </tbody>
      </table>
      <p className="hint">
        A full live user list (emails + roles) is a REL-P1 item — real
        invitations are gated behind named-human approval.
      </p>
    </div>
  );
}
