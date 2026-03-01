"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import EmojiAvatarPicker from "@/components/EmojiAvatarPicker";

const ONBOARDING_KEY = "qaf_onboarded";

interface OnboardingModalProps {
  userId: string;
  userName: string;
}

export default function OnboardingModal({ userId, userName }: OnboardingModalProps) {
  const router = useRouter();
  const [visible, setVisible]     = useState(false);
  const [step, setStep]           = useState(0); // 0 = welcome, 1 = emoji, 2 = join
  const [chosenEmoji, setChosenEmoji] = useState("");
  const [closing, setClosing]     = useState(false);

  useEffect(() => {
    // Only show if they haven't been onboarded yet
    const done = localStorage.getItem(ONBOARDING_KEY);
    if (!done) setVisible(true);
  }, []);

  const finish = () => {
    setClosing(true);
    localStorage.setItem(ONBOARDING_KEY, "1");
    setTimeout(() => setVisible(false), 300);
  };

  const handleGoToChallenges = () => {
    finish();
    router.push("/embed/challenges");
  };

  if (!visible) return null;

  const steps = [
    // Step 0 — Welcome
    <div key="welcome" style={{ textAlign: "center", padding: "8px 0" }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>🏳️‍🌈</div>
      <h2 style={{
        fontFamily: "var(--font-inter), system-ui, sans-serif" ,
        fontSize: 36,
        color: "#1a1a1a",
        lineHeight: 1.1,
        margin: "0 0 12px",
        letterSpacing: 0.5,
      }}>
        Welcome,<br />
        <span style={{
          background: "linear-gradient(90deg, #ff6b9d, #ff9f43, #ffdd59, #48cfad, #667eea)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}>
          {userName.split(" ")[0]}!
        </span>
      </h2>
      <p style={{ color: "#555", fontSize: 15, lineHeight: 1.6, margin: "0 0 28px" }}>
        You're joining the Queers & Allies Fitness community in Sacramento.
        Streak-based challenges, team competition, and a crew that keeps you accountable.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <button onClick={() => setStep(1)} style={primaryBtnStyle}>
          Let's go →
        </button>
      </div>
    </div>,

    // Step 1 — Pick emoji
    <div key="emoji" style={{ padding: "8px 0" }}>
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", color: "#8E8E93", margin: "0 0 4px" }}>
          Step 1 of 2
        </p>
        <h2 style={{
          fontFamily: "var(--font-inter), system-ui, sans-serif" ,
          fontSize: 28,
          color: "#1a1a1a",
          margin: 0,
          letterSpacing: 0.5,
        }}>
          Pick Your Avatar
        </h2>
        <p style={{ color: "#8E8E93", fontSize: 13, margin: "4px 0 0", fontWeight: 500 }}>
          Shows on the leaderboard & activity feed
        </p>
      </div>
      <EmojiAvatarPicker
        userId={userId}
        currentEmoji={chosenEmoji}
        onSave={(e) => setChosenEmoji(e)}
      />
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button onClick={() => setStep(2)} style={ghostBtnStyle}>
          Skip
        </button>
        <button
          onClick={() => chosenEmoji ? setStep(2) : setStep(2)}
          style={primaryBtnStyle}
        >
          {chosenEmoji ? "Next →" : "Skip for now →"}
        </button>
      </div>
    </div>,

    // Step 2 — Join or create
    <div key="join" style={{ textAlign: "center", padding: "8px 0" }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>⚡</div>
      <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", color: "#8E8E93", margin: "0 0 8px" }}>
        Step 2 of 2
      </p>
      <h2 style={{
        fontFamily: "var(--font-inter), system-ui, sans-serif" ,
        fontSize: 28,
        color: "#1a1a1a",
        margin: "0 0 10px",
        letterSpacing: 0.5,
      }}>
        Join a Challenge
      </h2>
      <p style={{ color: "#555", fontSize: 14, lineHeight: 1.6, margin: "0 0 24px" }}>
        Got a code? Enter it to join your crew's challenge. Or browse what's public and dive in.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <button onClick={handleGoToChallenges} style={primaryBtnStyle}>
          Browse Challenges
        </button>
        <button
          onClick={() => { finish(); router.push("/embed/join"); }}
          style={ghostBtnStyle}
        >
          Enter a Join Code
        </button>
        <button onClick={finish} style={textBtnStyle}>
          I'll do this later
        </button>
      </div>
    </div>,
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(40px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes backdropIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .onboarding-backdrop {
          position: fixed; inset: 0; z-index: 100;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(6px);
          display: flex; align-items: flex-end; justify-content: center;
          animation: backdropIn 0.25s ease;
          font-family: var(--font-inter), system-ui, sans-serif;
        }
        .onboarding-sheet {
          width: 100%; max-width: 480px;
          background: white;
          border-radius: 28px 28px 0 0;
          padding: 28px 24px;
          padding-bottom: max(28px, env(safe-area-inset-bottom));
          animation: modalIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          max-height: 90vh;
          overflow-y: auto;
        }
        .onboarding-sheet.closing {
          animation: none;
          opacity: 0;
          transform: translateY(40px);
          transition: all 0.25s ease;
        }
      `}</style>

      {/* Backdrop */}
      <div className="onboarding-backdrop" onClick={(e) => {
        if (e.target === e.currentTarget && step === 2) finish();
      }}>
        <div className={`onboarding-sheet ${closing ? "closing" : ""}`}>
          {/* Progress dots */}
          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 24 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{
                width: i === step ? 20 : 6,
                height: 6,
                borderRadius: 100,
                background: i === step
                  ? "linear-gradient(90deg, #ff6b9d, #667eea)"
                  : "#e5e7eb",
                transition: "all 0.3s ease",
              }} />
            ))}
          </div>

          {/* Step content */}
          {steps[step]}
        </div>
      </div>
    </>
  );
}

// Shared button styles
const primaryBtnStyle: React.CSSProperties = {
  flex: 1,
  width: "100%",
  padding: "15px 20px",
  borderRadius: 14,
  border: "none",
  background: "linear-gradient(90deg, #ff6b9d, #ff9f43, #ffdd59, #48cfad, #667eea)",
  color: "#1a1a1a",
  fontSize: 14,
  fontWeight: 800,
  cursor: "pointer",
  fontFamily: "var(--font-inter), system-ui, sans-serif",
};

const ghostBtnStyle: React.CSSProperties = {
  flex: 1,
  width: "100%",
  padding: "14px 20px",
  borderRadius: 14,
  border: "1.5px solid #e5e7eb",
  background: "white",
  color: "#555",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "var(--font-inter), system-ui, sans-serif",
};

const textBtnStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px",
  borderRadius: 14,
  border: "none",
  background: "transparent",
  color: "#aaa",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "var(--font-inter), system-ui, sans-serif",
};