import { describe, expect, it } from "vitest";
import { ALL_PERMISSION_IDS, PERMISSION_CHANNEL, submitConsent, validateConsentInput, withdrawConsent } from "../lib/consent-submit";

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

  it("accepts an all-unticked permissions body when a usable endpoint was supplied", () => {
    const out = validateConsentInput({
      sessionId: "session-12345678",
      permissions: { I01: false, I02: false, I03: false, I04: false, I05: false },
      contact: { name: "Test Person", email: "test@example.com" },
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

  it("truncates display names but rejects malformed oversized endpoints", () => {
    const out = validateConsentInput({
      sessionId: "session-12345678",
      permissions: {},
      contact: { name: "x".repeat(500), email: "test@example.com" },
    });
    expect(out.contact?.name?.length).toBeLessThanOrEqual(120);
    expect(() => validateConsentInput({
      sessionId: "session-12345678",
      permissions: {},
      contact: { email: `${"a".repeat(500)}@example.com` },
    })).toThrow(/valid email/);
  });

  it("requires a matching endpoint for every granted channel", () => {
    expect(() => validateConsentInput({
      sessionId: "session-12345678",
      permissions: { I01: true },
      contact: { mobile: "0400000000" },
    })).toThrow(/email address/);
    expect(() => validateConsentInput({
      sessionId: "session-12345678",
      permissions: { I04: true },
      contact: { email: "test@example.com" },
    })).toThrow(/mobile number/);
  });

  it("does not treat I05 as recording consent", () => {
    expect(PERMISSION_CHANNEL.I05).toBeUndefined();
    expect(() => validateConsentInput({
      sessionId: "session-12345678",
      permissions: { I05: true },
      contact: { name: "Test Person" },
    })).toThrow(/skip this step/);
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

describe("submitConsent", () => {
  it("makes exactly one rpc call", async () => {
    const calls: { fn: string; args: Record<string, unknown> }[] = [];
    const fakeClient = {
      rpc: async (fn: string, args: Record<string, unknown>) => {
        calls.push({ fn, args });
        return {
          data: {
            created: true,
            receipt_id: "40000000-0000-0000-0000-000000000001",
            person_id: "40000000-0000-0000-0000-000000000002",
            granted_channels: ["email"],
          },
          error: null,
        };
      },
    } as never;

    const result = await submitConsent(fakeClient, {
      sessionId: "50000000-0000-0000-0000-000000000001",
      permissions: { I01: true, I02: false, I03: false, I04: false, I05: false },
      contact: { email: "a@example.com" },
    });

    expect(calls.length).toBe(1);
    expect(calls[0].fn).toBe("submit_consent");
    expect((calls[0].args.p_permissions as Record<string, boolean>).I01).toBe(true);
    expect(calls[0].args.p_session_id).toBe("50000000-0000-0000-0000-000000000001");
    expect(calls[0].args.p_email).toBe("a@example.com");
    expect(calls[0].args.p_token_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(result.receiptToken).toMatch(/^[0-9a-f]{64}$/);
    // The raw token is returned once; only its hash is sent to the RPC.
    expect(result.receiptToken).not.toBe(calls[0].args.p_token_hash);
    expect(result.grantedChannels).toEqual(["email"]);
    expect(result.receiptId).toBe("40000000-0000-0000-0000-000000000001");
    expect(result.expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("handles created:false idempotently", async () => {
    const fakeClient = {
      rpc: async () => ({
        data: {
          created: false,
          receipt_id: "40000000-0000-0000-0000-000000000009",
          person_id: null,
          granted_channels: [],
        },
        error: null,
      }),
    } as never;

    const result = await submitConsent(fakeClient, {
      sessionId: "50000000-0000-0000-0000-000000000001",
      permissions: { I01: false, I02: false, I03: false, I04: false, I05: false },
    });
    expect(result.ok).toBe(true);
    expect(result.receiptId).toBe("40000000-0000-0000-0000-000000000009");
  });

  it("surfaces rpc errors", async () => {
    const fakeClient = {
      rpc: async () => ({ data: null, error: { message: "boom" } }),
    } as never;
    await expect(
      submitConsent(fakeClient, {
        sessionId: "50000000-0000-0000-0000-000000000001",
        permissions: { I01: false, I02: false, I03: false, I04: false, I05: false },
      }),
    ).rejects.toThrow(/Failed to record consent/);
  });
});
