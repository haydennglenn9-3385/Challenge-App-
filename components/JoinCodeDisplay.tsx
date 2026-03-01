"use client";
import { useState } from "react";

interface JoinCodeDisplayProps {
  code: string;
  challengeName?: string;
}

export default function JoinCodeDisplay({ code, challengeName }: JoinCodeDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older mobile browsers
      const el = document.createElement("textarea");
      el.value = code;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    const text = challengeName
      ? `Join me in the "${challengeName}" fitness challenge! Use code: ${code} 🏳️‍🌈💪`
      : `Use code ${code} to join the challenge! 🏳️‍🌈💪`;

    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch { /* user cancelled */ }
    } else {
      handleCopy();
    }
  };

  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(255,107,157,0.06), rgba(102,126,234,0.06))",
      border: "1.5px solid rgba(255,107,157,0.2)",
      borderRadius: 16,
      padding: "14px 16px",
      display: "flex",
      alignItems: "center",
      gap: 12,
    }}>
      {/* Code display */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: "#8E8E93",
          margin: "0 0 2px",
        }}>
          Join Code
        </p>
        <p style={{
          fontSize: 22,
          fontWeight: 900,
          letterSpacing: "0.15em",
          color: "#1a1a1a",
          margin: 0,
          fontFamily: "monospace",
        }}>
          {code}
        </p>
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        {/* Copy */}
        <button
          onClick={handleCopy}
          style={{
            padding: "8px 14px",
            borderRadius: 10,
            border: "none",
            background: copied
              ? "linear-gradient(90deg, #48cfad, #06d6a0)"
              : "linear-gradient(90deg, #ff6b9d, #667eea)",
            color: "white",
            fontSize: 12,
            fontWeight: 800,
            cursor: "pointer",
            transition: "all 0.2s",
            display: "flex",
            alignItems: "center",
            gap: 5,
            fontFamily: "var(--font-inter), system-ui, sans-serif",
          }}
        >
          {copied ? "✓ Copied!" : "📋 Copy"}
        </button>

        {/* Share (shows on mobile with Web Share API, hides on desktop) */}
        <button
          onClick={handleShare}
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: "1.5px solid rgba(0,0,0,0.08)",
            background: "white",
            color: "#555",
            fontSize: 12,
            fontWeight: 800,
            cursor: "pointer",
            transition: "all 0.2s",
            fontFamily: "var(--font-inter), system-ui, sans-serif",
          }}
        >
          🔗 Share
        </button>
      </div>
    </div>
  );
}