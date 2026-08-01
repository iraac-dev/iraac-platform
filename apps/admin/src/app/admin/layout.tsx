import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-guard";
import { signOut } from "./actions";

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  // Anonymous or wrong-role: never admitted to the dashboard.
  if (!session) redirect("/staff-sign-in");

  return (
    <main className="admin-page">
      <header className="admin-header">
        <p className="survey-kicker">IRAAC platform — staff area</p>
        <div className="admin-nav">
          <Link href="/admin">Overview</Link>
          <Link href="/admin/submissions">Submissions</Link>
          <Link href="/admin/consent">Consent</Link>
          <Link href="/admin/audit">Audit log</Link>
          <Link href="/admin/staff">Staff access</Link>
        </div>
        <p className="admin-session">
          Signed in as <strong>{session.email}</strong> ({session.role}) ·{" "}
          <form action={signOut} className="inline-form">
            <button type="submit" className="btn-link">Sign out</button>
          </form>
        </p>
      </header>
      {children}
    </main>
  );
}
