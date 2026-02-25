"use client";
import { useRouter } from "next/navigation";

interface MemberGateProps {
  isMember: boolean;
  isLoggedIn: boolean;
  challengeId: string;
  children: React.ReactNode;
  /** What to show instead — defaults to a join prompt card */
  fallback?: React.ReactNode;
}

export default function MemberGate({
  isMember,
  isLoggedIn,
  challengeId,
  children,
  fallback,
}: MemberGateProps) {
  const router = useRouter();

  if (isMember) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  // Default locked state
  return (
    <div style={{
      borderRadius: 20,
      overflow: "hidden",
      border: "1.5px solid rgba(0,0,0,0.06)",
      background: "white",
      boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
    }}>
      {/* Rainbow top bar */}
      <div style={{
        height: 4,
        background: "linear-gradient(90deg,#ff6b9d,#ff9f43,#ffdd59,#48cfad,#4fc3f7,#667eea)",
      }} />

      {/* Locked content */}
      <div style={{
        padding: "28px 20px",
        textAlign: "center",
        fontFamily: "'DM Sans', sans-serif",
      }}>
        {/* Blurred preview */}
        <div style={{
          position: "relative",
          marginBottom: 20,
          borderRadius: 14,
          overflow: "hidden",
        }}>
          {/* Fake blurred chat messages */}
          <div style={{ filter: "blur(4px)", pointerEvents: "none", userSelect: "none" }}>
            {[
              { name: "Alex", msg: "Just hit 50 reps 🔥🔥" },
              { name: "Jordan", msg: "Let's gooo!! 💪" },
              { name: "Sam", msg: "Week 3 is no joke lol" },
            ].map((item, i) => (
              <div key={i} style={{
                display: "flex",
                gap: 10,
                padding: "10px 12px",
                borderBottom: i < 2 ? "1px solid #f1f5f9" : "none",
                textAlign: "left",
              }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: ["linear-gradient(135deg,#ff6b9d,#ff9f43)", "linear-gradient(135deg,#48cfad,#667eea)", "linear-gradient(135deg,#a855f7,#ff6b9d)"][i],
                  flexShrink: 0,
                }} />
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#1a1a1a", margin: "0 0 2px" }}>{item.name}</p>
                  <p style={{ fontSize: 13, color: "#555", margin: 0 }}>{item.msg}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Lock overlay */}
          <div style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255,255,255,0.7)",
            backdropFilter: "blur(2px)",
            gap: 6,
          }}>
            <span style={{ fontSize: 28 }}>🔒</span>
            <p style={{ fontSize: 12, fontWeight: 800, color: "#1a1a1a", margin: 0 }}>
              Members Only
            </p>
          </div>
        </div>

        <p style={{ fontSize: 14, color: "#555", margin: "0 0 16px", lineHeight: 1.5 }}>
          Join this challenge to see the live chat and connect with your crew.
        </p>

        <div style={{ display: "flex", gap: 10 }}>
          {!isLoggedIn ? (
            <button
              onClick={() => router.push("/auth")}
              style={{
                flex: 1,
                padding: "13px",
                borderRadius: 14,
                border: "none",
                background: "linear-gradient(90deg,#ff6b9d,#ff9f43,#ffdd59,#48cfad,#667eea)",
                color: "#1a1a1a",
                fontSize: 14,
                fontWeight: 800,
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Log in to Join
            </button>
          ) : (
            <button
              onClick={() => router.push(`/embed/challenges`)}
              style={{
                flex: 1,
                padding: "13px",
                borderRadius: 14,
                border: "none",
                background: "linear-gradient(90deg,#ff6b9d,#ff9f43,#ffdd59,#48cfad,#667eea)",
                color: "#1a1a1a",
                fontSize: 14,
                fontWeight: 800,
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Join Challenge
            </button>
          )}
        </div>
      </div>
    </div>
  );
}