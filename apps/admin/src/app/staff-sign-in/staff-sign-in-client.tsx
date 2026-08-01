"use client";

import Image from "next/image";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type MfaStep =
  | { phase: "password" }
  | { phase: "verify"; factorId: string }
  | { phase: "enroll"; factorId: string; qrCode: string; secret: string };

export default function StaffSignInClient() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  ), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<MfaStep>({ phase: "password" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const completeMfa = async (factorId: string) => {
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code: code.replace(/\s/g, ""),
    });
    if (verifyError) throw verifyError;
    router.push("/admin");
    router.refresh();
  };

  const handlePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError("Sign-in failed. Check your details or ask the platform custodian to confirm your access.");
      setLoading(false);
      return;
    }
    const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
    if (factorsError) {
      setError("We could not check multi-factor authentication. Please try again.");
      setLoading(false);
      return;
    }
    const verified = factors.totp.find((factor) => factor.status === "verified");
    if (verified) {
      setStep({ phase: "verify", factorId: verified.id });
      setLoading(false);
      return;
    }
    const { data: enrollment, error: enrollmentError } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    if (enrollmentError) {
      setError("We could not start multi-factor enrollment. Please contact the platform custodian.");
      setLoading(false);
      return;
    }
    setStep({
      phase: "enroll",
      factorId: enrollment.id,
      qrCode: enrollment.totp.qr_code,
      secret: enrollment.totp.secret,
    });
    setLoading(false);
  };

  const handleMfa = async (event: React.FormEvent) => {
    event.preventDefault();
    if (step.phase === "password") return;
    setLoading(true);
    setError(null);
    try {
      await completeMfa(step.factorId);
    } catch {
      setError("That verification code was not accepted. Check your authenticator and try again.");
      setLoading(false);
    }
  };

  return (
    <main className="survey-shell">
      <section className="survey-end">
        <h1>Staff sign in</h1>
        <p>IRAAC platform dashboard. Authorised named staff and auditors only.</p>
        {step.phase === "password" ? (
          <form className="consent-form" onSubmit={handlePassword}>
            <div className="field">
              <label htmlFor="admin-email">Email</label>
              <input id="admin-email" type="email" required autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="admin-password">Password</label>
              <input id="admin-password" type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </div>
            <button type="submit" className="btn" disabled={loading}>{loading ? "Signing in…" : "Continue"}</button>
          </form>
        ) : (
          <form className="consent-form" onSubmit={handleMfa}>
            {step.phase === "enroll" && (
              <div className="field">
                <p>Scan this code in your authenticator app, then enter the six-digit code.</p>
                <Image src={step.qrCode} width={220} height={220} alt="Authenticator enrollment QR code" unoptimized />
                <details><summary>Enter setup key instead</summary><code>{step.secret}</code></details>
              </div>
            )}
            <div className="field">
              <label htmlFor="admin-mfa">Authenticator code</label>
              <input id="admin-mfa" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,8}" required value={code} onChange={(event) => setCode(event.target.value)} />
            </div>
            <button type="submit" className="btn" disabled={loading}>{loading ? "Verifying…" : "Verify and open dashboard"}</button>
          </form>
        )}
        {error && <p role="alert" className="error">{error}</p>}
      </section>
    </main>
  );
}
