"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  SURVEY_V1_HASH,
  getQuestion,
  nextQuestionId,
  terminalStop,
  visibleQuestionIds,
} from "@iraac/survey-contract";
import type { AnswerMap, AnswerValue, SurveyQuestion } from "@iraac/survey-contract";

type SubmitState =
  | { phase: "idle" }
  | { phase: "submitting" }
  | { phase: "done"; completionRef: string }
  | { phase: "error"; message: string };

/** Map a validated answer back to the compact shape the contract expects. */
function toAnswerMap(answers: Record<string, string | string[] | null>): AnswerMap {
  return answers as AnswerMap;
}

/** Renders one question with accessible controls; no third-party anything. */
function QuestionField({
  question,
  value,
  onChange,
}: {
  question: SurveyQuestion;
  value: AnswerValue;
  onChange: (v: AnswerValue) => void;
}) {
  const id = `q-${question.id}`;
  const options = question.options ?? [];
  const required = question.required && !question.optional;

  if (question.type === "text") {
    return (
      <div className="field">
        <label htmlFor={id}>
          {question.text}
          {required && <span className="req" aria-label="required"> *</span>}
        </label>
        <textarea
          id={id}
          rows={3}
          maxLength={question.maxLength ?? 500}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={`${id}-hint`}
        />
        <p id={`${id}-hint`} className="hint">
          {question.maxLength ? `Up to ${question.maxLength} characters. ` : ""}
          {question.rule ? "You can skip this question." : ""}
        </p>
      </div>
    );
  }

  const multi = question.type === "multi_choice";
  const current = Array.isArray(value) ? value : [];

  return (
    <fieldset className="field">
      <legend>
        {question.text}
        {required && <span className="req" aria-label="required"> *</span>}
      </legend>
      <div className="options">
        {options.map((opt) => {
          const checked = multi ? current.includes(opt) : value === opt;
          const inputType = multi ? "checkbox" : "radio";
          const optionId = `${id}-${opt.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
          return (
            <label key={opt} htmlFor={optionId} className="option">
              <input
                id={optionId}
                type={inputType}
                name={multi ? undefined : id}
                value={opt}
                checked={checked}
                onChange={() => {
                  if (multi) {
                    const next = checked ? current.filter((x) => x !== opt) : [...current, opt];
                    if (question.maxSelections && next.length > question.maxSelections) return;
                    onChange(next);
                  } else {
                    onChange(opt);
                  }
                }}
              />
              <span>{opt}</span>
            </label>
          );
        })}
      </div>
      {question.maxSelections ? (
        <p className="hint">Choose up to {question.maxSelections}.</p>
      ) : (
        <p className="hint">You can skip this question.</p>
      )}
    </fieldset>
  );
}

export default function SurveyClient() {
  // Start at the first visible question of the anonymous journey.
  const startId = useMemo(() => {
    const visible = visibleQuestionIds({ A01: "Yes", A02: "Yes" });
    return visible[0] ?? "A01";
  }, []);

  const [currentId, setCurrentId] = useState<string>(startId);
  const [answers, setAnswers] = useState<Record<string, string | string[] | null>>({});
  const [submitState, setSubmitState] = useState<SubmitState>({ phase: "idle" });
  const [clientToken] = useState<string>(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `tok-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );

  const current = getQuestion(currentId);
  const stop = terminalStop(toAnswerMap(answers));

  const setAnswer = useCallback((v: AnswerValue) => {
    setAnswers((prev) => ({ ...prev, [currentId]: v }));
  }, [currentId]);

  const visibleIds = useMemo(() => visibleQuestionIds(toAnswerMap(answers)), [answers]);
  const currentIndex = visibleIds.indexOf(currentId);
  const isLast = currentIndex === visibleIds.length - 1;

  const handleNext = useCallback(() => {
    const nxt = nextQuestionId(toAnswerMap(answers), currentId);
    if (nxt) {
      setCurrentId(nxt);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [answers, currentId]);

  const handleBack = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentId(visibleIds[currentIndex - 1]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentIndex, visibleIds]);

  const handleSubmit = useCallback(async () => {
    setSubmitState({ phase: "submitting" });
    try {
      const res = await fetch("/api/survey/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: toAnswerMap(answers), clientToken, completionMode: "web" }),
      });
      const data = (await res.json()) as { ok: boolean; completionRef?: string; reason?: string; status?: string };
      if (!res.ok || !data.ok) {
        setSubmitState({ phase: "error", message: data.reason ?? "Submission failed. Please try again." });
        return;
      }
      setSubmitState({ phase: "done", completionRef: data.completionRef ?? "" });
    } catch {
      setSubmitState({ phase: "error", message: "Network error. Please check your connection and try again." });
    }
  }, [answers, clientToken]);

  // Terminal stop from A02: show the human pathway, never the survey.
  if (stop.stop) {
    return (
      <section className="survey-end" aria-live="polite">
        <h2>We have stopped the questions</h2>
        <p>{stop.reason === "A02: immediate help pathway" ? "You asked for immediate help." : "You asked to speak with a person."}</p>
        <p>You can speak with an IRAAC worker instead of continuing. If you or someone else is in immediate danger, call 000. For culturally safe crisis support, call 13YARN on 13 92 76.</p>
        <p>
          <a href="tel:139276" className="btn">Call 13YARN (13 92 76)</a>{" "}
          <a href="/contact" className="btn btn-secondary" rel="nofollow">Contact IRAAC</a>
        </p>
      </section>
    );
  }

  if (submitState.phase === "done") {
    return (
      <section className="survey-end" aria-live="polite">
        <h2>Thank you for sharing</h2>
        <p>Your answers have been received. They will be reviewed by trained IRAAC staff and used only for the listening, advocacy and de-identified reporting purpose described at the start.</p>
        {submitState.completionRef && (
          <p className="completion-ref">Your reference: <strong>{submitState.completionRef}</strong> (this reference reveals nothing about your answers)</p>
        )}
        <p>If there is anything this survey did not ask about, or an issue you would like IRAAC to explore, please contact us directly.</p>
        <p><a href="/contact" rel="nofollow">Contact IRAAC</a></p>
      </section>
    );
  }

  if (!current) {
    return <p className="error">Survey is not available right now.</p>;
  }

  return (
    <form
      className="survey-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (isLast) void handleSubmit();
        else handleNext();
      }}
    >
      <div className="progress" role="progressbar" aria-valuemin={1} aria-valuemax={visibleIds.length} aria-valuenow={currentIndex + 1} aria-label="Survey progress">
        Question {currentIndex + 1} of {visibleIds.length}
      </div>

      <QuestionField
        question={current}
        value={answers[current.id] ?? (current.type === "multi_choice" ? [] : null)}
        onChange={setAnswer}
      />

      <div className="nav">
        {currentIndex > 0 && (
          <button type="button" className="btn btn-secondary" onClick={handleBack}>
            Back
          </button>
        )}
        <button type="submit" className="btn" disabled={submitState.phase === "submitting"}>
          {submitState.phase === "submitting" ? "Submitting…" : isLast ? "Submit" : "Next"}
        </button>
      </div>

      {submitState.phase === "error" && (
        <p role="alert" className="error">{submitState.message}</p>
      )}

      <p className="quick-exit">
        <Link href="/" rel="nofollow">Quick exit</Link> — this closes the survey. It cannot clear your browser or network history.
      </p>
      <p className="hash" aria-hidden="true">Release {SURVEY_V1_HASH.slice(0, 12)} · anonymous</p>
    </form>
  );
}
