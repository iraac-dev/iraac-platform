"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  SURVEY_V1_HASH,
  getQuestion,
  isRepeatInstanceId,
  nextQuestionId,
  repeatTopic,
  terminalStop,
  visibleQuestionIds,
} from "@iraac/survey-contract";
import type { AnswerMap, AnswerValue, SurveyQuestion } from "@iraac/survey-contract";

type SubmitState =
  | { phase: "idle" }
  | { phase: "submitting" }
  | { phase: "done"; completionRef: string; sessionId?: string }
  | { phase: "error"; message: string };

type ConsentState =
  | { phase: "idle" }
  | { phase: "submitting" }
  | { phase: "done"; receiptToken: string; grantedChannels: string[] }
  | { phase: "skipped" }
  | { phase: "error"; message: string };

/** Map a validated answer back to the compact shape the contract expects. */
function toAnswerMap(answers: Record<string, string | string[] | null>): AnswerMap {
  return answers as AnswerMap;
}

function createClientToken(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

/** Slugify any question key for use in an id attribute ("E01#Housing or homelessness" -> "e01-housing-or-homelessness"). */
function slugifyId(id: string): string {
  return id.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
}

/** Renders one question with accessible controls; no third-party anything. */
function QuestionField({
  question,
  value,
  onChange,
  instanceId,
}: {
  question: SurveyQuestion;
  value: AnswerValue;
  onChange: (v: AnswerValue) => void;
  /**
   * Display key for this instance. For repeat questions this is the composite
   * id (e.g. "E01#Housing or homelessness") so element ids stay unique and
   * answers are stored under the composite key; plain questions pass undefined
   * and fall back to the base question id.
   */
  instanceId?: string;
}) {
  const key = instanceId ?? question.id;
  const id = `q-${slugifyId(key)}`;
  // The repeat topic (e.g. "Housing or homelessness") this instance is about.
  const topic = instanceId ? repeatTopic(instanceId) : null;
  const options = question.options ?? [];
  const required = question.required && !question.optional;

  if (question.type === "text") {
    return (
      <div className="field">
        <label htmlFor={id}>
          {topic && <strong className="repeat-topic">{topic}</strong>}
          {question.text}
          {required && <span className="req" aria-label="required"> *</span>}
        </label>
        <textarea
          id={id}
          rows={3}
          maxLength={question.maxLength ?? 500}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          required={required}
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
    <fieldset className="field" aria-labelledby={topic ? `${id}-legend` : undefined}>
      <legend id={topic ? `${id}-legend` : undefined}>
        {topic && <strong className="repeat-topic">{topic}</strong>}
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
                required={required && !multi}
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
  const [consentState, setConsentState] = useState<ConsentState>({ phase: "idle" });
  const [contactForm, setContactForm] = useState({ name: "", email: "", mobile: "" });
  const [permissions, setPermissions] = useState<Record<string, boolean>>({ I01: false, I02: false, I03: false, I04: false });
  const [clientToken] = useState<string>(createClientToken);

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
      const data = (await res.json()) as { ok: boolean; completionRef?: string; sessionId?: string; reason?: string; status?: string };
      if (!res.ok || !data.ok) {
        setSubmitState({ phase: "error", message: data.reason ?? "Submission failed. Please try again." });
        return;
      }
      setSubmitState({ phase: "done", completionRef: data.completionRef ?? "", sessionId: data.sessionId });
    } catch {
      setSubmitState({ phase: "error", message: "Network error. Please check your connection and try again." });
    }
  }, [answers, clientToken]);

  // CONS-001: optional consent step, only when the person asked for follow-up.
  const handleConsentSubmit = useCallback(async () => {
    if (submitState.phase !== "done" || !submitState.sessionId) return;
    setConsentState({ phase: "submitting" });
    try {
      const res = await fetch("/api/consent/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: submitState.sessionId,
          contact: {
            name: contactForm.name.trim() || undefined,
            email: contactForm.email.trim() || undefined,
            mobile: contactForm.mobile.trim() || undefined,
          },
          permissions,
        }),
      });
      const data = (await res.json()) as { ok: boolean; receiptToken?: string; grantedChannels?: string[]; reason?: string };
      if (!res.ok || !data.ok) {
        setConsentState({ phase: "error", message: data.reason ?? "We could not record your preferences. Please try again." });
        return;
      }
      setConsentState({ phase: "done", receiptToken: data.receiptToken ?? "", grantedChannels: data.grantedChannels ?? [] });
    } catch {
      setConsentState({ phase: "error", message: "Network error. Please check your connection and try again." });
    }
  }, [submitState, contactForm, permissions]);

  // Terminal stop from A02: show the human pathway, never the survey.
  if (stop.stop) {
    return (
      <section className="survey-end" aria-live="polite">
        <h2>We have stopped the questions</h2>
        <p>
          {stop.reason === "A02: immediate help pathway"
            ? "You asked for immediate help."
            : stop.reason === "A02: human pathway"
              ? "You asked to speak with a person."
              : "You chose not to continue with this survey."}
        </p>
        <p>You can speak with an IRAAC worker instead of continuing. If you or someone else is in immediate danger, call 000. For culturally safe crisis support, call 13YARN on 13 92 76.</p>
        <p>
          <a href="tel:139276" className="btn">Call 13YARN (13 92 76)</a>{" "}
          <a href="/contact" className="btn btn-secondary" rel="nofollow">Contact IRAAC</a>
        </p>
      </section>
    );
  }

  if (submitState.phase === "done") {
    const askedFollowUp = answers.H01 === "Yes, please contact me";
    const showConsentStep = askedFollowUp && consentState.phase !== "skipped" && consentState.phase !== "done";

    if (consentState.phase === "done") {
      return (
        <section className="survey-end" aria-live="polite">
          <h2>Preferences saved</h2>
          <p>Thank you — your contact preferences are recorded. Keep this receipt reference safe: it is the only way to change or withdraw your choices without logging in.</p>
          <p className="completion-ref">
            Receipt: <strong>{consentState.receiptToken}</strong>
          </p>
          <p>
            To withdraw or change what IRAAC may contact you about later, use{" "}
            <Link href="/survey/withdraw" rel="nofollow">the withdrawal page</Link> with this receipt. It expires automatically.
          </p>
          <p><a href="/contact" rel="nofollow">Contact IRAAC</a></p>
        </section>
      );
    }

    if (showConsentStep) {
      return (
        <section className="survey-end" aria-live="polite">
          <h2>Follow-up and preferences</h2>
          <p>You asked IRAAC to follow up about what you shared. This step is optional — you can finish here and IRAAC will still receive your answers anonymously.</p>
          <form
            className="consent-form"
            onSubmit={(e) => {
              e.preventDefault();
              void handleConsentSubmit();
            }}
          >
            <div className="field">
              <label htmlFor="cons-name">Name (optional)</label>
              <input id="cons-name" type="text" maxLength={120} value={contactForm.name} onChange={(e) => setContactForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="field">
              <label htmlFor="cons-email">Email (optional)</label>
              <input id="cons-email" type="email" maxLength={200} value={contactForm.email} onChange={(e) => setContactForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="field">
              <label htmlFor="cons-mobile">Mobile (optional)</label>
              <input id="cons-mobile" type="tel" maxLength={30} value={contactForm.mobile} onChange={(e) => setContactForm((f) => ({ ...f, mobile: e.target.value }))} />
            </div>

            <fieldset className="field">
              <legend>What may IRAAC contact you about? Nothing is selected unless you tick it.</legend>
              <label className="option">
                <input type="checkbox" checked={permissions.I01} onChange={() => setPermissions((p) => ({ ...p, I01: !p.I01 }))} />
                <span>Email me IRAAC newsletters and invitations to future surveys.</span>
              </label>
              <label className="option">
                <input type="checkbox" checked={permissions.I02} onChange={() => setPermissions((p) => ({ ...p, I02: !p.I02 }))} />
                <span>Send me SMS invitations to future surveys. Reply STOP at any time.</span>
              </label>
              <label className="option">
                <input type="checkbox" checked={permissions.I03} onChange={() => setPermissions((p) => ({ ...p, I03: !p.I03 }))} />
                <span>An IRAAC worker may call me about future surveys.</span>
              </label>
              <label className="option">
                <input type="checkbox" checked={permissions.I04} onChange={() => setPermissions((p) => ({ ...p, I04: !p.I04 }))} />
                <span>An IRAAC AI assistant may call me about future surveys. The call will identify itself as AI and I can ask for a person or end the call.</span>
              </label>
              <p className="hint">
                Recording is not authorised here. If a future call proposes recording or retaining a transcript, IRAAC must ask separately during that call.
              </p>
            </fieldset>

            <div className="nav">
              <button type="button" className="btn btn-secondary" onClick={() => setConsentState({ phase: "skipped" })}>
                Skip this step
              </button>
              <button type="submit" className="btn" disabled={consentState.phase === "submitting"}>
                {consentState.phase === "submitting" ? "Saving…" : "Save preferences"}
              </button>
            </div>
            {consentState.phase === "error" && (
              <p role="alert" className="error">{consentState.message}</p>
            )}
          </form>
          <p className="quick-exit">
            <Link href="/" rel="nofollow">Quick exit</Link> — this closes the survey. It cannot clear your browser or network history.
          </p>
        </section>
      );
    }

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
        instanceId={isRepeatInstanceId(currentId) ? currentId : undefined}
        value={answers[currentId] ?? (current.type === "multi_choice" ? [] : null)}
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
