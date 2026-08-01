/**
 * Deterministic branching engine — the single shared state rule for every
 * adapter (web, staff, human phone, AI voice). Conformance requirement: the
 * same answer history reaches the same next question in every mode.
 */

import { SURVEY_V1 } from "./definition.js";
import { questionIndex } from "./validators.js";
import type { AnswerMap, BranchCondition, BranchDecision, SurveyQuestion } from "./types.js";

function getValue(answers: AnswerMap, questionId: string): string | string[] | undefined {
  const v = answers[questionId];
  if (v === null || v === undefined) return undefined;
  return Array.isArray(v) ? v : [v];
}

/** Evaluate one condition against the current answer map. */
export function evaluateCondition(condition: BranchCondition, answers: AnswerMap): boolean {
  switch (condition.kind) {
    case "answered":
      return getValue(answers, condition.questionId) !== undefined;
    case "equals":
      return getValue(answers, condition.questionId)?.includes(condition.value) ?? false;
    case "includes":
      return getValue(answers, condition.questionId)?.includes(condition.value) ?? false;
    case "notIncludes":
      return !(getValue(answers, condition.questionId)?.includes(condition.value) ?? false);
    case "all":
      return condition.conditions.every((c) => evaluateCondition(c, answers));
    case "any":
      return condition.conditions.some((c) => evaluateCondition(c, answers));
  }
}

/**
 * The A02 "skip personal questions" rule from the draft:
 * skips B04–B07, D04–D09 and F01–F03 while retaining the rest.
 */
const A02_SKIP_IDS = new Set(["B04", "B05", "B06", "B07", "D04", "D05", "D06", "D07", "D08", "D09", "F01", "F02", "F03"]);

const A02_SKIP_VALUE = "I would like to skip personal questions";
const A02_PERSON_VALUE = "I would rather speak with a person";
const A02_HELP_VALUE = "I need immediate help";

/** Terminal stops from A02: questionnaire must stop and show the human path. */
export function terminalStop(answers: AnswerMap): { stop: boolean; reason?: string } {
  const a02 = answers.A02;
  if (typeof a02 !== "string") return { stop: false };
  if (a02 === A02_PERSON_VALUE) {
    return { stop: true, reason: "A02: person pathway" };
  }
  if (a02 === A02_HELP_VALUE) {
    return { stop: true, reason: "A02: immediate help pathway" };
  }
  return { stop: false };
}

/** Effective skip decision for a question given the answer map. */
export function isQuestionSkipped(question: SurveyQuestion, answers: AnswerMap): boolean {
  if (question.skipWhen && evaluateCondition(question.skipWhen, answers)) {
    return true;
  }
  if (question.showWhen && !evaluateCondition(question.showWhen, answers)) {
    return true;
  }
  if (answers.A02 === A02_SKIP_VALUE && A02_SKIP_IDS.has(question.id)) {
    return true;
  }
  return false;
}

/**
 * Whether a question is currently shown and enabled. Skipped questions are
 * excluded from the completion path; answered-then-skipped values are ignored
 * by the engine (they cannot resurrect an answer once the branch changed).
 */
export function branchDecision(question: SurveyQuestion, answers: AnswerMap): BranchDecision {
  const skipped = isQuestionSkipped(question, answers);
  return skipped ? { shown: false, reason: "skipped by branch rule" } : { shown: true };
}

/** Ordered list of question IDs currently reachable, in definition order. */
export function visibleQuestionIds(answers: AnswerMap): string[] {
  return SURVEY_V1.sections.flatMap((s) => s.questions).filter((q) => branchDecision(q, answers).shown).map((q) => q.id);
}

/**
 * Ordered next-question ID after `questionId`, or null when the questionnaire
 * is complete. Deterministic: same answers → same next question.
 */
export function nextQuestionId(answers: AnswerMap, questionId: string): string | null {
  const visible = visibleQuestionIds(answers);
  const idx = visible.indexOf(questionId);
  if (idx === -1) {
    // Current question is no longer visible (branch changed); start from top.
    return visible[0] ?? null;
  }
  return visible[idx + 1] ?? null;
}

/** Get the question object by stable ID. */
export function getQuestion(id: string): SurveyQuestion | undefined {
  return questionIndex.get(id);
}
