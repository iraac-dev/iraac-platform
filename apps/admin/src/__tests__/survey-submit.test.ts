import { describe, expect, it } from "vitest";
import { DEFAULT_LIMIT, rateLimit, resetRateLimiter } from "../lib/rate-limit";
import { assertSurveyReleaseActive, buildAnswerRows, validateAnonymousSubmission } from "../lib/survey-submit";
import {
  FIXTURE_ANONYMOUS_FULL,
  FIXTURE_ANONYMOUS_MINIMAL,
  FIXTURE_NO_CONSENT,
  FIXTURE_SKIP_PERSONAL,
  FIXTURE_WITH_FOLLOWUP,
  SURVEY_V1_HASH,
  validateAnswers,
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

  it("preserves composite repeat keys under the same composite keys", () => {
    const out = validateAnonymousSubmission(FIXTURE_ANONYMOUS_FULL);
    expect(out["E01#Housing or homelessness"]).toEqual(["Cost", "Waiting time"]);
    expect(out["E01#Work"]).toEqual(["Waiting time"]);
    expect(out["E02#Housing or homelessness"]).toBe("More affordable housing options and easier access to services.");
    expect(out["E02#Work"]).toBe("Work experience pathways would help.");
    expect(out["E03#Housing or homelessness"]).toBe("Yes but it did not help enough");
    expect(out["E03#Work"]).toBe("No");
    // The base templates themselves must not appear as plain ids.
    expect(out.E01).toBeUndefined();
    expect(out.E02).toBeUndefined();
    expect(out.E03).toBeUndefined();
  });

  it("rejects a repeat instance whose topic is not a current D03 selection", () => {
    expect(() =>
      validateAnswers({
        D03: ["Food"],
        "E01#Housing or homelessness": ["Cost"],
      }),
    ).toThrow(/invalid repeat instance/i);
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

describe("buildAnswerRows", () => {
  const qidByKey = new Map<string, string>([
    ["A01", "uuid-a01"],
    ["D03", "uuid-d03"],
    ["E01", "uuid-e01"],
    ["E02", "uuid-e02"],
    ["E03", "uuid-e03"],
    ["G05", "uuid-g05"],
  ]);

  it("maps composite repeat keys to the base question id and the topic as repeat_key", () => {
    const rows = buildAnswerRows(
      {
        "E01#Housing or homelessness": ["Cost", "Waiting time"],
        "E01#Work": ["Waiting time"],
        "E02#Housing or homelessness": "More affordable housing options and easier access to services.",
      },
      qidByKey,
      "session-1",
    );
    expect(rows).toEqual([
      { session_id: "session-1", question_id: "uuid-e01", repeat_key: "Housing or homelessness", answer_value: ["Cost", "Waiting time"] },
      { session_id: "session-1", question_id: "uuid-e01", repeat_key: "Work", answer_value: ["Waiting time"] },
      { session_id: "session-1", question_id: "uuid-e02", repeat_key: "Housing or homelessness", answer_value: "More affordable housing options and easier access to services." },
    ]);
  });

  it("gives ordinary keys an empty repeat_key", () => {
    const rows = buildAnswerRows({ A01: "Yes", G05: "Nothing to add." }, qidByKey, "session-1");
    expect(rows).toEqual([
      { session_id: "session-1", question_id: "uuid-a01", repeat_key: "", answer_value: "Yes" },
      { session_id: "session-1", question_id: "uuid-g05", repeat_key: "", answer_value: "Nothing to add." },
    ]);
  });

  it("skips keys that do not resolve in qidByKey", () => {
    const rows = buildAnswerRows(
      { A01: "Yes", "E01#Housing or homelessness": ["Cost"], B99: "not in this release" },
      qidByKey,
      "session-1",
    );
    expect(rows).toEqual([
      { session_id: "session-1", question_id: "uuid-a01", repeat_key: "", answer_value: "Yes" },
      { session_id: "session-1", question_id: "uuid-e01", repeat_key: "Housing or homelessness", answer_value: ["Cost"] },
    ]);
  });

  it("skips non-anonymous H/I keys even when present in qidByKey", () => {
    const withHI = new Map(qidByKey);
    withHI.set("H01", "uuid-h01");
    const rows = buildAnswerRows({ A01: "Yes", H01: "No, I just wanted to share" }, withHI, "session-1");
    expect(rows.map((r) => r.question_id)).toEqual(["uuid-a01"]);
  });
});

describe("survey release collection interlock", () => {
  function releaseClient(status: string, contentHash = SURVEY_V1_HASH, paused = false) {
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
      rpc: async (fn: string) => {
        if (fn !== "is_collection_paused") throw new Error(`unexpected rpc: ${fn}`);
        return { data: paused, error: null };
      },
    } as never;
  }

  it("allows only the active release with the canonical hash while collection is open", async () => {
    await expect(assertSurveyReleaseActive(releaseClient("active"))).resolves.toBeUndefined();
  });

  it("rejects draft and superseded releases even when collection is open", async () => {
    await expect(assertSurveyReleaseActive(releaseClient("draft"))).rejects.toThrow(/not active/);
    await expect(assertSurveyReleaseActive(releaseClient("superseded"))).rejects.toThrow(/not active/);
  });

  it("rejects a release whose stored contract hash differs", async () => {
    await expect(assertSurveyReleaseActive(releaseClient("active", "wrong-hash"))).rejects.toThrow(/hash mismatch/);
  });

  it("rejects a paused collection even when the release is active", async () => {
    await expect(assertSurveyReleaseActive(releaseClient("active", SURVEY_V1_HASH, true))).rejects.toThrow(/collection is paused/);
  });

  it("pause rejection matches /release is not active/i so the route maps it to 503", async () => {
    await expect(assertSurveyReleaseActive(releaseClient("active", SURVEY_V1_HASH, true))).rejects.toThrow(/release is not active/i);
  });

  it("fails closed when the pause check itself errors", async () => {
    const client = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: { status: "active", content_hash: SURVEY_V1_HASH },
              error: null,
            }),
          }),
        }),
      }),
      rpc: async () => ({ data: null, error: { message: "boom" } }),
    } as never;
    await expect(assertSurveyReleaseActive(client)).rejects.toThrow(/unavailable/);
  });
});
