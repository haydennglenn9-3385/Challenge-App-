"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

// Curated emoji sets by category
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

interface EmojiAvatarPickerProps {
  currentEmoji?: string;
  userId: string;
  onSave?: (emoji: string) => void;
  compact?: boolean; // true = inline, false = full picker sheet
}

export default function EmojiAvatarPicker({
  currentEmoji,
  userId,
  onSave,
  compact = false,
}: EmojiAvatarPickerProps) {
  const [selected, setSelected]   = useState(currentEmoji || "");
  const [activeTab, setActiveTab] = useState(0);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);

  const handleSave = async (emoji: string) => {
    setSaving(true);
    const { error } = await supabase
      .from("users")
      .update({ emoji_avatar: emoji })
      .eq("id", userId);

    if (!error) {
      setSaved(true);
      onSave?.(emoji);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  };

  const handlePick = (emoji: string) => {
    setSelected(emoji);
    if (compact) handleSave(emoji); // auto-save on tap in compact mode
  };

  return (
    <div style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}>
      {/* Preview */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        marginBottom: 20,
      }}>
        <div style={{
          width: compact ? 52 : 72,
          height: compact ? 52 : 72,
          borderRadius: "50%",
          background: selected
            ? "linear-gradient(135deg, rgba(255,107,157,0.15), rgba(102,126,234,0.15))"
            : "#f1f5f9",
          border: selected ? "2.5px solid rgba(255,107,157,0.4)" : "2px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: compact ? 26 : 36,
          flexShrink: 0,
          transition: "all 0.2s",
        }}>
          {selected || "?"}
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 800, color: "#1a1a1a", margin: 0 }}>
            {selected ? "Looking good!" : "Pick your avatar"}
          </p>
          <p style={{ fontSize: 12, color: "#8E8E93", margin: "2px 0 0", fontWeight: 500 }}>
            {selected ? "Tap any emoji to change" : "This shows on the leaderboard & activity feed"}
          </p>
        </div>
      </div>

      {/* Category tabs */}
      <div style={{
        display: "flex",
        gap: 6,
        marginBottom: 14,
        overflowX: "auto",
        paddingBottom: 2,
        scrollbarWidth: "none",
      }}>
        {EMOJI_CATEGORIES.map((cat, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(i)}
            style={{
              padding: "6px 12px",
              borderRadius: 100,
              border: "none",
              fontSize: 11,
              fontWeight: 800,
              whiteSpace: "nowrap",
              cursor: "pointer",
              transition: "all 0.15s",
              background: activeTab === i
                ? "linear-gradient(90deg, #ff6b9d, #667eea)"
                : "#f1f5f9",
              color: activeTab === i ? "white" : "#555",
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Emoji grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(6, 1fr)",
        gap: 8,
        marginBottom: compact ? 0 : 20,
      }}>
        {EMOJI_CATEGORIES[activeTab].emojis.map((emoji) => (
          <button
            key={emoji}
            onClick={() => handlePick(emoji)}
            style={{
              width: "100%",
              aspectRatio: "1",
              borderRadius: 14,
              border: selected === emoji
                ? "2px solid #ff6b9d"
                : "2px solid transparent",
              background: selected === emoji
                ? "linear-gradient(135deg, rgba(255,107,157,0.12), rgba(102,126,234,0.12))"
                : "#f8f9fa",
              fontSize: 24,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s",
              transform: selected === emoji ? "scale(1.1)" : "scale(1)",
            }}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Save button — only shown in non-compact mode */}
      {!compact && (
        <button
          onClick={() => selected && handleSave(selected)}
          disabled={saving || !selected}
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: 14,
            border: "none",
            background: saved
              ? "linear-gradient(90deg, #48cfad, #06d6a0)"
              : selected
                ? "linear-gradient(90deg, #ff6b9d, #ff9f43, #ffdd59, #48cfad, #667eea)"
                : "#f1f5f9",
            color: selected ? "#1a1a1a" : "#aaa",
            fontSize: 14,
            fontWeight: 800,
            cursor: selected ? "pointer" : "not-allowed",
            transition: "all 0.2s",
          }}
        >
          {saved ? "✓ Avatar Saved!" : saving ? "Saving..." : "Save Avatar"}
        </button>
      )}
    </div>
  );
}