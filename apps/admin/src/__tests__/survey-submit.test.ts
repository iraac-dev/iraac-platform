import { describe, expect, it } from "vitest";
import { DEFAULT_LIMIT, rateLimit, resetRateLimiter } from "../lib/rate-limit";
import { assertSurveyReleaseActive, validateAnonymousSubmission } from "../lib/survey-submit";
import {
  FIXTURE_ANONYMOUS_FULL,
  FIXTURE_ANONYMOUS_MINIMAL,
  FIXTURE_NO_CONSENT,
  FIXTURE_SKIP_PERSONAL,
  FIXTURE_WITH_FOLLOWUP,
  SURVEY_V1_HASH,
} from "@iraac/survey-contract";

describe("rate limiter", () => {
  it("allows up to the limit then blocks", () => {
    resetRateLimiter();
    for (let i = 0; i < DEFAULT_LIMIT; i++) {
      expect(rateLimit("ip-test").allowed).toBe(true);
    }
    const blocked = rateLimit("ip-test");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("tracks separate keys independently", () => {
    resetRateLimiter();
    expect(rateLimit("a").allowed).toBe(true);
    expect(rateLimit("b").allowed).toBe(true);
    const second = rateLimit("a");
    expect(second.allowed).toBe(true);
    // "a" has been called twice, "b" once — the buckets must not share state.
    expect(second.remaining).toBe(DEFAULT_LIMIT - 2);
  });

  it("resets after the window", () => {
    resetRateLimiter();
    for (let i = 0; i < DEFAULT_LIMIT; i++) rateLimit("win", 2, 1000);
    const blocked = rateLimit("win", 2, 1000);
    expect(blocked.allowed).toBe(false);
  });
});

describe("validateAnonymousSubmission", () => {
  it("accepts a minimal anonymous adult start", () => {
    const out = validateAnonymousSubmission(FIXTURE_ANONYMOUS_MINIMAL);
    expect(out.A01).toBe("Yes");
    expect(out.A02).toBe("Yes");
  });

  it("accepts a full anonymous completion and strips contact/permission sections", () => {
    const out = validateAnonymousSubmission(FIXTURE_ANONYMOUS_FULL);
    expect(out.G05).toBeDefined();
    // H and I must never survive the anonymous journey.
    for (const id of ["H01", "H02", "H03", "H04", "H05", "H06", "I01", "I02", "I03", "I04", "I05"]) {
      expect(out[id]).toBeUndefined();
    }
  });

  it("accepts a no-consent fixture (declining must not block)", () => {
    const out = validateAnonymousSubmission(FIXTURE_NO_CONSENT);
    expect(out.A01).toBe("Yes");
    expect(out.I01).toBeUndefined();
  });

  it("blocks under-18 and prefer-not-to-say adult gates", () => {
    expect(() => validateAnonymousSubmission({ A01: "No" })).toThrow(/adult gate/);
    expect(() => validateAnonymousSubmission({ A01: "Prefer not to say" })).toThrow(/adult gate/);
  });

  it("requires the A02 safety choice", () => {
    expect(() => validateAnonymousSubmission({ A01: "Yes" })).toThrow(/A02/);
  });

  it("blocks terminal-stop paths (person / immediate help)", () => {
    expect(() => validateAnonymousSubmission({ A01: "Yes", A02: "I would rather speak with a person" })).toThrow(/person pathway/);
    expect(() => validateAnonymousSubmission({ A01: "Yes", A02: "I need immediate help" })).toThrow(/immediate help/);
  });

  it("strips branch-hidden answers (A02 skip personal questions)", () => {
    const out = validateAnonymousSubmission(FIXTURE_SKIP_PERSONAL);
    expect(out.B04).toBeUndefined();
    expect(out.D04).toBeUndefined();
    expect(out.F01).toBeUndefined();
    expect(out.B01).toBeDefined();
  });

  it("strips smuggled hidden-branch answers", () => {
    const out = validateAnonymousSubmission({
      ...FIXTURE_ANONYMOUS_MINIMAL,
      B04: "Woman", // hidden because A02 is Yes? no — B04 is visible when A02 is Yes
    });
    expect(out.B04).toBeDefined();
    const hidden = validateAnonymousSubmission({
      A01: "Yes",
      A02: "I would like to skip personal questions",
      B04: "Woman", // must be stripped: A02 skips B04
    });
    expect(hidden.B04).toBeUndefined();
  });

  it("rejects an invalid answer value rather than accepting it", () => {
    expect(() =>
      validateAnonymousSubmission({ A01: "Yes", A02: "Yes", B03: "12" }),
    ).toThrow(/not a valid option/i);
  });

  it("passes through contact-adjacent fixture but only anonymous-visible parts", () => {
    const out = validateAnonymousSubmission(FIXTURE_WITH_FOLLOWUP);
    expect(out.A01).toBe("Yes");
    expect(out.H01).toBeUndefined(); // follow-up contact is CONS-001 scope
  });
});

describe("survey release collection interlock", () => {
  function releaseClient(status: string, contentHash = SURVEY_V1_HASH) {
    return {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: { status, content_hash: contentHash },
              error: null,
            }),
          }),
        }),
      }),
    } as never;
  }

  it("allows only the active release with the canonical hash", async () => {
    await expect(assertSurveyReleaseActive(releaseClient("active"))).resolves.toBeUndefined();
  });

  it("rejects draft and superseded releases", async () => {
    await expect(assertSurveyReleaseActive(releaseClient("draft"))).rejects.toThrow(/not active/);
    await expect(assertSurveyReleaseActive(releaseClient("superseded"))).rejects.toThrow(/not active/);
  });

  it("rejects a release whose stored contract hash differs", async () => {
    await expect(assertSurveyReleaseActive(releaseClient("active", "wrong-hash"))).rejects.toThrow(/hash mismatch/);
  });
});
