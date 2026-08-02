"use client";

import { useState } from "react";
import Link from "next/link";

type WithdrawState =
  | { phase: "idle" }
  | { phase: "submitting" }
  | { phase: "done"; message: string }
  | { phase: "error"; message: string };

export default function WithdrawClient() {
  const [token, setToken] = useState("");
  const [channel, setChannel] = useState("");
  const [state, setState] = useState<WithdrawState>({ phase: "idle" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState({ phase: "submitting" });
    try {
      const res = await fetch("/api/consent/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim(), channel: channel || undefined }),
      });
      const data = (await res.json()) as { ok: boolean; reason?: string; revokedChannels?: string[] };
      if (!res.ok || !data.ok) {
        setState({ phase: "error", message: data.reason ?? "We could not process that request." });
        return;
      }
      const channels = data.revokedChannels?.length
        ? data.revokedChannels.join(", ")
        : "all contact channels";
      setState({ phase: "done", message: `Your withdrawal is recorded for ${channels}. IRAAC will stop contacting you for those channels.` });
    } catch {
      setState({ phase: "error", message: "Network error. Please check your connection and try again." });
    }
  };

  return (
    <section className="survey-end" aria-live="polite">
      <h1>Withdraw or change contact preferences</h1>
      <p>Use the receipt token you received when you saved your preferences. You can withdraw from one channel or all channels — no login needed.</p>

      {state.phase === "done" ? (
        <>
          <p className="completion-ref"><strong>{state.message}</strong></p>
          <p><Link href="/" rel="nofollow">Back to IRAAC</Link></p>
        </>
      ) : (
        <form className="consent-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="wd-token">Receipt token</label>
            <input
              id="wd-token"
              type="text"
              required
              autoComplete="off"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste your receipt token"
            />
          </div>
          <div className="field">
            <label htmlFor="wd-channel">Channel (optional — leave blank to withdraw from all)</label>
            <select id="wd-channel" value={channel} onChange={(e) => setChannel(e.target.value)}>
              <option value="">All channels</option>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="human_call">Human phone call</option>
              <option value="ai_call">AI phone call</option>
              <option value="recording">Recording preference</option>
            </select>
          </div>
          <div className="nav">
            <button type="submit" className="btn" disabled={state.phase === "submitting"}>
              {state.phase === "submitting" ? "Processing…" : "Withdraw"}
            </button>
          </div>
          {state.phase === "error" && <p role="alert" className="error">{state.message}</p>}
        </form>
      )}
    </section>
  );
}
