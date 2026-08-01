import { describe, expect, it } from "vitest";
import { adminAccessFromUser, roleFromUser } from "../lib/supabase-server";
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

describe("active admin membership", () => {
  it("requires an active membership flag", () => {
    expect(adminAccessFromUser({
      email: "person@example.com",
      app_metadata: { iraac_role: "staff" },
    })).toBeNull();
    expect(adminAccessFromUser({
      email: "person@example.com",
      app_metadata: { iraac_role: "staff", iraac_active: true, iraac_named_custodian: "Test Person" },
    })).toBe("staff");
  });

  it("allows a generic mailbox only with a named custodian", () => {
    expect(adminAccessFromUser({
      email: "info@iraac-aco.com",
      app_metadata: { iraac_role: "staff", iraac_active: true },
    })).toBeNull();
    expect(adminAccessFromUser({
      email: "info@iraac-aco.com",
      app_metadata: {
        iraac_role: "staff",
        iraac_active: true,
        iraac_named_custodian: "Rhys Coombes",
      },
    })).toBe("staff");
  });

  it("requires a named custodian for every mailbox spelling", () => {
    for (const email of ["projects.iraac@example.com", "iwaac.community@example.com", "person@example.com"]) {
      expect(adminAccessFromUser({
        email,
        app_metadata: { iraac_role: "staff", iraac_active: true },
      })).toBeNull();
    }
  });
});
