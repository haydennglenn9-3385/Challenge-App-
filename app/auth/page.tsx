"use client";

// app/auth/page.tsx — Queers & Allies Fitness · Login / Sign Up

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Mode = "login" | "signup";

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function clearState() {
    setError(null);
    setSuccess(null);
  }

  function switchMode(next: Mode) {
    setMode(next);
    clearState();
    setEmail("");
    setPassword("");
    setDisplayName("");
    setAgreed(false);
  }

  async function handleEmailAuth() {
    clearState();

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    if (mode === "signup" && !agreed) {
      setError("Please agree to the terms to create an account.");
      return;
    }

    if (mode === "signup" && password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    if (mode === "login") {
      const { error: err } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (err) {
        setError(err.message);
      } else {
        window.location.href = "/embed/profile";
      }
    } else {
      const { data, error: err } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName || email.split("@")[0] },
        },
      });

      if (err) {
        setError(err.message);
      } else if (data.user && !data.session) {
        setSuccess("Check your email to confirm your account, then log in.");
        setMode("login");
      } else {
        window.location.href = "/embed/dashboard";
      }
    }

    setLoading(false);
  }

  const isSignup = mode === "signup";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&display=swap');

        @keyframes rainbowShift { 0%{background-position:0%} 100%{background-position:200%} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        html, body, #__next,
        [data-nextjs-scroll-focus-boundary], main {
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 0 !important;
          background: transparent !important;
          display: block !important;
        }

        body {
          min-height: 100dvh;
          background: linear-gradient(135deg, #d4f5e2 0%, #fde0ef 30%, #fdf6d3 60%, #d4eaf7 100%) !important;
          background-attachment: fixed !important;
          font-family: 'DM Sans', sans-serif;
        }

        ::-webkit-scrollbar { display: none; }

        .auth-card {
          background: rgba(255,255,255,0.82);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 24px;
          padding: 32px 28px;
          box-shadow: 0 8px 40px rgba(0,0,0,0.10);
          animation: fadeUp 0.4s ease both;
          width: 100%;
          max-width: 400px;
        }

        .input-field {
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

        .input-field:focus { border-color: #7b2d8b; }
        .input-field::placeholder { color: #aaa; }

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
          letter-spacing: 0.3px;
        }

        .primary-btn:hover:not(:disabled) { opacity: 0.92; transform: translateY(-1px); }
        .primary-btn:disabled { opacity: 0.5; cursor: default; }

        .tab {
          flex: 1;
          padding: 10px;
          border: none;
          background: transparent;
          font-size: 14px;
          font-weight: 700;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer;
          border-radius: 12px;
          transition: background 0.15s, color 0.15s;
          color: #999;
        }

        .tab.active {
          background: #0e0e0e;
          color: #fff;
        }

        .error-box {
          background: #fff0f0;
          border: 1px solid #ffc5c5;
          color: #c0392b;
          border-radius: 12px;
          padding: 10px 14px;
          font-size: 13px;
          line-height: 1.4;
        }

        .success-box {
          background: #f0fff8;
          border: 1px solid #b7f5d8;
          color: #1b7a4e;
          border-radius: 12px;
          padding: 10px 14px;
          font-size: 13px;
          line-height: 1.4;
        }

        .checkbox-row {
          display: flex; align-items: flex-start; gap: 10px;
          cursor: pointer;
        }

        .checkbox-row input[type="checkbox"] {
          width: 18px; height: 18px; margin-top: 1px;
          accent-color: #7b2d8b; cursor: pointer; flex-shrink: 0;
        }

        .checkbox-label {
          font-size: 12px; color: #555; line-height: 1.5;
        }

        .checkbox-label a {
          color: #7b2d8b; text-decoration: none; font-weight: 600;
        }

        .checkbox-label a:hover { text-decoration: underline; }
      `}</style>

      {/* Full page */}
      <div style={{ minHeight: "100dvh", width: "100%", display: "flex", flexDirection: "column" }}>
        {/* Rainbow strip */}
        <div
          style={{
            height: 5,
            width: "100%",
            flexShrink: 0,
            background:
              "linear-gradient(90deg,#ff3c5f,#ff8c42,#ffd166,#06d6a0,#118ab2,#7b2d8b,#ff3c5f)",
            backgroundSize: "200% 100%",
            animation: "rainbowShift 4s linear infinite",
          }}
        />

        {/* Centered content */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "32px 20px",
          }}
        >
          {/* Logo */}
          <div style={{ marginBottom: 28, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🏳️‍🌈</div>
            <div
              style={{
                fontFamily: "'Bebas Neue', cursive",
                fontSize: 15,
                letterSpacing: 3,
                color: "#7b2d8b",
                opacity: 0.85,
              }}
            >
              QUEERS & ALLIES FITNESS
            </div>
          </div>

          <div className="auth-card">
            {/* Mode tabs */}
            <div
              style={{
                display: "flex",
                gap: 6,
                background: "rgba(0,0,0,0.06)",
                borderRadius: 14,
                padding: 4,
                marginBottom: 24,
              }}
            >
              <button
                className={`tab ${mode === "login" ? "active" : ""}`}
                onClick={() => switchMode("login")}
              >
                Log In
              </button>
              <button
                className={`tab ${mode === "signup" ? "active" : ""}`}
                onClick={() => switchMode("signup")}
              >
                Sign Up
              </button>
            </div>

            {/* Heading */}
            <div style={{ marginBottom: 20 }}>
              <h1
                style={{
                  fontFamily: "'Bebas Neue', cursive",
                  fontSize: 26,
                  letterSpacing: 1,
                  color: "#0e0e0e",
                  lineHeight: 1.1,
                }}
              >
                {isSignup ? "Create your account" : "Welcome back"}
              </h1>
              <p style={{ fontSize: 13, color: "#777", marginTop: 4 }}>
                {isSignup
                  ? "Join the Queers & Allies community."
                  : "Log in to track your challenges and streak."}
              </p>
            </div>

            {/* Error / success */}
            {error && (
              <div className="error-box" style={{ marginBottom: 16 }}>
                ⚠️ {error}
              </div>
            )}
            {success && (
              <div className="success-box" style={{ marginBottom: 16 }}>
                ✅ {success}
              </div>
            )}

            {/* Form fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {isSignup && (
                <input
                  className="input-field"
                  type="text"
                  placeholder="Display name (optional)"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  autoComplete="name"
                />
              )}

              <input
                className="input-field"
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />

              <input
                className="input-field"
                type="password"
                placeholder={isSignup ? "Password (8+ characters)" : "Password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isSignup ? "new-password" : "current-password"}
                onKeyDown={(e) => e.key === "Enter" && handleEmailAuth()}
              />

              {/* Terms checkbox — signup only */}
              {isSignup && (
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                  />
                  <span className="checkbox-label">
                    I agree to the{" "}
                    <a href="/terms" target="_blank" rel="noopener noreferrer">
                      Terms of Service
                    </a>{" "}
                    and{" "}
                    <a
                      href="/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Privacy Policy
                    </a>
                    .
                  </span>
                </label>
              )}

              {/* Primary CTA */}
              <button
                className="primary-btn"
                onClick={handleEmailAuth}
                disabled={loading || (isSignup && !agreed)}
                style={{ marginTop: 4 }}
              >
                {loading ? "..." : isSignup ? "Create Account" : "Log In"}
              </button>

              {/* Forgot password — login only */}
              {!isSignup && (
                <button
                  onClick={async () => {
                    if (!email) {
                      setError("Enter your email above first.");
                      return;
                    }
                    clearState();
                    const { error: err } =
                      await supabase.auth.resetPasswordForEmail(email, {
                        redirectTo: `${window.location.origin}/auth/reset`,
                      });
                    if (err) setError(err.message);
                    else
                      setSuccess(
                        "Password reset email sent — check your inbox."
                      );
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#7b2d8b",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    textAlign: "center",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  Forgot password?
                </button>
              )}
            </div>

            {/* Footer switch */}
            <p
              style={{
                marginTop: 20,
                fontSize: 13,
                color: "#777",
                textAlign: "center",
              }}
            >
              {isSignup ? "Already have an account? " : "Don't have an account? "}
              <button
                onClick={() => switchMode(isSignup ? "login" : "signup")}
                style={{
                  background: "none",
                  border: "none",
                  color: "#7b2d8b",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: 13,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {isSignup ? "Log in" : "Sign up free"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
