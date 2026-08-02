import {
  createServerSupabase,
  highestPrivilegeRole,
  resolveActiveStaffRoles,
} from "./supabase-server";
import type { AdminRole } from "./supabase-server";

/**
 * ADMIN-001 guard: returns the verified admin session (email + role) or null.
 * Called from server components/layouts; when null the caller redirects to
 * /admin/login. Anonymous users are never admitted.
 *
 * R3: the role is resolved from the authoritative public.staff_memberships
 * table via the public.active_staff_roles RPC (service role) — the JWT
 * app_metadata role claim is never trusted. AAL2 (hardware/software MFA)
 * stays mandatory. Any error fails closed (returns null).
 */
export async function getAdminSession(): Promise<
  { email: string; role: AdminRole } | null
> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { data: assurance, error: assuranceError } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assuranceError || assurance?.currentLevel !== "aal2") return null;

  const roles = await resolveActiveStaffRoles(user.id).catch(() => [] as AdminRole[]);
  const role = highestPrivilegeRole(roles);
  if (!role) return null;

  return { email: user.email ?? "unknown", role };
}
