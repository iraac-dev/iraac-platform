"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLoginClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    );
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError("Sign-in failed. Check your details or that your account has staff access.");
      setLoading(false);
      return;
    }
    router.push("/admin");
    router.refresh();
  };

  return (
    <section className="survey-end">
      <h1>Staff sign in</h1>
      <p>IRAAC platform dashboard. Authorised staff and auditors only.</p>
      <form className="consent-form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="admin-email">Email</label>
          <input id="admin-email" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="admin-password">Password</label>
          <input id="admin-password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="nav">
          <button type="submit" className="btn" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </div>
        {error && <p role="alert" className="error">{error}</p>}
      </form>
    </section>
  );
}
