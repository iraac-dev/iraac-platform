/**
 * SURV-001 contract tests.
 *
 * Prove: stable IDs match the V1 draft; validators accept/reject correctly;
 * branching is deterministic and conformant across fixtures; the semantic
 * hash is stable and changes on any mutation (active release immutable).
 */

import { describe, expect, it } from "vitest";
import {
  ALL_FIXTURES,
  FIXTURE_ANONYMOUS_FULL,
  FIXTURE_ANONYMOUS_MINIMAL,
  SURVEY_V1,
  SURVEY_V1_HASH,
  branchDecision,
  contentHash,
  getQuestion,
  isV1Release,
  nextQuestionId,
  repeatKeys,
  terminalStop,
  validateAnswer,
  validateAnswers,
  visibleQuestionIds,
} from "../index.ts";
import type { AnswerMap, SurveyDefinition } from "../types.ts";

const ALL_QUESTIONS = SURVEY_V1.sections.flatMap((s) => s.questions);

describe("SURV-001 canonical definition", () => {
  it("has stable, unique question IDs matching the V1 draft (A01–H06)", () => {
    const ids = ALL_QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    // Draft section anchors: A01 first, H06 last, I01–I05 permissions.
    expect(ids[0]).toBe("A01");
    expect(ids).toContain("H06");
    expect(SURVEY_V1.contactPermissions.map((p) => p.id)).toEqual(["I01", "I02", "I03", "I04", "I05"]);
  });

  it("transcribes the draft's core question count and sections", () => {
    // Sections A–H per the draft; A=4, B=7, C=3, D=9, E=3, F=3, G=5, H=6.
    const sections = SURVEY_V1.sections.map((s) => [s.id, s.questions.length] as const);
    expect(Object.fromEntries(sections)).toEqual({
      A: 4,
      B: 7,
      C: 3,
      D: 9,
      E: 3,
      F: 3,
      G: 5,
      H: 6,
    });
  });

  it("marks every sensitive multi-choice/single-choice as optional or required per draft", () => {
    for (const q of ALL_QUESTIONS) {
      expect(typeof q.optional).toBe("boolean");
      expect(typeof q.required).toBe("boolean");
      // No question is both optional and required.
      expect(q.optional && q.required).toBe(false);
    }
  });

  it("has no empty question text or undefined options for choice questions", () => {
    for (const q of ALL_QUESTIONS) {
      expect(q.text.trim().length).toBeGreaterThan(0);
      if (q.type !== "text") {
        expect(q.options?.length).toBeGreaterThan(1);
      }
    }
  });

  it("caps D03 at three selections and excludes None/Prefer not to say", () => {
    const d03 = ALL_QUESTIONS.find((q) => q.id === "D03")!;
    expect(d03.maxSelections).toBe(3);
    // Topic choices derive from D02, minus the two non-topic choices.
    const d02 = ALL_QUESTIONS.find((q) => q.id === "D02")!;
    const expected = d02.options!.filter((o) => o !== "None of these" && o !== "Prefer not to say");
    expect(d03.options).toEqual(expected);
  });

  it("marks D02's None and Prefer not to say as exclusive", () => {
    const d02 = ALL_QUESTIONS.find((q) => q.id === "D02")!;
    expect(d02.exclusiveOptions).toContain("None of these");
    expect(d02.exclusiveOptions).toContain("Prefer not to say");
  });

  it("keeps E01–E03 as repeatable templates keyed to D03", () => {
    for (const id of ["E01", "E02", "E03"]) {
      const q = ALL_QUESTIONS.find((x) => x.id === id)!;
      expect(q.repeatFor).toEqual({ questionId: "D03", max: 3 });
    }
  });

  it("shows H04/H05 only after follow-up is requested", () => {
    expect(ALL_QUESTIONS.find((q) => q.id === "H04")!.showWhen).toEqual({
      kind: "equals",
      questionId: "H01",
      value: "Yes, please contact me",
    });
    expect(ALL_QUESTIONS.find((q) => q.id === "H05")!.showWhen).toEqual({
      kind: "answered",
      questionId: "H04",
    });
  });
});

describe("SURV-001 validators", () => {
  it("accepts valid single-choice answers", () => {
    const q = ALL_QUESTIONS.find((x) => x.id === "B03")!;
    expect(validateAnswer(q, "25–34")).toBe("25–34");
  });

  it("rejects an option that is not in the list", () => {
    const q = ALL_QUESTIONS.find((x) => x.id === "B03")!;
    expect(() => validateAnswer(q, "12")).toThrow(/not a valid option/i);
  });

  it("accepts valid multi-choice and enforces the three-selection cap", () => {
    const q = ALL_QUESTIONS.find((x) => x.id === "D03")!;
    const ok = validateAnswer(q, ["Housing or homelessness", "Work", "Food"]);
    expect(ok).toEqual(["Housing or homelessness", "Work", "Food"]);
    expect(() => validateAnswer(q, ["Housing or homelessness", "Work", "Food", "Transport"])).toThrow(/at most 3/i);
  });

  it("rejects combining exclusive D02 options", () => {
    const q = ALL_QUESTIONS.find((x) => x.id === "D02")!;
    expect(() => validateAnswer(q, ["Food", "None of these", "Prefer not to say"])).toThrow(/exclusive/i);
  });

  it("treats null/undefined/empty as a skipped (null) answer", () => {
    const q = ALL_QUESTIONS.find((x) => x.id === "B01")!;
    expect(validateAnswer(q, null)).toBeNull();
    expect(validateAnswer(q, undefined)).toBeNull();
    expect(validateAnswer(q, "")).toBeNull();
  });

  it("rejects text over the approved length limit", () => {
    const q = ALL_QUESTIONS.find((x) => x.id === "B01")!;
    expect(() => validateAnswer(q, "x".repeat(121))).toThrow(/exceeds 120/i);
  });

  it("rejects unknown question IDs in a full answer map", () => {
    expect(() => validateAnswers({ Z99: "nope" })).toThrow(/unknown question/i);
  });

  it("validates every synthetic fixture end to end", () => {
    for (const [name, answers] of Object.entries(ALL_FIXTURES)) {
      const validated = validateAnswers(answers);
      for (const q of ALL_QUESTIONS) {
        const raw = answers[q.id];
        if (raw === undefined) {
          // Skipped: must not appear in the validated map unless branch forces it.
          expect(validated[q.id]).toBeUndefined();
        } else if (raw === null || (Array.isArray(raw) && raw.length === 0)) {
          expect(validated[q.id]).toBeUndefined();
        } else {
          expect(validated[q.id]).toBeDefined();
        }
      }
      expect(name.length).toBeGreaterThan(0);
    }
  });

  it("accepts composite repeat keys and returns them under the same composite keys", () => {
    const validated = validateAnswers(FIXTURE_ANONYMOUS_FULL);
    expect(validated["E01#Housing or homelessness"]).toEqual(["Cost", "Waiting time"]);
    expect(validated["E01#Work"]).toEqual(["Waiting time"]);
    expect(validated["E02#Housing or homelessness"]).toBe("More affordable housing options and easier access to services.");
    expect(validated["E02#Work"]).toBe("Work experience pathways would help.");
    expect(validated["E03#Housing or homelessness"]).toBe("Yes but it did not help enough");
    expect(validated["E03#Work"]).toBe("No");
    // The flat base ids must not appear.
    expect(validated.E01).toBeUndefined();
    expect(validated.E02).toBeUndefined();
    expect(validated.E03).toBeUndefined();
  });

  it("rejects a repeat instance whose topic is not a current source selection", () => {
    const answers: AnswerMap = {
      D03: ["Food"],
      "E01#Housing or homelessness": ["Cost"],
    };
    expect(() => validateAnswers(answers)).toThrow(/invalid repeat instance/i);
  });

  it("rejects more repeat instances than repeatFor.max allows", () => {
    // Four repeat instances for E01, one per topic; D03 is capped at three by
    // maxSelections, so the instance-count guard must fire first.
    const answers: AnswerMap = {
      "E01#Housing or homelessness": ["Cost"],
      "E01#Food": ["Cost"],
      "E01#Work": ["Cost"],
      "E01#Transport": ["Cost"],
      D03: ["Housing or homelessness", "Food", "Work", "Transport"],
    };
    expect(() => validateAnswers(answers)).toThrow(/max 3/);
  });

  it("rejects composite keys on questions that are not repeat templates", () => {
    const answers: AnswerMap = {
      D03: ["Food"],
      "B01#Food": "Dubbo",
    };
    expect(() => validateAnswers(answers)).toThrow(/unexpected repeat answer/i);
  });
});

describe("SURV-001 branching engine", () => {
  it("skips B04–B07, D04–D09 and F01–F03 when A02 skips personal questions", () => {
    const answers = { A01: "Yes", A02: "I would like to skip personal questions" };
    const visible = visibleQuestionIds(answers);
    for (const id of ["B04", "B05", "B06", "B07", "D04", "D05", "D06", "D07", "D08", "D09", "F01", "F02", "F03"]) {
      expect(visible).not.toContain(id);
    }
    // Retained sections must still be visible.
    for (const id of ["B01", "B02", "B03", "C01", "C02", "C03", "D01", "D02", "D03", "G01", "G02", "H01"]) {
      expect(visible).toContain(id);
    }
  });

  it("does not skip personal questions when A02 is Yes", () => {
    const visible = visibleQuestionIds({ A01: "Yes", A02: "Yes" });
    for (const id of ["B04", "D04", "F01"]) {
      expect(visible).toContain(id);
    }
  });

  it("stops the questionnaire for the person and immediate-help pathways", () => {
    expect(terminalStop({ A01: "Yes", A02: "I would rather speak with a person" }).stop).toBe(true);
    expect(terminalStop({ A01: "Yes", A02: "I need immediate help" }).stop).toBe(true);
    expect(terminalStop({ A01: "Yes", A02: "Yes" }).stop).toBe(false);
  });

  it("hides H04 and H05 until follow-up is requested", () => {
    expect(branchDecision(ALL_QUESTIONS.find((q) => q.id === "H04")!, { H01: "No, I just wanted to share" }).shown).toBe(false);
    expect(branchDecision(ALL_QUESTIONS.find((q) => q.id === "H04")!, { H01: "Yes, please contact me" }).shown).toBe(true);
    expect(branchDecision(ALL_QUESTIONS.find((q) => q.id === "H05")!, { H01: "Yes, please contact me" }).shown).toBe(false);
    expect(branchDecision(ALL_QUESTIONS.find((q) => q.id === "H05")!, { H01: "Yes, please contact me", H04: ["Email"] }).shown).toBe(true);
  });

  it("walks a deterministic question order for the minimal anonymous journey", () => {
    const answers = { A01: "Yes", A02: "Yes" };
    const visible = visibleQuestionIds(answers);
    expect(visible[0]).toBe("A01");
    expect(nextQuestionId(answers, "A01")).toBe("A02");
    // A03 is optional metadata — confirm-only, still in the sequence.
    expect(nextQuestionId(answers, "A02")).toBe("A03");
  });

  it("produces identical visible order for the same fixture every time (parity)", () => {
    const first = visibleQuestionIds(FIXTURE_ANONYMOUS_FULL);
    const second = visibleQuestionIds(FIXTURE_ANONYMOUS_FULL);
    expect(second).toEqual(first);
  });

  it("hides E01–E03 entirely when D03 has no selections", () => {
    const minimalVisible = visibleQuestionIds(FIXTURE_ANONYMOUS_MINIMAL);
    expect(minimalVisible).not.toContain("E01");
    expect(minimalVisible).not.toContain("E02");
    expect(minimalVisible).not.toContain("E03");
    expect(minimalVisible.filter((id) => id.startsWith("E0"))).toEqual([]);

    const noD03Visible = visibleQuestionIds({ A01: "Yes", A02: "Yes" });
    expect(noD03Visible.filter((id) => id.startsWith("E0"))).toEqual([]);
  });

  it("expands E01–E03 to one composite id per D03 selection", () => {
    const visible = visibleQuestionIds(FIXTURE_ANONYMOUS_FULL);
    // Flat template ids never appear…
    expect(visible).not.toContain("E01");
    expect(visible).not.toContain("E02");
    expect(visible).not.toContain("E03");
    // …but one composite id per selected topic does, for every template.
    for (const base of ["E01", "E02", "E03"]) {
      expect(visible).toContain(`${base}#Housing or homelessness`);
      expect(visible).toContain(`${base}#Work`);
    }
    // Definition order: all E01 instances, then all E02, then all E03.
    const eIds = visible.filter((id) => id.startsWith("E0"));
    expect(eIds).toEqual([
      "E01#Housing or homelessness",
      "E01#Work",
      "E02#Housing or homelessness",
      "E02#Work",
      "E03#Housing or homelessness",
      "E03#Work",
    ]);
  });

  it("resolves composite repeat ids to the base question via getQuestion", () => {
    expect(getQuestion("E01#Housing or homelessness")?.id).toBe("E01");
    expect(getQuestion("E02#Work")?.id).toBe("E02");
    expect(getQuestion("E03#Food")?.id).toBe("E03");
    expect(getQuestion("B01")?.id).toBe("B01");
  });

  it("caps repeatKeys at repeatFor.max and dedupes in source order", () => {
    const e01 = ALL_QUESTIONS.find((q) => q.id === "E01")!;
    const keys = repeatKeys(e01, {
      D03: ["Food", "Food", "Work", "Housing or homelessness", "Transport"],
    });
    // "Food" deduped, cap at 3 keeps the first three unique topics in order.
    expect(keys).toEqual(["Food", "Work", "Housing or homelessness"]);

    // Non-repeat questions and missing source selections yield no keys.
    const a01 = ALL_QUESTIONS.find((q) => q.id === "A01")!;
    expect(repeatKeys(a01, {})).toEqual([]);
    expect(repeatKeys(e01, {})).toEqual([]);
    expect(repeatKeys(e01, { D03: "Food" })).toEqual(["Food"]);
  });
});

describe("SURV-001 semantic hash", () => {
  it("is a stable 64-char sha256 for the current V1 release", () => {
    expect(SURVEY_V1_HASH).toMatch(/^[0-9a-f]{64}$/);
    expect(contentHash(SURVEY_V1)).toBe(SURVEY_V1_HASH);
  });

  it("is deterministic across recomputation", () => {
    expect(contentHash(structuredClone(SURVEY_V1))).toBe(SURVEY_V1_HASH);
  });

  it("changes when any definition content mutates (immutability guard)", () => {
    const mutated = structuredClone(SURVEY_V1);
    mutated.title = "Have Your Say — changed";
    expect(contentHash(mutated)).not.toBe(SURVEY_V1_HASH);

    const optionMutated = structuredClone(SURVEY_V1);
    optionMutated.sections[0].questions[0].options![0] = "Yes (changed)";
    expect(contentHash(optionMutated)).not.toBe(SURVEY_V1_HASH);

    const permissionMutated = structuredClone(SURVEY_V1);
    permissionMutated.contactPermissions[0].text = "Changed permission";
    expect(contentHash(permissionMutated)).not.toBe(SURVEY_V1_HASH);
  });

  it("is insensitive to object key order (semantic, not byte-for-byte)", () => {
    const reordered: Record<string, unknown> = {};
    for (const key of Object.keys(SURVEY_V1).reverse()) {
      reordered[key] = (SURVEY_V1 as unknown as Record<string, unknown>)[key];
    }
    expect(contentHash(reordered as unknown as SurveyDefinition)).toBe(SURVEY_V1_HASH);
  });

  it("recognises only the exact V1 release via isV1Release", () => {
    expect(isV1Release(SURVEY_V1)).toBe(true);
    expect(isV1Release(structuredClone(SURVEY_V1))).toBe(true);
    const other = structuredClone(SURVEY_V1);
    other.slug = "have-your-say-v2";
    expect(isV1Release(other)).toBe(false);
  });
});
