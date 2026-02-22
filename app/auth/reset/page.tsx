"use client";

// app/auth/reset/page.tsx — Queers & Allies Fitness · Reset Password
//
// Flow:
//   1. User clicks "Forgot password?" on /auth
//   2. Supabase emails them a link pointing to /auth/reset
//   3. This page detects the recovery token in the URL hash
//   4. User enters a new password → supabase.auth.updateUser()
//   5. Redirect to /embed/home

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type PageState =
  | "loading"      // Waiting to confirm the recovery token is valid
  | "ready"        // Token confirmed — show the new password form
  | "submitting"   // Saving the new password
  | "success"      // Done — show confirmation
  | "invalid";     // No valid token found (stale/missing link)

export default function ResetPasswordPage() {
  const router = useRouter();

  const [pageState, setPageState] = useState<PageState>("loading");
  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [error, setError]         = useState<string | null>(null);
  const [countdown, setCountdown] = useState(5);

  // Supabase fires PASSWORD_RECOVERY when it detects the token in the URL hash.
  // We listen for that event to confirm the link is valid before showing the form.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "PASSWORD_RECOVERY") {
          setPageState("ready");
        }
      }
    );

    // Safety net: if no recovery event fires within 4s, the link is bad
    const timeout = setTimeout(() => {
      setPageState((prev) => prev === "loading" ? "invalid" : prev);
    }, 4000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  // Countdown redirect after success
  useEffect(() => {
    if (pageState !== "success") return;
    if (countdown <= 0) { router.push("/embed/home"); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [pageState, countdown, router]);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!password || !confirm) {
      setError("Please fill in both fields.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setPageState("submitting");

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setPageState("ready");
    } else {
      setPageState("success");
    }
  }

  return (
    <>
      <style>{`
        @keyframes rainbowShift { 0%{background-position:0%} 100%{background-position:200%} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to { transform: rotate(360deg); } }

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        html, body, #__next,
        [data-nextjs-scroll-focus-boundary], main {
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 0 !important;
          background: transparent !important;
        }

        body {
          min-height: 100dvh;
          background: linear-gradient(135deg, #d4f5e2 0%, #fde0ef 30%, #fdf6d3 60%, #d4eaf7 100%) !important;
          background-attachment: fixed !important;
          font-family: 'DM Sans', sans-serif;
        }

        ::-webkit-scrollbar { display: none; }

        .reset-card {
          background: rgba(255,255,255,0.82);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 24px;
          padding: 36px 32px;
          box-shadow: 0 8px 40px rgba(0,0,0,0.10);
          animation: fadeUp 0.4s ease both;
          width: 100%;
          max-width: 420px;
        }

        .reset-input {
          width: 100%;
          padding: 13px 16px;
          border-radius: 14px;
          border: 1.5px solid rgba(0,0,0,0.1);
          background: rgba(255,255,255,0.9);
          font-size: 14px;
          font-family: 'DM Sans', sans-serif;
          outline: none;
          transition: border-color 0.15s;
          color: #0e0e0e;
        }
        .reset-input:focus { border-color: #7b2d8b; }
        .reset-input::placeholder { color: #aaa; }

        /* Strength meter colors */
        .strength-bar {
          height: 4px;
          border-radius: 99px;
          transition: width 0.3s, background 0.3s;
        }

        .primary-btn {
          width: 100%;
          padding: 14px;
          border-radius: 14px;
          border: none;
          background: linear-gradient(135deg, #7b2d8b, #ff3c5f);
          color: #fff;
          font-size: 15px;
          font-weight: 700;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer;
          transition: opacity 0.15s, transform 0.15s;
        }
        .primary-btn:hover:not(:disabled) { opacity: 0.91; transform: translateY(-1px); }
        .primary-btn:disabled { opacity: 0.45; cursor: default; }

        .error-box {
          background: #fff0f0; border: 1px solid #ffc5c5;
          color: #c0392b; border-radius: 12px;
          padding: 10px 14px; font-size: 13px; line-height: 1.4;
        }

        .spinner {
          width: 40px; height: 40px;
          border: 3px solid rgba(123,45,139,0.2);
          border-top-color: #7b2d8b;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .rainbow-strip {
          height: 5px; width: 100%;
          background: linear-gradient(90deg,#ff3c5f,#ff8c42,#ffd166,#06d6a0,#118ab2,#7b2d8b,#ff3c5f);
          background-size: 200% 100%;
          animation: rainbowShift 4s linear infinite;
        }
      `}</style>

      <div style={{ minHeight: "100dvh", width: "100%", display: "flex", flexDirection: "column" }}>

        {/* Rainbow strip */}
        <div className="rainbow-strip" />

        {/* Centered layout */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 20px" }}>

          {/* Wordmark */}
          <div style={{ marginBottom: 28, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🏳️‍🌈</div>
            <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 15, letterSpacing: 3, color: "#7b2d8b", opacity: 0.85 }}>
              QUEERS & ALLIES FITNESS
            </div>
          </div>

          {/* ── LOADING ── */}
          {pageState === "loading" && (
            <div className="reset-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, textAlign: "center" }}>
              <div className="spinner" />
              <div>
                <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 22, letterSpacing: 1, color: "#0e0e0e" }}>
                  Verifying your link…
                </div>
                <p style={{ fontSize: 13, color: "#888", marginTop: 6 }}>Just a moment</p>
              </div>
            </div>
          )}

          {/* ── INVALID / EXPIRED LINK ── */}
          {pageState === "invalid" && (
            <div className="reset-card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⏰</div>
              <h1 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 26, letterSpacing: 1, color: "#0e0e0e", marginBottom: 8 }}>
                Link Expired
              </h1>
              <p style={{ fontSize: 14, color: "#666", lineHeight: 1.6, marginBottom: 24 }}>
                This password reset link has expired or already been used.
                Reset links are only valid for 1 hour.
              </p>
              <button
                onClick={() => router.push("/auth")}
                className="primary-btn"
                style={{ marginBottom: 12 }}
              >
                Request a new link
              </button>
              <button
                onClick={() => router.push("/embed/home")}
                style={{ background: "none", border: "none", color: "#888", fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
              >
                Back to home
              </button>
            </div>
          )}

          {/* ── PASSWORD FORM ── */}
          {(pageState === "ready" || pageState === "submitting") && (
            <div className="reset-card">
              <h1 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 28, letterSpacing: 1, color: "#0e0e0e", marginBottom: 6 }}>
                Set new password
              </h1>
              <p style={{ fontSize: 13, color: "#777", marginBottom: 24, lineHeight: 1.5 }}>
                Choose something strong — at least 8 characters.
              </p>

              <form onSubmit={handleReset} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                {error && <div className="error-box">⚠️ {error}</div>}

                {/* New password */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#444" }}>New Password</label>
                  <input
                    className="reset-input"
                    type="password"
                    placeholder="8+ characters"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(null); }}
                    autoComplete="new-password"
                    autoFocus
                  />
                  {/* Strength meter */}
                  {password.length > 0 && (
                    <PasswordStrength password={password} />
                  )}
                </div>

                {/* Confirm password */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#444" }}>Confirm Password</label>
                  <input
                    className="reset-input"
                    type="password"
                    placeholder="Same password again"
                    value={confirm}
                    onChange={(e) => { setConfirm(e.target.value); setError(null); }}
                    autoComplete="new-password"
                    onKeyDown={(e) => e.key === "Enter" && handleReset(e as unknown as React.FormEvent)}
                  />
                  {/* Match indicator */}
                  {confirm.length > 0 && (
                    <div style={{ fontSize: 12, fontWeight: 600, color: password === confirm ? "#1b7a4e" : "#c0392b" }}>
                      {password === confirm ? "✓ Passwords match" : "✗ Passwords don't match"}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="primary-btn"
                  disabled={pageState === "submitting" || password.length < 8 || password !== confirm}
                  style={{ marginTop: 4 }}
                >
                  {pageState === "submitting" ? "Saving…" : "Set New Password"}
                </button>

              </form>
            </div>
          )}

          {/* ── SUCCESS ── */}
          {pageState === "success" && (
            <div className="reset-card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>🎉</div>
              <h1 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 26, letterSpacing: 1, color: "#0e0e0e", marginBottom: 8 }}>
                Password updated!
              </h1>
              <p style={{ fontSize: 14, color: "#666", lineHeight: 1.6, marginBottom: 24 }}>
                You're all set. Redirecting you to the app in{" "}
                <span style={{ fontWeight: 700, color: "#7b2d8b" }}>{countdown}</span>…
              </p>
              <button
                onClick={() => router.push("/embed/home")}
                className="primary-btn"
              >
                Go to app now →
              </button>
            </div>
          )}

        </div>
      </div>
    </>
  );
}

// ── Password strength meter ────────────────────────────────────────────────────
function PasswordStrength({ password }: { password: string }) {
  const score = getStrengthScore(password);

  const levels = [
    { label: "Too short", color: "#e74c3c" },
    { label: "Weak",      color: "#e67e22" },
    { label: "Fair",      color: "#f1c40f" },
    { label: "Good",      color: "#2ecc71" },
    { label: "Strong",    color: "#1b7a4e" },
  ];

  const { label, color } = levels[score];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", gap: 4 }}>
        {levels.map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1, height: 4, borderRadius: 99,
              background: i <= score ? color : "rgba(0,0,0,0.08)",
              transition: "background 0.3s",
            }}
          />
        ))}
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color }}>{label}</div>
    </div>
  );
}

function getStrengthScore(pw: string): number {
  if (pw.length < 8) return 0;
  let score = 1;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
}