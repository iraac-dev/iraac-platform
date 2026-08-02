/**
 * Deterministic branching engine — the single shared state rule for every
 * adapter (web, staff, human phone, AI voice). Conformance requirement: the
 * same answer history reaches the same next question in every mode.
 */

import { SURVEY_V1 } from "./definition.ts";
import { questionIndex } from "./validators.ts";
import type { AnswerMap, BranchCondition, BranchDecision, SurveyQuestion } from "./types.ts";

function getValue(answers: AnswerMap, questionId: string): string | string[] | undefined {
  const v = answers[questionId];
  if (v === null || v === undefined) return undefined;
  return Array.isArray(v) ? v : [v];
}

/** Separator between a base question id and its repeat topic in composite keys. */
export const REPEAT_SEPARATOR = "#";

/** True when the id is a repeat-instance composite like "E01#Housing or homelessness". */
export function isRepeatInstanceId(id: string): boolean {
  return id.includes(REPEAT_SEPARATOR);
}

/** Base question id for any id (composite or plain): the part before the first separator. */
export function baseQuestionId(id: string): string {
  return id.split(REPEAT_SEPARATOR)[0];
}

/** The repeat topic after the first separator, or null when the id is not composite. */
export function repeatTopic(id: string): string | null {
  const index = id.indexOf(REPEAT_SEPARATOR);
  return index === -1 ? null : id.slice(index + 1);
}

/** Build the composite answer key for one repeat instance. */
export function repeatAnswerId(questionId: string, topic: string): string {
  return `${questionId}${REPEAT_SEPARATOR}${topic}`;
}

/**
 * Repeat topics for a repeatable question, derived from the source question's
 * selections (question.repeatFor.questionId): source order preserved,
 * non-strings filtered out, deduped, capped at question.repeatFor.max.
 * Empty when the question is not a repeat template or has no selections.
 */
export function repeatKeys(question: SurveyQuestion, answers: AnswerMap): string[] {
  if (!question.repeatFor) return [];
  const source = answers[question.repeatFor.questionId];
  const items: string[] = Array.isArray(source) ? source : typeof source === "string" ? [source] : [];
  const seen = new Set<string>();
  const keys: string[] = [];
  for (const item of items) {
    if (typeof item !== "string") continue;
    if (seen.has(item)) continue;
    seen.add(item);
    keys.push(item);
    if (keys.length >= question.repeatFor.max) break;
  }
  return keys;
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
  if (answers.A01 === "No" || answers.A01 === "Prefer not to say") {
    return { stop: true, reason: "A01: adult gate not confirmed" };
  }
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

/**
 * Ordered list of question IDs currently reachable, in definition order.
 * Repeat templates (question.repeatFor) expand to one composite id per source
 * selection; with no source selections they disappear from the flow entirely.
 */
export function visibleQuestionIds(answers: AnswerMap): string[] {
  return SURVEY_V1.sections.flatMap((s) => s.questions).flatMap((q) => {
    if (q.repeatFor) {
      const topics = repeatKeys(q, answers);
      if (topics.length === 0) return [];
      return topics.map((topic) => repeatAnswerId(q.id, topic));
    }
    return branchDecision(q, answers).shown ? [q.id] : [];
  });
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

/** Get the question object by stable ID (composite repeat ids resolve to the base question). */
export function getQuestion(id: string): SurveyQuestion | undefined {
  return questionIndex.get(baseQuestionId(id));
}
