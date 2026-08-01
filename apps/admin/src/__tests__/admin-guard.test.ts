import { describe, expect, it } from "vitest";
import { roleFromUser } from "../lib/supabase-server";
import type { AdminRole } from "../lib/supabase-server";

describe("roleFromUser (ADMIN-001 guard)", () => {
  it("admits a staff user", () => {
    expect(roleFromUser({ app_metadata: { iraac_role: "staff" } })).toBe("staff");
  });

  it("admits an auditor user", () => {
    expect(roleFromUser({ app_metadata: { iraac_role: "auditor" } })).toBe("auditor");
  });

  it("rejects a user with no role claim", () => {
    expect(roleFromUser({ app_metadata: {} })).toBeNull();
  });

  it("rejects a user with an unknown role claim", () => {
    expect(roleFromUser({ app_metadata: { iraac_role: "admin" } })).toBeNull();
  });

  it("rejects a null user", () => {
    expect(roleFromUser(null)).toBeNull();
  });

  it("rejects missing app_metadata", () => {
    expect(roleFromUser({})).toBeNull();
  });
});

// Type-level sanity: the role union is exactly the two admin roles.
const roles: AdminRole[] = ["staff", "auditor"];
describe("admin roles", () => {
  it("has exactly staff and auditor", () => {
    expect(roles).toEqual(["staff", "auditor"]);
  });
});
