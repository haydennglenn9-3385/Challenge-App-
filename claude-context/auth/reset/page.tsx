"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type PageState =
  | "loading"
  | "ready"
  | "submitting"
  | "success"
  | "invalid";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [pageState, setPageState] = useState<PageState>("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(5);

  // Detect Supabase PASSWORD_RECOVERY event
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "PASSWORD_RECOVERY") {
          setPageState("ready");
        }
      }
    );

    const timeout = setTimeout(() => {
      setPageState((prev) => (prev === "loading" ? "invalid" : prev));
    }, 4000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  // Redirect after success
  useEffect(() => {
    if (pageState !== "success") return;
    if (countdown <= 0) {
      router.push("/embed/home");
      return;
    }
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
          outline: none;
          transition: border-color 0.15s;
        }

        .reset-input:focus { border-color: #7b2d8b; }

        .primary-btn {
          width: 100%;
          padding: 14px;
          border-radius: 14px;
          border: none;
          background: linear-gradient(135deg, #7b2d8b, #ff3c5f);
          color: #fff;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: opacity 0.15s, transform 0.15s;
        }

        .primary-btn:hover:not(:disabled) { opacity: 0.91; transform: translateY(-1px); }
        .primary-btn:disabled { opacity: 0.45; cursor: default; }

        .error-box {
          background: #fff0f0;
          border: 1px solid #ffc5c5;
          color: #c0392b;
          border-radius: 12px;
          padding: 10px 14px;
          font-size: 13px;
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

      <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
        <div className="rainbow-strip" />

        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 20px" }}>
          <div style={{ marginBottom: 28, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🏳️‍🌈</div>
            <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 15, letterSpacing: 3, color: "#7b2d8b", opacity: 0.85 }}>
              QUEERS & ALLIES FITNESS
            </div>
          </div>

          {/* LOADING */}
          {pageState === "loading" && (
            <div className="reset-card" style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 20 }}>
              <div className="spinner" />
              <div>
                <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 22 }}>Verifying your link…</div>
                <p style={{ fontSize: 13, color: "#888" }}>Just a moment</p>
              </div>
            </div>
          )}

          {/* INVALID */}
          {pageState === "invalid" && (
            <div className="reset-card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⏰</div>
              <h1 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 26 }}>Link Expired</h1>
              <p style={{ fontSize: 14, color: "#666", marginBottom: 24 }}>
                This password reset link has expired or already been used.
              </p>

              <button className="primary-btn" onClick={() => router.push("/auth")} style={{ marginBottom: 12 }}>
                Request a new link
              </button>

              <button
                onClick={() => router.push("/embed/home")}
                style={{ background: "none", border: "none", color: "#888", fontSize: 13, cursor: "pointer" }}
              >
                Back to home
              </button>
            </div>
          )}

          {/* FORM */}
          {(pageState === "ready" || pageState === "submitting") && (
            <div className="reset-card">
              <h1 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 28 }}>Set new password</h1>
              <p style={{ fontSize: 13, color: "#777", marginBottom: 24 }}>
                Choose something strong — at least 8 characters.
              </p>

              <form onSubmit={handleReset} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {error && <div className="error-box">⚠️ {error}</div>}

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 700 }}>New Password</label>
                  <input
                    className="reset-input"
                    type="password"
                    placeholder="8+ characters"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(null); }}
                    autoComplete="new-password"
                    autoFocus
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 700 }}>Confirm Password</label>
                  <input
                    className="reset-input"
                    type="password"
                    placeholder="Same password again"
                    value={confirm}
                    onChange={(e) => { setConfirm(e.target.value); setError(null); }}
                    autoComplete="new-password"
                  />

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
                >
                  {pageState === "submitting" ? "Saving…" : "Set New Password"}
                </button>
              </form>
            </div>
          )}

          {/* SUCCESS */}
          {pageState === "success" && (
            <div className="reset-card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>🎉</div>
              <h1 style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 26 }}>Password updated!</h1>
              <p style={{ fontSize: 14, color: "#666", marginBottom: 24 }}>
                Redirecting in <span style={{ fontWeight: 700, color: "#7b2d8b" }}>{countdown}</span>…
              </p>

              <button className="primary-btn" onClick={() => router.push("/embed/home")}>
                Go to app now →
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
