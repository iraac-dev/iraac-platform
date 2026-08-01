import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-guard";
import AdminLoginClient from "./login-client";

export const metadata: Metadata = {
  title: "Staff sign in — IRAAC",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  const session = await getAdminSession();
  // Already signed in: skip the login form.
  if (session) redirect("/admin");
  return <AdminLoginClient />;
}
