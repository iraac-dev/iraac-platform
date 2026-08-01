import { describe, expect, it } from "vitest";
import { ALL_PERMISSION_IDS, validateConsentInput, withdrawConsent } from "../lib/consent-submit";

describe("validateConsentInput", () => {
  it("accepts a valid body with ticked and unticked permissions", () => {
    const out = validateConsentInput({
      sessionId: "session-12345678",
      permissions: { I01: true, I02: false, I03: false, I04: false, I05: false },
      contact: { name: "Test Person", email: "test@example.com" },
    });
    expect(out.sessionId).toBe("session-12345678");
    expect(out.permissions.I01).toBe(true);
    expect(out.permissions.I02).toBe(false);
    expect(out.contact?.email).toBe("test@example.com");
  });

  it("accepts an all-unticked permissions body (nothing granted by default)", () => {
    const out = validateConsentInput({
      sessionId: "session-12345678",
      permissions: { I01: false, I02: false, I03: false, I04: false, I05: false },
    });
    expect(Object.values(out.permissions).every((v) => v === false)).toBe(true);
  });

  it("rejects an unknown permission id", () => {
    expect(() =>
      validateConsentInput({ sessionId: "session-12345678", permissions: { I99: true } }),
    ).toThrow(/Unknown permission/);
  });

  it("rejects a non-boolean permission value", () => {
    expect(() =>
      validateConsentInput({ sessionId: "session-12345678", permissions: { I01: "yes" } }),
    ).toThrow(/must be a boolean/);
  });

  it("rejects a missing sessionId", () => {
    expect(() => validateConsentInput({ permissions: { I01: true } })).toThrow(/sessionId/);
  });

  it("rejects non-object permissions", () => {
    expect(() => validateConsentInput({ sessionId: "session-12345678", permissions: ["I01"] })).toThrow(/permissions/);
  });

  it("truncates contact fields to contract-safe lengths", () => {
    const out = validateConsentInput({
      sessionId: "session-12345678",
      permissions: {},
      contact: { name: "x".repeat(500), email: "a".repeat(500) },
    });
    expect(out.contact?.name?.length).toBeLessThanOrEqual(120);
    expect(out.contact?.email?.length).toBeLessThanOrEqual(200);
  });
});

describe("withdrawConsent validation", () => {
  it("rejects a short/empty token before touching the DB", async () => {
    const client = { from: () => ({}) } as never;
    await expect(withdrawConsent(client, "short")).rejects.toThrow(/token/);
    await expect(withdrawConsent(client, "")).rejects.toThrow(/token/);
  });

  it("rejects an unknown channel", async () => {
    const client = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: { id: "1", person_id: "p1", channel: "email", expires_at: new Date(Date.now() + 100000).toISOString(), revoked_at: null },
              error: null,
            }),
          }),
        }),
      }),
    } as never;
    await expect(withdrawConsent(client, "a".repeat(40), "fax")).rejects.toThrow(/Unknown channel/);
  });
});

describe("permission channel map", () => {
  it("covers exactly I01–I05", () => {
    expect(ALL_PERMISSION_IDS).toEqual(["I01", "I02", "I03", "I04", "I05"]);
  });
});
