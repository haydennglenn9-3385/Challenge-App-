"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

const REACTIONS = [
  { emoji: "👎", label: "thumbs down" },
  { emoji: "🌈", label: "rainbow" },
  { emoji: "🔥", label: "fire" },
  { emoji: "💪", label: "flex" },
  { emoji: "🩷", label: "pink heart" },
  { emoji: "🥳", label: "celebrate" },
  { emoji: "🙌", label: "hands" },
];

interface ReactionCount {
  emoji: string;
  count: number;
  reacted: boolean; // did the current user react with this?
}

interface PostReactionsProps {
  postId: string;
  userId: string | null;
}

export default function PostReactions({ postId, userId }: PostReactionsProps) {
  const [counts, setCounts]         = useState<ReactionCount[]>([]);
  const [loading, setLoading]       = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    loadReactions();
    // Real-time subscription
    const sub = supabase
      .channel(`reactions_${postId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "post_reactions",
        filter: `post_id=eq.${postId}`,
      }, () => loadReactions())
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [postId, userId]);

  async function loadReactions() {
    const { data } = await supabase
      .from("post_reactions")
      .select("emoji, user_id")
      .eq("post_id", postId);

    if (!data) { setLoading(false); return; }

    const map: Record<string, { count: number; reacted: boolean }> = {};
    for (const row of data) {
      if (!map[row.emoji]) map[row.emoji] = { count: 0, reacted: false };
      map[row.emoji].count++;
      if (row.user_id === userId) map[row.emoji].reacted = true;
    }

    // Only show reactions that have at least 1 count
    const result: ReactionCount[] = Object.entries(map).map(([emoji, v]) => ({
      emoji,
      count: v.count,
      reacted: v.reacted,
    }));
    setCounts(result);
    setLoading(false);
  }

  async function handleReact(emoji: string) {
    if (!userId) return;
    setPickerOpen(false);

    // Find existing reaction
    const existing = counts.find(c => c.emoji === emoji);

    // Optimistic update
    setCounts(prev => {
      const has = prev.find(c => c.emoji === emoji);
      if (has) {
        if (has.reacted) {
          // Remove
          return prev
            .map(c => c.emoji === emoji ? { ...c, count: c.count - 1, reacted: false } : c)
            .filter(c => c.count > 0);
        } else {
          // Add to existing
          return prev.map(c => c.emoji === emoji ? { ...c, count: c.count + 1, reacted: true } : c);
        }
      } else {
        // New reaction
        return [...prev, { emoji, count: 1, reacted: true }];
      }
    });

    if (existing?.reacted) {
      // Toggle off
      await supabase
        .from("post_reactions")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", userId)
        .eq("emoji", emoji);
    } else {
      // Toggle on
      await supabase
        .from("post_reactions")
        .upsert({ post_id: postId, user_id: userId, emoji }, { onConflict: "post_id,user_id,emoji" });
    }
  }

  return (
    <div style={{ position: "relative" }}>
      {/* Existing reaction counts + add button */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginTop: 8 }}>
        {counts.map(({ emoji, count, reacted }) => (
          <button
            key={emoji}
            onClick={() => handleReact(emoji)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 10px",
              borderRadius: 100,
              border: reacted ? "1.5px solid rgba(255,107,157,0.5)" : "1.5px solid rgba(0,0,0,0.07)",
              background: reacted
                ? "linear-gradient(135deg, rgba(255,107,157,0.1), rgba(102,126,234,0.1))"
                : "rgba(0,0,0,0.03)",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 700,
              color: reacted ? "#ff6b9d" : "#555",
              transition: "all 0.15s",
              transform: "scale(1)",
            }}
            onMouseDown={e => (e.currentTarget.style.transform = "scale(0.92)")}
            onMouseUp={e => (e.currentTarget.style.transform = "scale(1)")}
          >
            <span style={{ fontSize: 15 }}>{emoji}</span>
            <span style={{ fontSize: 12 }}>{count}</span>
          </button>
        ))}

        {/* Add reaction button */}
        <button
          onClick={() => setPickerOpen(!pickerOpen)}
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            border: "1.5px dashed rgba(0,0,0,0.15)",
            background: "transparent",
            cursor: "pointer",
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#aaa",
            transition: "all 0.15s",
          }}
        >
          +
        </button>
      </div>

      {/* Emoji picker popover */}
      {pickerOpen && (
        <>
          {/* Backdrop to close */}
          <div
            style={{ position: "fixed", inset: 0, zIndex: 40 }}
            onClick={() => setPickerOpen(false)}
          />
          <div style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            left: 0,
            zIndex: 50,
            background: "white",
            borderRadius: 16,
            padding: 10,
            boxShadow: "0 8px 32px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.06)",
            display: "flex",
            gap: 4,
          }}>
            {REACTIONS.map(({ emoji, label }) => (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                title={label}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 20,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.1s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "#f5f5f5"; e.currentTarget.style.transform = "scale(1.2)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.transform = "scale(1)"; }}
              >
                {emoji}
              </button>
            ))}
            {/* Small arrow pointing down */}
            <div style={{
              position: "absolute",
              bottom: -6,
              left: 16,
              width: 12,
              height: 12,
              background: "white",
              transform: "rotate(45deg)",
              boxShadow: "2px 2px 4px rgba(0,0,0,0.06)",
            }} />
          </div>
        </>
      )}
    </div>
  );
}