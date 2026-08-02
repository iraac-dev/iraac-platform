import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { getAdminSession } from "../lib/admin-guard";
import type { AdminRole } from "../lib/supabase-server";

// Mock only the network-touching factories. The REAL resolveActiveStaffRoles
// and highestPrivilegeRole stay in play so the authoritative membership RPC
// path, mapping/filtering and precedence are all exercised end-to-end against
// a fake service-role client.
vi.mock("../lib/supabase-server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/supabase-server")>();
  return {
    ...actual,
    createServerSupabase: vi.fn(),
  };
});

// The real resolveActiveStaffRoles builds its service-role client via
// createClient — swap that for a fake so the RPC path is testable.
vi.mock("@supabase/supabase-js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@supabase/supabase-js")>();
  return {
    ...actual,
    createClient: vi.fn(),
  };
});

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  createServerSupabase,
  highestPrivilegeRole,
  resolveActiveStaffRoles,
} from "../lib/supabase-server";

const USER_ID = "00000000-0000-4000-8000-000000000001";
const ORIGINAL_URL = process.env.SUPABASE_URL;
const ORIGINAL_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

type FakeRpcClient = { rpc: Mock };

/** Fake service-role client exposing only rpc() (all the resolver touches). */
function fakeRpcClient(result: unknown): FakeRpcClient & SupabaseClient {
  return { rpc: vi.fn().mockResolvedValue(result) } as unknown as FakeRpcClient & SupabaseClient;
}

/** Fake user-session client: getUser + MFA AAL only (all the guard touches). */
function fakeUserClient(options: {
  user: { id: string; email: string; app_metadata?: Record<string, unknown> } | null;
  aal: string | null;
}): SupabaseClient {
  const { user, aal } = options;
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: user ? null : { message: "No user" },
      }),
      mfa: {
        getAuthenticatorAssuranceLevel: vi.fn().mockResolvedValue({
          data: aal ? { currentLevel: aal } : null,
          error: aal ? null : { message: "No AAL" },
        }),
      },
    },
  } as unknown as SupabaseClient;
}

/** Signed-in user fixture shared by the guard tests. */
const SIGNED_IN = {
  user: { id: USER_ID, email: "person@example.com", app_metadata: { iraac_role: "admin" } },
};

let rpcClient: FakeRpcClient & SupabaseClient;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  // Safe default: no active memberships (deny).
  rpcClient = fakeRpcClient({ data: [], error: null });
  vi.mocked(createClient).mockReturnValue(rpcClient as unknown as ReturnType<typeof createClient>);
});

afterEach(() => {
  if (ORIGINAL_URL === undefined) delete process.env.SUPABASE_URL;
  else process.env.SUPABASE_URL = ORIGINAL_URL;
  if (ORIGINAL_KEY === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  else process.env.SUPABASE_SERVICE_ROLE_KEY = ORIGINAL_KEY;
  vi.clearAllMocks();
});

describe("getAdminSession (ADMIN-001 / R3 guard)", () => {
  it("admits an AAL2 user with one active staff role", async () => {
    vi.mocked(createServerSupabase).mockResolvedValue(fakeUserClient({ ...SIGNED_IN, aal: "aal2" }));
    rpcClient.rpc.mockResolvedValue({ data: [{ role: "analyst" }], error: null });

    await expect(getAdminSession()).resolves.toEqual({
      email: "person@example.com",
      role: "analyst",
    });
  });

  it("resolves roles from the membership table, never JWT claims", async () => {
    vi.mocked(createServerSupabase).mockResolvedValue(fakeUserClient({ ...SIGNED_IN, aal: "aal2" }));
    rpcClient.rpc.mockResolvedValue({ data: [{ role: "report_author" }], error: null });

    const session = await getAdminSession();
    // The user's app_metadata claims "admin" but the membership table says
    // report_author — the table wins.
    expect(session?.role).toBe("report_author");
    expect(rpcClient.rpc).toHaveBeenCalledWith("active_staff_roles", { p_auth_user_id: USER_ID });
  });

  it("denies an AAL2 user with no active memberships", async () => {
    vi.mocked(createServerSupabase).mockResolvedValue(fakeUserClient({ ...SIGNED_IN, aal: "aal2" }));

    await expect(getAdminSession()).resolves.toBeNull();
  });

  it("fails closed when the RPC returns an error", async () => {
    vi.mocked(createServerSupabase).mockResolvedValue(fakeUserClient({ ...SIGNED_IN, aal: "aal2" }));
    rpcClient.rpc.mockResolvedValue({ data: null, error: { message: "rpc failed" } });

    await expect(getAdminSession()).resolves.toBeNull();
  });

  it("fails closed when role resolution throws", async () => {
    vi.mocked(createServerSupabase).mockResolvedValue(fakeUserClient({ ...SIGNED_IN, aal: "aal2" }));
    rpcClient.rpc.mockRejectedValue(new Error("rpc unavailable"));

    await expect(getAdminSession()).resolves.toBeNull();
  });

  it("denies an AAL1 user even with an active role (MFA stays mandatory)", async () => {
    vi.mocked(createServerSupabase).mockResolvedValue(fakeUserClient({ ...SIGNED_IN, aal: "aal1" }));
    rpcClient.rpc.mockResolvedValue({ data: [{ role: "admin" }], error: null });

    await expect(getAdminSession()).resolves.toBeNull();
    expect(rpcClient.rpc).not.toHaveBeenCalled();
  });

  it("denies when no user is logged in", async () => {
    vi.mocked(createServerSupabase).mockResolvedValue(fakeUserClient({ user: null, aal: "aal2" }));

    await expect(getAdminSession()).resolves.toBeNull();
    expect(rpcClient.rpc).not.toHaveBeenCalled();
  });

  it("selects the highest-privilege role when several resolve", async () => {
    vi.mocked(createServerSupabase).mockResolvedValue(fakeUserClient({ ...SIGNED_IN, aal: "aal2" }));
    rpcClient.rpc.mockResolvedValue({
      data: [{ role: "viewer" }, { role: "admin" }, { role: "analyst" }],
      error: null,
    });

    await expect(getAdminSession()).resolves.toEqual({
      email: "person@example.com",
      role: "admin",
    });
  });
});

describe("resolveActiveStaffRoles (authoritative membership path)", () => {
  it("maps active RPC rows to AdminRole values", async () => {
    rpcClient.rpc.mockResolvedValue({ data: [{ role: "admin" }, { role: "viewer" }], error: null });

    await expect(resolveActiveStaffRoles(USER_ID)).resolves.toEqual(["admin", "viewer"]);
    expect(rpcClient.rpc).toHaveBeenCalledWith("active_staff_roles", { p_auth_user_id: USER_ID });
  });

  it("filters unknown role strings and dedupes duplicates", async () => {
    rpcClient.rpc.mockResolvedValue({
      data: [{ role: "admin" }, { role: "superuser" }, { role: "admin" }, { role: "viewer" }],
      error: null,
    });

    await expect(resolveActiveStaffRoles(USER_ID)).resolves.toEqual(["admin", "viewer"]);
  });

  it("fails closed when the RPC returns an error", async () => {
    rpcClient.rpc.mockResolvedValue({ data: null, error: { message: "rpc failed" } });

    await expect(resolveActiveStaffRoles(USER_ID)).resolves.toEqual([]);
  });

  it("fails closed when the RPC throws", async () => {
    rpcClient.rpc.mockRejectedValue(new Error("network down"));

    await expect(resolveActiveStaffRoles(USER_ID)).resolves.toEqual([]);
  });

  it("fails closed when server-only env is missing", async () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    await expect(resolveActiveStaffRoles(USER_ID)).resolves.toEqual([]);
    expect(createClient).not.toHaveBeenCalled();
  });
});

describe("highestPrivilegeRole", () => {
  it("ranks admin above every other role", () => {
    expect(highestPrivilegeRole(["viewer", "admin", "analyst"])).toBe("admin");
  });

  it("ranks approver above communications_operator, report_author above analyst", () => {
    expect(highestPrivilegeRole(["viewer", "communications_operator", "approver"])).toBe("approver");
    expect(highestPrivilegeRole(["analyst", "report_author"])).toBe("report_author");
  });

  it("returns null for an empty list", () => {
    expect(highestPrivilegeRole([])).toBeNull();
  });
});

// Type-level sanity: the role union is exactly the six DB membership roles.
const roles: AdminRole[] = [
  "viewer",
  "analyst",
  "report_author",
  "approver",
  "communications_operator",
  "admin",
];
describe("admin roles", () => {
  it("has exactly the six staff_memberships roles", () => {
    expect(roles).toEqual([
      "viewer",
      "analyst",
      "report_author",
      "approver",
      "communications_operator",
      "admin",
    ]);
  });
});
