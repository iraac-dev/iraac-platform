/**
 * Zod validators for the V1 contract.
 *
 * The IRAAC Zod contract is the authority; SurveyJS is only a replaceable
 * renderer. Every adapter validates answers through these schemas.
 */

import { z } from "zod";
import { SURVEY_V1 } from "./definition.ts";
import type { AnswerMap, ContactPermission, SurveyQuestion, ValidAnswerMap } from "./types.ts";

export const questionIndex: Map<string, SurveyQuestion> = new Map(
  SURVEY_V1.sections.flatMap((s) => s.questions.map((q) => [q.id, q] as const)),
);

/** Contact permissions (I01–I05) as pseudo-questions: ticked = exact text. */
export const permissionIndex: Map<string, ContactPermission> = new Map(
  SURVEY_V1.contactPermissions.map((p) => [p.id, p] as const),
);

/** Validate one permission answer: the exact text (ticked) or empty (unticked). */
export function validatePermission(permission: ContactPermission, raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === "") {
    return null;
  }
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === undefined || value === null || value === "") {
    // Empty array = unticked.
    return null;
  }
  if (typeof value !== "string" || value !== permission.text) {
    throw new Error(`Invalid permission answer for ${permission.id}: must match the exact permission text`);
  }
  return value;
}

/** True when the question's options include "Prefer not to say". */
export function hasPreferNotToSay(question: SurveyQuestion): boolean {
  return Boolean(question.preferNotToSay) || (question.options ?? []).includes("Prefer not to say");
}

/** Zod schema for a single question's answer value. */
export function answerSchema(question: SurveyQuestion): z.ZodType {
  switch (question.type) {
    case "text": {
      const maxLength = question.maxLength ?? 500;
      // Deliberate guard: text answers must stay inert, no control characters.
      // eslint-disable-next-line no-control-regex
      const CONTROL_CHAR = /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/;
      return z
        .string()
        .trim()
        .min(1, "Answer is empty")
        .max(maxLength, `Answer exceeds ${maxLength} characters`)
        .refine((s) => !CONTROL_CHAR.test(s), {
          message: "Answer contains control characters",
        });
    }
    case "single_choice": {
      const options = question.options ?? [];
      return z.enum(options as [string, ...string[]], {
        errorMap: () => ({ message: `Not a valid option for ${question.id}` }),
      });
    }
    case "multi_choice": {
      const options = question.options ?? [];
      const base = z.array(
        z.enum(options as [string, ...string[]], {
          errorMap: () => ({ message: `Not a valid option for ${question.id}` }),
        }),
      );
      let schema: z.ZodType = base;
      if (question.maxSelections) {
        schema = base.max(question.maxSelections, `Select at most ${question.maxSelections} options`);
      }
      if (question.exclusiveOptions?.length) {
        schema = schema.refine(
          (values) => {
            const chosen = question.exclusiveOptions!.filter((o) => values.includes(o));
            return chosen.length <= 1;
          },
          { message: "Exclusive options cannot be combined" },
        );
      }
      return schema;
    }
  }
}

/** Validate one raw answer against its question. Null means "skipped". */
export function validateAnswer(question: SurveyQuestion, raw: unknown): string | string[] | null {
  if (raw === null || raw === undefined || raw === "") {
    return null;
  }
  const parsed = answerSchema(question).safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid answer for ${question.id}: ${parsed.error.issues[0]?.message}`);
  }
  return parsed.data;
}

/**
 * Validate a whole answer map (questions + contact permissions). Returns the
 * validated map. Unknown IDs and invalid shapes throw. Skipped (null/
 * undefined/empty-array) values are dropped.
 */
export function validateAnswers(answers: AnswerMap): ValidAnswerMap {
  const out: ValidAnswerMap = {};
  for (const [id, raw] of Object.entries(answers)) {
    const question = questionIndex.get(id);
    if (question) {
      const value = validateAnswer(question, raw);
      if (value !== null) {
        out[id] = value;
      }
      continue;
    }
    const permission = permissionIndex.get(id);
    if (permission) {
      const value = validatePermission(permission, raw);
      if (value !== null) {
        out[id] = value;
      }
      continue;
    }
    throw new Error(`Unknown question id: ${id}`);
  }
  return out;
}
