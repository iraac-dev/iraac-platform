/**
 * @iraac/survey-contract — public API.
 *
 * One immutable contract, one Zod validator set, one deterministic branching
 * engine, one content hash. Web, staff, human-phone and AI-voice adapters all
 * consume this package; SurveyJS renders but never owns the authority.
 */

export { SURVEY_V1 } from "./definition.ts";
export { SURVEY_V1_HASH, canonicalize, contentHash, isV1Release } from "./hash.ts";
export {
  answerSchema,
  hasPreferNotToSay,
  permissionIndex,
  questionIndex,
  validateAnswer,
  validateAnswers,
  validatePermission,
} from "./validators.ts";
export {
  REPEAT_SEPARATOR,
  baseQuestionId,
  branchDecision,
  evaluateCondition,
  getQuestion,
  isQuestionSkipped,
  isRepeatInstanceId,
  nextQuestionId,
  repeatAnswerId,
  repeatKeys,
  repeatTopic,
  terminalStop,
  visibleQuestionIds,
} from "./branching.ts";
export {
  ALL_FIXTURES,
  FIXTURE_ANONYMOUS_FULL,
  FIXTURE_ANONYMOUS_MINIMAL,
  FIXTURE_FULL_CONSENT,
  FIXTURE_NO_CONSENT,
  FIXTURE_SKIP_PERSONAL,
  FIXTURE_WITH_FOLLOWUP,
} from "./fixtures.ts";
export * from "./types.ts";
