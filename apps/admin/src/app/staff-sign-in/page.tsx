import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-guard";
import StaffSignInClient from "./staff-sign-in-client";

export const metadata: Metadata = {
  title: "Staff sign in — IRAAC",
  robots: { index: false, follow: false },
};

export default async function StaffSignInPage() {
  const session = await getAdminSession();
  if (session) redirect("/admin");
  return <StaffSignInClient />;
}
