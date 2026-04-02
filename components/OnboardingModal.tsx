"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/UserContext";
import { markOnboarded } from "@/app/actions/markOnboarded";

const EMOJI_CATEGORIES = [
  {
    label: "Pride 🏳️‍🌈",
    emojis: ["🏳️‍🌈", "🏳️‍⚧️", "❤️‍🔥", "💜", "🩷", "🩵", "🤍", "🖤", "💛", "🧡", "❤️", "💙"],
  },
  {
    label: "Fitness 💪",
    emojis: ["💪", "🏋️", "🤸", "🧘", "🏃", "🚴", "🤾", "⚡", "🔥", "🥊", "🏅", "🎯"],
  },
  {
    label: "Vibes ✨",
    emojis: ["✨", "🌈", "🦋", "🌸", "🌻", "🌙", "⭐", "💫", "🦄", "🐝", "🌺", "💎"],
  },
  {
    label: "Fun 😄",
    emojis: ["😎", "🥳", "🤩", "😈", "👾", "🤖", "💀", "🎉", "🍀", "🫶", "✌️", "🤟"],
  },
];

export default function OnboardingModal() {
  const router = useRouter();
  const { user, needsOnboarding, setOnboarded } = useUser();

  const [step, setStep]           = useState(0);
  const [chosenEmoji, setChosenEmoji] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const [saving, setSaving]       = useState(false);

  if (!needsOnboarding || !user) return null;

  const firstName = user.name?.split(" ")[0] || "there";

  async function finish(emoji?: string) {
    setSaving(true);
    await markOnboarded(emoji || chosenEmoji || undefined);
    setOnboarded();
    setSaving(false);
  }

  async function handleGoToChallenges(emoji?: string) {
    await finish(emoji);
    router.push("/embed/challenges");
  }

  async function handleJoinCode(emoji?: string) {
    await finish(emoji);
    router.push("/embed/join");
  }

  // ── Step content ─────────────────────────────────────────────────────────────

  const steps = [
    // Step 0 — Welcome
    <div key="welcome">
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🏳️‍🌈</div>
        <h2 style={{
          fontSize: 30, fontWeight: 900, color: "#0f172a",
          margin: "0 0 10px", letterSpacing: -0.5, lineHeight: 1.15,
        }}>
          Welcome,{" "}
          <span style={{
            background: "linear-gradient(135deg, #ff6b9d, #ff9f43, #ffdd59, #48cfad, #667eea)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            {firstName}!
          </span>
        </h2>
        <p style={{ color: "#64748b", fontSize: 15, lineHeight: 1.6, margin: 0 }}>
          You're joining Queers & Allies Fitness — streak-based challenges,
          team competition, and a crew that keeps you accountable.
        </p>
      </div>
      <button onClick={() => setStep(1)} style={primaryBtn}>
        Let's get started →
      </button>
    </div>,

    // Step 1 — Pick avatar
    <div key="avatar">
      <div style={{ marginBottom: 20 }}>
        <p style={stepLabel}>Step 1 of 2</p>
        <h2 style={stepTitle}>Pick Your Avatar</h2>
        <p style={stepSub}>Shows on the leaderboard & activity feed</p>
      </div>

      {/* Preview */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
        <div style={{
          width: 60, height: 60, borderRadius: "50%", flexShrink: 0,
          background: chosenEmoji
            ? "linear-gradient(135deg, rgba(255,107,157,0.15), rgba(102,126,234,0.15))"
            : "#f1f5f9",
          border: chosenEmoji ? "2.5px solid rgba(255,107,157,0.4)" : "2px solid #e5e7eb",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 32, transition: "all 0.2s",
        }}>
          {chosenEmoji || "?"}
        </div>
        <p style={{ fontSize: 13, color: "#94a3b8", fontWeight: 600, margin: 0 }}>
          {chosenEmoji ? "Tap any emoji to change it" : "Tap an emoji below to pick yours"}
        </p>
      </div>

      {/* Category tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, overflowX: "auto", scrollbarWidth: "none" }}>
        {EMOJI_CATEGORIES.map((cat, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(i)}
            style={{
              padding: "5px 12px", borderRadius: 100, border: "none",
              fontSize: 11, fontWeight: 800, whiteSpace: "nowrap", cursor: "pointer",
              background: activeTab === i
                ? "linear-gradient(135deg, #ff6b9d, #667eea)"
                : "#f1f5f9",
              color: activeTab === i ? "white" : "#555",
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Emoji grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8, marginBottom: 20 }}>
        {EMOJI_CATEGORIES[activeTab].emojis.map((emoji) => (
          <button
            key={emoji}
            onClick={() => setChosenEmoji(emoji)}
            style={{
              aspectRatio: "1", borderRadius: 12, border: "none",
              background: chosenEmoji === emoji
                ? "linear-gradient(135deg, rgba(255,107,157,0.15), rgba(102,126,234,0.15))"
                : "#f8f9fa",
              outline: chosenEmoji === emoji ? "2px solid #ff6b9d" : "2px solid transparent",
              fontSize: 22, cursor: "pointer",
              transform: chosenEmoji === emoji ? "scale(1.1)" : "scale(1)",
              transition: "all 0.12s",
            }}
          >
            {emoji}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button
          onClick={() => setStep(2)}
          disabled={!chosenEmoji}
          style={chosenEmoji ? primaryBtn : primaryBtnDisabled}
        >
          Save & Continue →
        </button>
        <button onClick={() => setStep(2)} style={ghostBtn}>
          Skip for now
        </button>
      </div>
    </div>,

    // Step 2 — Join a challenge
    <div key="join" style={{ textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>⚡</div>
      <p style={stepLabel}>Step 2 of 2</p>
      <h2 style={{ ...stepTitle, marginBottom: 8 }}>Find a Challenge</h2>
      <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.6, margin: "0 0 24px" }}>
        Got a code from your crew? Enter it to join their challenge.
        Or browse what's open to everyone.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <button onClick={() => handleGoToChallenges()} disabled={saving} style={primaryBtn}>
          Browse Challenges
        </button>
        <button onClick={() => handleJoinCode()} disabled={saving} style={ghostBtn}>
          Enter a Join Code
        </button>
        <button onClick={() => finish()} disabled={saving} style={textBtn}>
          I'll do this later
        </button>
      </div>
    </div>,
  ];

  return (
    <>
      <style>{`
        @keyframes qaf-backdrop-in { from { opacity:0 } to { opacity:1 } }
        @keyframes qaf-card-in {
          from { opacity:0; transform: translateY(24px) scale(0.97) }
          to   { opacity:1; transform: translateY(0)    scale(1)    }
        }
      `}</style>

      <div style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px 16px",
        animation: "qaf-backdrop-in 0.2s ease",
      }}>
        <div style={{
          width: "100%", maxWidth: 440,
          background: "white",
          borderRadius: 28,
          padding: "32px 28px",
          boxShadow: "0 32px 80px rgba(0,0,0,0.18)",
          animation: "qaf-card-in 0.3s cubic-bezier(0.34,1.56,0.64,1)",
          fontFamily: "var(--font-inter), system-ui, sans-serif",
          maxHeight: "calc(100dvh - 48px)",
          overflowY: "auto",
        }}>
          {/* Progress dots */}
          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 28 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{
                height: 6, borderRadius: 100,
                width: i === step ? 24 : 6,
                background: i <= step
                  ? "linear-gradient(135deg, #ff6b9d, #667eea)"
                  : "#e5e7eb",
                transition: "all 0.3s ease",
              }} />
            ))}
          </div>

          {steps[step]}
        </div>
      </div>
    </>
  );
}

// ── Shared button styles ──────────────────────────────────────────────────────

const primaryBtn: React.CSSProperties = {
  width: "100%", padding: "15px 20px", borderRadius: 14, border: "none",
  background: "linear-gradient(135deg, #ff6b9d, #ff9f43, #ffdd59, #48cfad, #667eea)",
  color: "#0f172a", fontSize: 14, fontWeight: 800, cursor: "pointer",
};

const primaryBtnDisabled: React.CSSProperties = {
  ...primaryBtn,
  background: "#f1f5f9",
  color: "#94a3b8",
  cursor: "not-allowed",
};

const ghostBtn: React.CSSProperties = {
  width: "100%", padding: "14px 20px", borderRadius: 14,
  border: "1.5px solid #e5e7eb", background: "white",
  color: "#475569", fontSize: 14, fontWeight: 700, cursor: "pointer",
};

const textBtn: React.CSSProperties = {
  width: "100%", padding: "10px", borderRadius: 14,
  border: "none", background: "transparent",
  color: "#94a3b8", fontSize: 13, fontWeight: 600, cursor: "pointer",
};

const stepLabel: React.CSSProperties = {
  fontSize: 11, fontWeight: 800, letterSpacing: "0.15em",
  textTransform: "uppercase", color: "#94a3b8", margin: "0 0 4px",
};

const stepTitle: React.CSSProperties = {
  fontSize: 26, fontWeight: 900, color: "#0f172a",
  margin: "0 0 4px", letterSpacing: -0.3,
};

const stepSub: React.CSSProperties = {
  fontSize: 13, color: "#94a3b8", fontWeight: 500, margin: 0,
};
