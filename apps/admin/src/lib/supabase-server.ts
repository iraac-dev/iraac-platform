import { createClient, type SupabaseClient } from "@supabase/supabase-js";
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

/**
 * R3 (ADMIN-001): roles held in public.staff_memberships. The JWT
 * app_metadata role claim is NOT authoritative — an active, unexpired
 * membership row for the authenticated auth user is (see
 * public.active_staff_roles). Mirrors the migration's role check constraint.
 */
export type AdminRole =
  | "viewer"
  | "analyst"
  | "report_author"
  | "approver"
  | "communications_operator"
  | "admin";

/** Precedence for collapsing several active roles into the single guard role (highest wins). */
const ROLE_PRECEDENCE: readonly AdminRole[] = [
  "admin",
  "approver",
  "communications_operator",
  "report_author",
  "analyst",
  "viewer",
];

/** The highest-privilege role in `roles`, or null when none are present. */
export function highestPrivilegeRole(roles: readonly AdminRole[]): AdminRole | null {
  for (const candidate of ROLE_PRECEDENCE) {
    if (roles.includes(candidate)) return candidate;
  }
  return null;
}

/**
 * Minimal service-role client (server-only env). Same pattern as
 * survey-submit.ts's createAdminClient(); kept local so the guard does not
 * drag the survey contract in, and to avoid any import cycle.
 */
function createServiceRoleClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (server-only env)");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * R3 authoritative role resolution. Queries public.active_staff_roles via the
 * service role, which returns ONLY memberships with status='active' and
 * (valid_until is null or valid_until > now()) — expired/revoked/pending rows
 * are invisible. Filters rows to the known AdminRole union. Fail closed:
 * returns [] on any error, missing env, or unexpected payload.
 */
export async function resolveActiveStaffRoles(userId: string): Promise<AdminRole[]> {
  try {
    const client = createServiceRoleClient();
    const { data, error } = await client.rpc("active_staff_roles", { p_auth_user_id: userId });
    if (error || !Array.isArray(data)) return [];

    const roles: AdminRole[] = [];
    const known = ROLE_PRECEDENCE as readonly string[];
    for (const row of data) {
      const value = (row as { role?: unknown })?.role;
      if (typeof value !== "string" || !known.includes(value)) continue;
      if (!roles.includes(value as AdminRole)) roles.push(value as AdminRole);
    }
    return roles;
  } catch {
    return [];
  }
}
