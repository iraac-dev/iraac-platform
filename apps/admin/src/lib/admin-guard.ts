import { adminAccessFromUser, createServerSupabase } from "./supabase-server";
import type { AdminRole } from "./supabase-server";

/**
 * ADMIN-001 guard: returns the verified admin session (email + role) or null.
 * Called from server components/layouts; when null the caller redirects to
 * /admin/login. Anonymous users are never admitted.
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

  const role = adminAccessFromUser(user);
  if (!role) return null;

  return { email: user.email ?? "unknown", role };
}
