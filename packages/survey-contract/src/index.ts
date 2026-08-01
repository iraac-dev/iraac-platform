/**
 * @iraac/survey-contract — public API.
 *
 * One immutable contract, one Zod validator set, one deterministic branching
 * engine, one content hash. Web, staff, human-phone and AI-voice adapters all
 * consume this package; SurveyJS renders but never owns the authority.
 */

export { SURVEY_V1 } from "./definition.js";
export { SURVEY_V1_HASH, contentHash, isV1Release } from "./hash.js";
export {
  answerSchema,
  hasPreferNotToSay,
  permissionIndex,
  questionIndex,
  validateAnswer,
  validateAnswers,
  validatePermission,
} from "./validators.js";
export {
  branchDecision,
  evaluateCondition,
  getQuestion,
  isQuestionSkipped,
  nextQuestionId,
  terminalStop,
  visibleQuestionIds,
} from "./branching.js";
export {
  ALL_FIXTURES,
  FIXTURE_ANONYMOUS_FULL,
  FIXTURE_ANONYMOUS_MINIMAL,
  FIXTURE_FULL_CONSENT,
  FIXTURE_NO_CONSENT,
  FIXTURE_SKIP_PERSONAL,
  FIXTURE_WITH_FOLLOWUP,
} from "./fixtures.js";
export * from "./types.js";
