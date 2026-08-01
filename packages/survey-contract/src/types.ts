/**
 * IRAAC Have Your Say — canonical contract types.
 *
 * This package is the single source of truth for the V1 survey. Every
 * adapter (web, staff, human phone, AI voice) consumes the same immutable
 * definition and the same Zod validators. See the V1 draft:
 * docs/survey/IRAAC_HAVE_YOUR_SAY_V1_DRAFT.md (content baseline).
 */

export const SURVEY_SCHEMA_VERSION = "1.0.0" as const;

/** Stable lifecycle from ROADMAP §7. */
export type SurveyReleaseStatus =
  | "draft"
  | "cultural_review"
  | "privacy_ethics_review"
  | "methodology_review"
  | "branch_tested"
  | "approved"
  | "scheduled"
  | "active"
  | "retired"
  | "withdrawn";

/** Session states from ROADMAP §7. */
export type SurveySessionStatus =
  | "started"
  | "in_progress"
  | "saved"
  | "resumed"
  | "submitted"
  | "expired"
  | "abandoned"
  | "withdrawn_version";

/** Completion modes from the DB migration (completion_mode check). */
export type CompletionMode = "web" | "staff" | "phone" | "ai_voice" | "drop_in" | "home_visit";

export type QuestionType = "text" | "single_choice" | "multi_choice";

/**
 * Declarative branching condition. Evaluated against the answer map so every
 * adapter reaches the same next question (conformance requirement).
 */
export type BranchCondition =
  | { kind: "answered"; questionId: string }
  | { kind: "equals"; questionId: string; value: string }
  | { kind: "includes"; questionId: string; value: string }
  | { kind: "notIncludes"; questionId: string; value: string }
  | { kind: "all"; conditions: BranchCondition[] }
  | { kind: "any"; conditions: BranchCondition[] };

/** Per-question contract. `optional` mirrors the draft's "Optional" marker. */
export interface SurveyQuestion {
  id: string;
  section: string;
  text: string;
  type: QuestionType;
  /** Choice labels in display order. */
  options?: string[];
  required: boolean;
  optional: boolean;
  /** When true, show "Prefer not to say" as an additional option. */
  preferNotToSay: boolean;
  /** For text questions: approved max length. */
  maxLength?: number;
  /** Draft rule text, preserved verbatim for governance review. */
  rule?: string;
  /** Show this question only when the condition holds. */
  showWhen?: BranchCondition;
  /** Skip this question when the condition holds. */
  skipWhen?: BranchCondition;
  /** Multi-choice cap (e.g. D03 max three). */
  maxSelections?: number;
  /** Multi-choice exclusivity: selecting any of these excludes the rest. */
  exclusiveOptions?: string[];
  /** For template questions repeated per selection (e.g. E01 per D03 topic). */
  repeatFor?: { questionId: string; max: number };
}

export interface SurveySection {
  id: string;
  title: string;
  /** Screen-level copy shown before the questions. */
  intro?: string;
  questions: SurveyQuestion[];
}

/** Future-contact permissions (section I). All start unticked. */
export interface ContactPermission {
  id: string;
  text: string;
  /** Plain-language purpose/frequency/withdrawal note for the receipt. */
  note?: string;
}

/** The canonical, immutable V1 definition artifact. */
export interface SurveyDefinition {
  schemaVersion: typeof SURVEY_SCHEMA_VERSION;
  slug: string;
  title: string;
  /** Opening-screen copy from the draft. */
  introduction: string;
  sections: SurveySection[];
  /** Separate screen after answers; all choices unticked. */
  contactPermissions: ContactPermission[];
}

/** A single answer value (raw, before validation). */
export type AnswerValue = string | string[] | null;

/** Question ID → raw answer value. */
export type AnswerMap = Record<string, AnswerValue>;

/** Validated per-question result. */
export type ValidAnswerValue = string | string[];

/** Question ID → validated answer. */
export type ValidAnswerMap = Record<string, ValidAnswerValue>;

/** Summary of why a question is currently shown/hidden. */
export interface BranchDecision {
  shown: boolean;
  reason?: string;
}
