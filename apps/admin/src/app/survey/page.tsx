import type { Metadata } from "next";
import Link from "next/link";
import { SURVEY_V1, SURVEY_V1_HASH } from "@iraac/survey-contract";
import SurveyClient from "./survey-client";

export const metadata: Metadata = {
  title: "Have Your Say — IRAAC",
  description:
    "IRAAC listens to Aboriginal communities. Take part in the Have Your Say survey — anonymous, about 8–12 minutes.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

// Neutral title + no-store page; no analytics, no session replay, no trackers.
export default function SurveyPage() {
  return (
    <main lang="en" className="survey-page">
      <header className="survey-header">
        <p className="survey-kicker">IRAAC — listening to community</p>
        <h1>{SURVEY_V1.title}</h1>
        <div className="survey-intro">
          {SURVEY_V1.introduction.split("\n\n").map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
        <aside className="survey-notice" role="note">
          <p>
            <strong>Before you start:</strong> this survey is anonymous by default. You do not need to give your
            name, email or phone number. You can skip any question, stop at any time, or use the Quick exit at the
            bottom of every page. Nothing you share here is ever sold or used for advertising.
          </p>
          <ul>
            <li>
              <Link href="/survey/privacy" rel="nofollow">Privacy Notice</Link>
            </li>
            <li>
              <Link href="/survey/how-answers-are-used" rel="nofollow">How your answers are used</Link>
            </li>
            <li>
              <Link href="/survey/complaints" rel="nofollow">How to make a complaint</Link>
            </li>
            <li>
              <a href="tel:139276">Crisis support: 13YARN 13 92 76</a> (always available)
            </li>
          </ul>
        </aside>
        <p className="survey-hash" aria-hidden="true">
          Release {SURVEY_V1_HASH.slice(0, 12)}
        </p>
      </header>

      <SurveyClient />

      <noscript>
        <section className="survey-noscript" aria-label="Without JavaScript">
          <h2>Taking part without JavaScript</h2>
          <p>
            This survey works best with JavaScript enabled, but you can still complete it step by step below. If you
            would prefer to speak with an IRAAC worker instead, call or visit us — we are happy to help.
          </p>
          <p>
            <Link href="/survey/plain" rel="nofollow">Open the text-only version</Link> (works without JavaScript)
          </p>
        </section>
      </noscript>
    </main>
  );
}
