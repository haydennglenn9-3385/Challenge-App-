"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function JoinWithCodePage() {
  const router = useRouter();
  const [code, setCode]       = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [authed, setAuthed]   = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setAuthed(!!user);
    });
  }, []);

  async function handleJoin() {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) { setErrorMsg("Please enter a code."); return; }

    if (!authed) {
      // Save code to sessionStorage so we can pick it up after auth
      sessionStorage.setItem("pendingJoinCode", trimmed);
      router.push("/auth");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    // Look up challenge by join_code
    const { data: challenge, error: findErr } = await supabase
      .from("challenges")
      .select("id, name")
      .eq("join_code", trimmed)
      .single();

    if (findErr || !challenge) {
      setErrorMsg("Code not found. Double-check and try again.");
      setLoading(false);
      return;
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setErrorMsg("You need to be logged in to join."); setLoading(false); return; }

    // Check if already a member
    const { data: existing } = await supabase
      .from("challenge_members")
      .select("id")
      .eq("challenge_id", challenge.id)
      .eq("user_id", user.id)
      .single();

    if (existing) {
      setSuccessMsg(`You're already in "${challenge.name}"!`);
      setTimeout(() => router.push(`/embed/challenge/${challenge.id}`), 1500);
      setLoading(false);
      return;
    }

    // Join the challenge
    const { error: joinErr } = await supabase
      .from("challenge_members")
      .insert({ challenge_id: challenge.id, user_id: user.id });

    if (joinErr) {
      setErrorMsg("Something went wrong joining. Please try again.");
    } else {
      setSuccessMsg(`You've joined "${challenge.name}"! 🎉`);
      setTimeout(() => router.push(`/embed/challenge/${challenge.id}`), 1500);
    }

    setLoading(false);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes rainbowShift { 0%{background-position:0%} 100%{background-position:200%} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { display: none; }
      `}</style>

      <div style={{
        minHeight: "100dvh",
        width: "100%",
        background: "linear-gradient(135deg, #d4f5e2 0%, #fde0ef 30%, #fdf6d3 60%, #d4eaf7 100%)",
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-inter), system-ui, sans-serif",
      }}>
        {/* Rainbow strip */}
        <div style={{
          height: 12, width: "100%",
          background: "linear-gradient(90deg,#ff3c5f,#ff8c42,#ffd166,#06d6a0,#118ab2,#7b2d8b,#ff3c5f)",
          backgroundSize: "200% 100%",
          animation: "rainbowShift 4s linear infinite",
          flexShrink: 0,
        }} />

        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 20px", paddingBottom: 100 }}>

          {/* Icon + heading */}
          <div style={{ textAlign: "center", marginBottom: 28, animation: "fadeUp 0.4s ease both" }}>
            <div style={{ fontSize: 48, marginBottom: 10 }}>🔑</div>
            <div style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" , fontSize: 28, letterSpacing: 1, color: "#0e0e0e" }}>
              Join with Code
            </div>
            <p style={{ fontSize: 13, color: "#777", marginTop: 6 }}>
              Enter the challenge code you received
            </p>
          </div>

          {/* Card */}
          <div style={{
            background: "rgba(255,255,255,0.88)",
            backdropFilter: "blur(20px)",
            borderRadius: 24,
            padding: "28px 24px",
            width: "100%",
            maxWidth: 400,
            boxShadow: "0 8px 40px rgba(0,0,0,0.10)",
            animation: "fadeUp 0.4s ease 0.08s both",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}>

            {/* Error */}
            {errorMsg && (
              <div style={{ background: "#fff0f0", border: "1px solid #ffc5c5", color: "#c0392b", borderRadius: 12, padding: "10px 14px", fontSize: 13 }}>
                ⚠️ {errorMsg}
              </div>
            )}

            {/* Success */}
            {successMsg && (
              <div style={{ background: "#f0fff8", border: "1px solid #b7f5d8", color: "#1b7a4e", borderRadius: 12, padding: "10px 14px", fontSize: 13 }}>
                ✅ {successMsg}
              </div>
            )}

            {/* Code input */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#555", letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 8 }}>
                Challenge Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => { setCode(e.target.value.toUpperCase()); setErrorMsg(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                placeholder="e.g. PRIDE24"
                maxLength={20}
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  borderRadius: 14,
                  border: "1.5px solid rgba(0,0,0,0.1)",
                  background: "rgba(255,255,255,0.9)",
                  fontSize: 20,
                  fontWeight: 700,
                  letterSpacing: 3,
                  fontFamily: "var(--font-inter), system-ui, sans-serif",
                  outline: "none",
                  textAlign: "center",
                  textTransform: "uppercase",
                  color: "#0e0e0e",
                  transition: "border-color 0.15s",
                }}
                onFocus={(e) => e.target.style.borderColor = "#7b2d8b"}
                onBlur={(e) => e.target.style.borderColor = "rgba(0,0,0,0.1)"}
              />
            </div>

            {/* Join button */}
            <button
              onClick={handleJoin}
              disabled={loading || !code.trim()}
              style={{
                width: "100%",
                padding: 14,
                borderRadius: 14,
                border: "none",
                background: loading || !code.trim()
                  ? "rgba(0,0,0,0.12)"
                  : "linear-gradient(135deg, #7b2d8b, #ff3c5f)",
                color: loading || !code.trim() ? "#999" : "#fff",
                fontSize: 15,
                fontWeight: 700,
                fontFamily: "var(--font-inter), system-ui, sans-serif",
                cursor: loading || !code.trim() ? "default" : "pointer",
                transition: "opacity 0.15s, transform 0.15s",
              }}
            >
              {loading ? "Joining…" : authed === false ? "Continue to Log In →" : "Join Challenge"}
            </button>

            {/* Not logged in note */}
            {authed === false && (
              <p style={{ fontSize: 12, color: "#999", textAlign: "center", lineHeight: 1.5 }}>
                You'll be asked to log in or sign up, then automatically joined.
              </p>
            )}
          </div>

          {/* Back link */}
          <button
            onClick={() => router.back()}
            style={{ marginTop: 20, background: "none", border: "none", color: "#7b2d8b", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-inter), system-ui, sans-serif" }}
          >
            ← Back
          </button>
        </div>
      </div>
    </>
  );
}