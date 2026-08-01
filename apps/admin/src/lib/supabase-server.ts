import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * ADMIN-001: server-side Supabase client for the dashboard.
 *
 * Reads the session cookie set by the login flow. This is the *user* session
 * (anon key, user-scoped) — used only to verify who is logged in. All data
 * queries go through the service-role client (see admin-queries.ts) after the
 * role guard passes, matching the SURV-002/CONS-001 server-only pattern.
 */
export async function createServerSupabase() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component — safe to ignore when middleware
            // is refreshing sessions. The app is server-side guarded.
          }
        },
      },
    },
  );
}

export type AdminRole = "staff" | "auditor";

/** Role claim read from the JWT app_metadata (set at user creation). */
export function roleFromUser(user: { app_metadata?: Record<string, unknown> } | null): AdminRole | null {
  const role = user?.app_metadata?.iraac_role;
  return role === "staff" || role === "auditor" ? role : null;
}
