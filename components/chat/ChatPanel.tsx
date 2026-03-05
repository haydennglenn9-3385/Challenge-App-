"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type ChatContext =
  | { type: "challenge"; id: string }
  | { type: "dm"; id: string }
  | { type: "team"; id: string };

interface Message {
  id: string;
  author_id: string;
  text: string;
  created_at: string;
  edited_at: string | null;
  reactions: Record<string, string[]>;
  author_name: string;
  author_avatar: string | null;
}

interface Props {
  context: ChatContext;
  currentUserId: string;
  currentUserName: string;
  title?: string;
  onBack?: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EMOJI_OPTIONS = [
  "🌈", "👏", "❤️", "😂", "😍", "🙌",
  "💯", "😆", "💀", "👎", "🫶", "😄",
  "✨", "👀", "🔥", "🎉",
];

const SELECT_FIELDS =
  "id, author_id, text, created_at, edited_at, reactions, users!messages_author_id_fkey(name, avatar_url)";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  // Supabase returns timestamps without timezone — append Z to parse as UTC
  const normalized = iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z";
  return new Date(normalized).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateSeparator(iso: string): string {
  const normalized = iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z";
  const date = new Date(normalized);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function needsDateSeparator(msgs: Message[], i: number): boolean {
  if (i === 0) return true;
  return (
    new Date(msgs[i].created_at).toDateString() !==
    new Date(msgs[i - 1].created_at).toDateString()
  );
}

function isNewGroup(msgs: Message[], i: number): boolean {
  if (i === 0) return true;
  if (needsDateSeparator(msgs, i)) return true;
  return msgs[i].author_id !== msgs[i - 1].author_id;
}

function isLastInGroup(msgs: Message[], i: number): boolean {
  if (i === msgs.length - 1) return true;
  if (needsDateSeparator(msgs, i + 1)) return true;
  return msgs[i + 1].author_id !== msgs[i].author_id;
}

function normalize(row: any): Message {
  return {
    id: row.id,
    author_id: row.author_id,
    text: row.text,
    created_at: row.created_at,
    edited_at: row.edited_at ?? null,
    reactions: row.reactions ?? {},
    author_name: (row.users as any)?.name ?? "Member",
    author_avatar: (row.users as any)?.avatar_url ?? null,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        style={{
          width: 28, height: 28, borderRadius: "50%",
          objectFit: "cover", flexShrink: 0,
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "linear-gradient(135deg, #a78bfa, #818cf8)",
        color: "#fff", fontSize: 11, fontWeight: 700,
      }}
    >
      {(name ?? "?").charAt(0).toUpperCase()}
    </div>
  );
}

interface PickerAnchor {
  msgId: string;
  top: number;
  left: number;
  alignRight: boolean;
}

function EmojiPickerPortal({
  anchor,
  onSelect,
  onClose,
}: {
  anchor: PickerAnchor;
  onSelect: (emoji: string) => void;
  onClose: () => void;
}) {
  const PICKER_WIDTH = 208;
  const PICKER_HEIGHT = 148;

  // Clamp horizontally so picker never goes off screen
  const vw = typeof window !== "undefined" ? window.innerWidth : 400;
  let left = anchor.alignRight
    ? anchor.left - PICKER_WIDTH + 60   // align right edge near bubble right
    : anchor.left;                       // align left edge near bubble left
  left = Math.max(8, Math.min(left, vw - PICKER_WIDTH - 8));

  // Open above bubble; if not enough room, open below
  const top = anchor.top - PICKER_HEIGHT - 8 > 60
    ? anchor.top - PICKER_HEIGHT - 8
    : anchor.top + 48;

  return createPortal(
    <>
      {/* Invisible backdrop to close on outside tap */}
      <div
        style={{ position: "fixed", inset: 0, zIndex: 998 }}
        onMouseDown={onClose}
        onTouchEnd={onClose}
      />
      <div
        style={{
          position: "fixed",
          top,
          left,
          width: PICKER_WIDTH,
          zIndex: 999,
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
          border: "1px solid rgba(0,0,0,0.06)",
          padding: 8,
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4 }}>
          {EMOJI_OPTIONS.map((e) => (
            <button
              key={e}
              onMouseDown={(ev) => { ev.preventDefault(); onSelect(e); }}
              onTouchEnd={(ev) => { ev.preventDefault(); onSelect(e); }}
              style={{
                fontSize: 22, padding: 6, borderRadius: 10,
                background: "none", border: "none", cursor: "pointer", lineHeight: 1,
              }}
            >
              {e}
            </button>
          ))}
        </div>
      </div>
    </>,
    document.body
  );
}

function ReactionBar({
  reactions,
  currentUserId,
  onToggle,
}: {
  reactions: Record<string, string[]>;
  currentUserId: string;
  onToggle: (emoji: string) => void;
}) {
  const entries = Object.entries(reactions).filter(([, u]) => u.length > 0);
  if (!entries.length) return null;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
      {entries.map(([emoji, users]) => {
        const mine = users.includes(currentUserId);
        return (
          <button
            key={emoji}
            onMouseDown={(e) => { e.preventDefault(); onToggle(emoji); }}
            onTouchEnd={(e) => { e.preventDefault(); onToggle(emoji); }}
            style={{
              display: "flex", alignItems: "center", gap: 2,
              fontSize: 12, padding: "2px 8px", borderRadius: 99,
              border: mine ? "1.5px solid #7c3aed" : "1.5px solid #e5e7eb",
              background: mine ? "rgba(124,58,237,0.08)" : "#fff",
              color: mine ? "#7c3aed" : "#6b7280",
              cursor: "pointer",
            }}
          >
            <span>{emoji}</span>
            {users.length > 1 && (
              <span style={{ fontWeight: 600 }}>{users.length}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── ChatPanel ────────────────────────────────────────────────────────────────

export default function ChatPanel({
  context,
  currentUserId,
  currentUserName,
  title,
  onBack,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [emojiTargetId, setEmojiTargetId] = useState<string | null>(null);
  const [pickerAnchor, setPickerAnchor] = useState<PickerAnchor | null>(null);
  const [sending, setSending] = useState(false);
  // Debug: log currentUserId to verify it matches author_id
  // console.log("[ChatPanel] currentUserId:", currentUserId);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Query builders ────────────────────────────────────────────────────────

  function buildSelectQuery() {
    let q = supabase
      .from("messages")
      .select(SELECT_FIELDS)
      .order("created_at", { ascending: true });

    if (context.type === "challenge") {
      q = (q as any).eq("challenge_id", context.id).is("is_dm", false);
    } else if (context.type === "team") {
      q = (q as any).eq("team_id", context.id).is("is_dm", false);
    } else {
      q = (q as any)
        .eq("is_dm", true)
        .or(
          `and(author_id.eq.${currentUserId},recipient_id.eq.${context.id}),` +
          `and(author_id.eq.${context.id},recipient_id.eq.${currentUserId})`
        );
    }
    return q;
  }

  function buildInsertPayload(text: string) {
    const base = { author_id: currentUserId, text, reactions: {} };
    if (context.type === "challenge")
      return { ...base, challenge_id: context.id, is_dm: false };
    if (context.type === "team")
      return { ...base, team_id: context.id, is_dm: false };
    return { ...base, is_dm: true, recipient_id: context.id };
  }

  function buildRealtimeFilter(): string {
    if (context.type === "challenge") return `challenge_id=eq.${context.id}`;
    if (context.type === "team") return `team_id=eq.${context.id}`;
    return `is_dm=eq.true`;
  }

  function isDMRelevant(row: any): boolean {
    if (context.type !== "dm") return true;
    return (
      (row.author_id === currentUserId && row.recipient_id === context.id) ||
      (row.author_id === context.id && row.recipient_id === currentUserId)
    );
  }

  // ── Scroll ────────────────────────────────────────────────────────────────

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior });
  }, []);

  // ── Load ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    async function load() {
      const { data, error } = await buildSelectQuery();
      if (!error && data) setMessages(data.map(normalize));
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context.type, context.id, currentUserId]);

  useEffect(() => {
    if (!loading) scrollToBottom("instant");
  }, [loading, scrollToBottom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  // ── Realtime ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const channel = supabase
      .channel(`chat-${context.type}-${context.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: buildRealtimeFilter() },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            if (!isDMRelevant(payload.new)) return;
            const { data } = await supabase
              .from("messages").select(SELECT_FIELDS).eq("id", payload.new.id).single();
            if (data) setMessages((prev) => {
              if (prev.some((m) => m.id === (data as any).id)) return prev;
              return [...prev, normalize(data)];
            });
          } else if (payload.eventType === "UPDATE") {
            if (!isDMRelevant(payload.new)) return;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === payload.new.id
                  ? { ...m, text: payload.new.text, edited_at: payload.new.edited_at, reactions: payload.new.reactions ?? {} }
                  : m
              )
            );
          } else if (payload.eventType === "DELETE") {
            setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context.type, context.id, currentUserId]);

  // ── Actions ───────────────────────────────────────────────────────────────

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");
    await supabase.from("messages").insert(buildInsertPayload(text));
    setSending(false);
    inputRef.current?.focus();
  }

  async function handleSaveEdit(id: string) {
    const trimmed = editText.trim();
    if (!trimmed) return;
    await supabase
      .from("messages")
      .update({ text: trimmed, edited_at: new Date().toISOString() })
      .eq("id", id);
    setEditingId(null);
    setEditText("");
  }

  async function handleDelete(id: string) {
    await supabase.from("messages").delete().eq("id", id);
  }

  async function handleReact(messageId: string, emoji: string) {
    const msg = messages.find((m) => m.id === messageId);
    if (!msg) return;
    const next = { ...(msg.reactions ?? {}) };
    const users = [...(next[emoji] ?? [])];
    if (users.includes(currentUserId)) {
      next[emoji] = users.filter((u) => u !== currentUserId);
      if (!next[emoji].length) delete next[emoji];
    } else {
      next[emoji] = [...users, currentUserId];
    }
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, reactions: next } : m))
    );
    await supabase.from("messages").update({ reactions: next }).eq("id", messageId);
    setEmojiTargetId(null);
    setPickerAnchor(null);
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    /*
     * CRITICAL: This outer div must be position:relative + display:flex + flexDirection:column
     * with an explicit height so the message list can scroll and the input stays pinned.
     * The parent in challenge_id/page.tsx wraps this with height:480 — that's enough.
     */
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        minHeight: 0,           // ← prevents flex children from overflowing
        overflow: "hidden",
        borderRadius: 16,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
      }}
      onClick={() => { setEmojiTargetId(null); setPickerAnchor(null); }}
    >
      {/* ── Header ── */}
      {title && (
        <div
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            padding: "10px 16px",
            borderBottom: "1px solid rgba(0,0,0,0.06)",
            background:
              "linear-gradient(135deg, #d9f99d 0%, #bbf7d0 25%, #a5f3fc 50%, #e9d5ff 75%, #fecdd3 100%)",
          }}
        >
          {onBack && (
            <button
              onClick={onBack}
              style={{
                position: "absolute",
                left: 12,
                fontSize: 13,
                fontWeight: 600,
                color: "#4f46e5",
                background: "none",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 2,
              }}
            >
              ← Back
            </button>
          )}
          <span style={{ fontSize: 13, fontWeight: 600, color: "#1f2937" }}>
            {title}
          </span>
        </div>
      )}

      {/* ── Message list — this is the ONLY scrollable region ── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          minHeight: 0,         // ← critical: allows flex child to shrink & scroll
          padding: "12px 16px",
          background: "#f9fafb",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
            <div
              style={{
                width: 20, height: 20, borderRadius: "50%",
                border: "2px solid #a78bfa",
                borderTopColor: "transparent",
                animation: "spin 0.7s linear infinite",
              }}
            />
          </div>
        ) : messages.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 8 }}>
            <span style={{ fontSize: 32 }}>💬</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#9ca3af" }}>No messages yet — say hi!</span>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => {
              const isOwn = msg.author_id === currentUserId;
              const showSep = needsDateSeparator(messages, i);
              const firstGroup = isNewGroup(messages, i);
              const lastGroup = isLastInGroup(messages, i);
              const isEditing = editingId === msg.id;

              const bubbleRadius = isOwn
                ? `18px 18px ${lastGroup ? "4px" : "18px"} 18px`
                : `18px 18px 18px ${lastGroup ? "4px" : "18px"}`;

              return (
                <div key={msg.id} style={{ marginBottom: 2 }}>
                  {/* Date separator */}
                  {showSep && (
                    <div style={{ display: "flex", justifyContent: "center", margin: "12px 0 8px" }}>
                      <span style={{
                        fontSize: 11, color: "#9ca3af", fontWeight: 500,
                        background: "rgba(209,213,219,0.6)", padding: "2px 12px", borderRadius: 99,
                      }}>
                        {formatDateSeparator(msg.created_at)}
                      </span>
                    </div>
                  )}

                  {/* Sender name — others, first in group */}
                  {!isOwn && firstGroup && (
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", marginLeft: 38, marginBottom: 2, marginTop: 6 }}>
                      {msg.author_name}
                    </div>
                  )}

                  {/* Row: reverse for own messages */}
                  <div style={{
                    display: "flex",
                    flexDirection: isOwn ? "row-reverse" : "row",
                    alignItems: "flex-end",
                    gap: 6,
                  }}>
                    {/* Avatar — others only, anchored to last in group */}
                    {!isOwn && (
                      <div style={{ flexShrink: 0, alignSelf: "flex-end", marginBottom: 2 }}>
                        {lastGroup
                          ? <Avatar name={msg.author_name} url={msg.author_avatar} />
                          : <div style={{ width: 28 }} />
                        }
                      </div>
                    )}

                    {/* Bubble column */}
                    <div style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: isOwn ? "flex-end" : "flex-start",
                      maxWidth: "72%",
                    }}>
                      {/* Edit mode */}
                      {isEditing ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 180 }}>
                          <input
                            autoFocus
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveEdit(msg.id);
                              if (e.key === "Escape") { setEditingId(null); setEditText(""); }
                            }}
                            style={{
                              flex: 1, fontSize: 14, padding: "8px 12px", borderRadius: 20,
                              border: "1.5px solid #7c3aed", outline: "none", background: "#fff",
                            }}
                          />
                          <button onClick={() => handleSaveEdit(msg.id)}
                            style={{ fontSize: 12, fontWeight: 700, color: "#7c3aed", background: "none", border: "none", cursor: "pointer" }}>
                            Save
                          </button>
                          <button onClick={() => { setEditingId(null); setEditText(""); }}
                            style={{ fontSize: 12, color: "#9ca3af", background: "none", border: "none", cursor: "pointer" }}>
                            ✕
                          </button>
                        </div>
                      ) : (
                        /* Bubble */
                        <div style={{ position: "relative" }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (emojiTargetId === msg.id) {
                                setEmojiTargetId(null);
                                setPickerAnchor(null);
                              } else {
                                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                setEmojiTargetId(msg.id);
                                setPickerAnchor({
                                  msgId: msg.id,
                                  top: rect.top,
                                  left: rect.left,
                                  alignRight: isOwn,
                                });
                              }
                              setEditingId(null);
                            }}
                            style={{
                              display: "block",
                              textAlign: "left",
                              background: "none",
                              border: "none",
                              padding: 0,
                              cursor: "pointer",
                            }}
                          >
                            <div style={{
                              padding: "9px 14px",
                              borderRadius: bubbleRadius,
                              fontSize: 14,
                              lineHeight: 1.45,
                              background: isOwn
                                ? "linear-gradient(135deg, #7c3aed, #6366f1)"
                                : "#ffffff",
                              color: isOwn ? "#ffffff" : "#111827",
                              boxShadow: isOwn ? "none" : "0 1px 2px rgba(0,0,0,0.08)",
                              wordBreak: "break-word",
                            }}>
                              {msg.text}
                            </div>
                          </button>
                        </div>
                      )}

                      {/* Reactions */}
                      {!isEditing && Object.keys(msg.reactions ?? {}).length > 0 && (
                        <ReactionBar
                          reactions={msg.reactions}
                          currentUserId={currentUserId}
                          onToggle={(emoji) => handleReact(msg.id, emoji)}
                        />
                      )}

                      {/* Timestamp + actions — last in group only */}
                      {lastGroup && !isEditing && (
                        <div style={{
                          display: "flex",
                          flexDirection: isOwn ? "row-reverse" : "row",
                          alignItems: "center",
                          gap: 8,
                          marginTop: 2,
                          paddingLeft: isOwn ? 0 : 2,
                          paddingRight: isOwn ? 2 : 0,
                        }}>
                          <span style={{ fontSize: 10, color: "#9ca3af" }}>
                            {formatTime(msg.created_at)}
                            {msg.edited_at && <span style={{ fontStyle: "italic", marginLeft: 4 }}>· edited</span>}
                          </span>
                          {isOwn && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingId(msg.id);
                                  setEditText(msg.text);
                                  setEmojiTargetId(null);
                                }}
                                style={{ fontSize: 10, fontWeight: 700, color: "#7c3aed", background: "none", border: "none", cursor: "pointer" }}
                              >
                                Edit
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(msg.id); }}
                                style={{ fontSize: 10, fontWeight: 700, color: "#f43f5e", background: "none", border: "none", cursor: "pointer" }}
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* ── Input bar — pinned to bottom ── */}
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          borderTop: "1px solid rgba(0,0,0,0.06)",
          background: "rgba(255,255,255,0.97)",
        }}
      >
        {/* Pill input */}
        <div style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          background: "#f1f5f9",
          borderRadius: 99,
          padding: "8px 16px",
        }}>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Message..."
            style={{
              flex: 1,
              fontSize: 14,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#111827",
            }}
          />
        </div>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          style={{
            width: 34,
            height: 34,
            flexShrink: 0,
            borderRadius: "50%",
            border: "none",
            cursor: input.trim() ? "pointer" : "default",
            background: input.trim()
              ? "linear-gradient(135deg, #7c3aed, #6366f1)"
              : "#e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: sending ? 0.5 : 1,
            transition: "opacity 0.15s, transform 0.1s",
          }}
        >
          <svg width="14" height="14" fill="white" viewBox="0 0 24 24">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>

      {/* Spin keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Emoji picker portal — renders outside overflow:hidden containers ── */}
      {pickerAnchor && (
        <EmojiPickerPortal
          anchor={pickerAnchor}
          onSelect={(emoji) => handleReact(pickerAnchor.msgId, emoji)}
          onClose={() => { setEmojiTargetId(null); setPickerAnchor(null); }}
        />
      )}
    </div>
  );
}