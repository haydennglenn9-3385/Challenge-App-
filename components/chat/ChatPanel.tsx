"use client";

import { useEffect, useState, useRef, useCallback } from "react";
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
  reactions: Record<string, string[]>; // emoji → [user_id, ...]
  author_name: string;
  author_avatar: string | null;
}

interface Props {
  context: ChatContext;
  currentUserId: string;
  currentUserName: string;
  title?: string;
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
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateSeparator(iso: string): string {
  const date = new Date(iso);
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

function needsDateSeparator(messages: Message[], index: number): boolean {
  if (index === 0) return true;
  return (
    new Date(messages[index].created_at).toDateString() !==
    new Date(messages[index - 1].created_at).toDateString()
  );
}

function isNewGroup(messages: Message[], index: number): boolean {
  if (index === 0) return true;
  if (needsDateSeparator(messages, index)) return true;
  return messages[index].author_id !== messages[index - 1].author_id;
}

function isLastInGroup(messages: Message[], index: number): boolean {
  if (index === messages.length - 1) return true;
  if (needsDateSeparator(messages, index + 1)) return true;
  return messages[index + 1].author_id !== messages[index].author_id;
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

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="w-7 h-7 rounded-full object-cover flex-shrink-0"
      />
    );
  }
  return (
    <div
      className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
      style={{ background: "linear-gradient(135deg, #a78bfa, #818cf8)" }}
    >
      {(name ?? "?").charAt(0).toUpperCase()}
    </div>
  );
}

// ─── EmojiPicker ─────────────────────────────────────────────────────────────

function EmojiPicker({
  onSelect,
  align,
}: {
  onSelect: (emoji: string) => void;
  align: "left" | "right";
}) {
  return (
    <div
      className={`absolute z-50 bottom-full mb-1.5 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 ${
        align === "right" ? "right-0" : "left-0"
      }`}
      style={{ width: 200 }}
    >
      <div className="grid grid-cols-4 gap-1">
        {EMOJI_OPTIONS.map((e) => (
          <button
            key={e}
            onMouseDown={(ev) => {
              ev.preventDefault();
              onSelect(e);
            }}
            className="text-xl p-1.5 rounded-lg hover:bg-gray-50 active:scale-90 transition-transform"
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── ReactionBar ─────────────────────────────────────────────────────────────

function ReactionBar({
  reactions,
  currentUserId,
  onToggle,
}: {
  reactions: Record<string, string[]>;
  currentUserId: string;
  onToggle: (emoji: string) => void;
}) {
  const entries = Object.entries(reactions).filter(
    ([, users]) => users.length > 0
  );
  if (!entries.length) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {entries.map(([emoji, users]) => {
        const mine = users.includes(currentUserId);
        return (
          <button
            key={emoji}
            onMouseDown={(e) => {
              e.preventDefault();
              onToggle(emoji);
            }}
            className={`flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full border transition-all active:scale-95 ${
              mine
                ? "bg-violet-100 border-violet-300 text-violet-700"
                : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            <span>{emoji}</span>
            {users.length > 1 && (
              <span className="font-semibold ml-0.5">{users.length}</span>
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
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [emojiTargetId, setEmojiTargetId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

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
    } else if (context.type === "dm") {
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

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      bottomRef.current?.scrollIntoView({ behavior });
    },
    []
  );

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
    const channelName = `chat-${context.type}-${context.id}-${currentUserId}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: buildRealtimeFilter(),
        },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            if (!isDMRelevant(payload.new)) return;
            const { data } = await supabase
              .from("messages")
              .select(SELECT_FIELDS)
              .eq("id", payload.new.id)
              .single();
            if (data) {
              setMessages((prev) => {
                if (prev.some((m) => m.id === (data as any).id)) return prev;
                return [...prev, normalize(data)];
              });
            }
          } else if (payload.eventType === "UPDATE") {
            if (!isDMRelevant(payload.new)) return;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === payload.new.id
                  ? {
                      ...m,
                      text: payload.new.text,
                      edited_at: payload.new.edited_at,
                      reactions: payload.new.reactions ?? {},
                    }
                  : m
              )
            );
          } else if (payload.eventType === "DELETE") {
            setMessages((prev) =>
              prev.filter((m) => m.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context.type, context.id, currentUserId]);

  // ── Send ──────────────────────────────────────────────────────────────────

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");
    await supabase.from("messages").insert(buildInsertPayload(text));
    setSending(false);
    inputRef.current?.focus();
  }

  // ── Edit ──────────────────────────────────────────────────────────────────

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

  function startEdit(msg: Message) {
    setEditingId(msg.id);
    setEditText(msg.text);
    setEmojiTargetId(null);
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    await supabase.from("messages").delete().eq("id", id);
  }

  // ── React ─────────────────────────────────────────────────────────────────

  async function handleReact(messageId: string, emoji: string) {
    const msg = messages.find((m) => m.id === messageId);
    if (!msg) return;

    const next = { ...(msg.reactions ?? {}) };
    const users: string[] = [...(next[emoji] ?? [])];

    if (users.includes(currentUserId)) {
      next[emoji] = users.filter((u) => u !== currentUserId);
      if (next[emoji].length === 0) delete next[emoji];
    } else {
      next[emoji] = [...users, currentUserId];
    }

    // Optimistic
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, reactions: next } : m))
    );

    await supabase.from("messages").update({ reactions: next }).eq("id", messageId);
    setEmojiTargetId(null);
  }

  // ── Bubble tap opens emoji picker ─────────────────────────────────────────

  function handleBubbleTap(e: React.MouseEvent, msgId: string) {
    e.stopPropagation();
    setEmojiTargetId((prev) => (prev === msgId ? null : msgId));
    setEditingId(null);
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      className="flex flex-col h-full overflow-hidden rounded-2xl"
      style={{
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
      }}
      onClick={() => setEmojiTargetId(null)}
    >
      {/* ── Header ── */}
      {title && (
        <div
          className="flex-shrink-0 flex items-center justify-center px-4 py-3 border-b border-black/5"
          style={{
            background:
              "linear-gradient(135deg, #d9f99d 0%, #bbf7d0 25%, #a5f3fc 50%, #e9d5ff 75%, #fecdd3 100%)",
          }}
        >
          <p className="text-sm font-semibold text-gray-800 tracking-tight">
            {title}
          </p>
        </div>
      )}

      {/* ── Messages ── */}
      <div
        className="flex-1 overflow-y-auto px-4 py-3"
        style={{ background: "#f9fafb" }}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div
              className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: "#a78bfa #a78bfa #a78bfa transparent" }}
            />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <span className="text-3xl">💬</span>
            <p className="text-xs font-semibold text-gray-400">
              No messages yet — say hi!
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {messages.map((msg, i) => {
              const isOwn = msg.author_id === currentUserId;
              const showSeparator = needsDateSeparator(messages, i);
              const firstInGroup = isNewGroup(messages, i);
              const lastInGroup = isLastInGroup(messages, i);
              const isEditing = editingId === msg.id;
              const showEmojiPicker = emojiTargetId === msg.id;

              const bubbleRadius = isOwn
                ? `18px 18px ${lastInGroup ? "4px" : "18px"} 18px`
                : `18px 18px 18px ${lastInGroup ? "4px" : "18px"}`;

              return (
                <div key={msg.id}>
                  {/* Date separator */}
                  {showSeparator && (
                    <div className="flex justify-center my-3">
                      <span className="text-[11px] text-gray-400 font-medium bg-gray-200/70 px-3 py-0.5 rounded-full">
                        {formatDateSeparator(msg.created_at)}
                      </span>
                    </div>
                  )}

                  {/* Sender name (others, first in group only) */}
                  {!isOwn && firstInGroup && (
                    <p className="text-[11px] font-semibold text-gray-400 ml-10 mb-0.5 mt-1.5">
                      {msg.author_name}
                    </p>
                  )}

                  {/* Message row */}
                  <div
                    className={`flex items-end gap-1.5 ${
                      isOwn ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    {/* Avatar — others only, anchored to last bubble in group */}
                    {!isOwn && (
                      <div className="flex-shrink-0 self-end mb-0.5">
                        {lastInGroup ? (
                          <Avatar
                            name={msg.author_name}
                            url={msg.author_avatar}
                          />
                        ) : (
                          <div className="w-7" />
                        )}
                      </div>
                    )}

                    {/* Bubble column */}
                    <div
                      className={`flex flex-col max-w-[72%] ${
                        isOwn ? "items-end" : "items-start"
                      }`}
                    >
                      {/* Edit mode */}
                      {isEditing ? (
                        <div className="flex items-center gap-1.5 min-w-[180px]">
                          <input
                            autoFocus
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveEdit(msg.id);
                              if (e.key === "Escape") {
                                setEditingId(null);
                                setEditText("");
                              }
                            }}
                            className="flex-1 text-sm px-3 py-2 rounded-2xl border border-violet-300 bg-white outline-none focus:ring-2 focus:ring-violet-200"
                          />
                          <button
                            onClick={() => handleSaveEdit(msg.id)}
                            className="text-xs font-bold text-violet-600 active:opacity-60 whitespace-nowrap"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingId(null);
                              setEditText("");
                            }}
                            className="text-xs text-gray-400 active:opacity-60"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        /* Bubble */
                        <div className="relative">
                          <button
                            className="text-left block active:opacity-75 transition-opacity"
                            onClick={(e) => handleBubbleTap(e, msg.id)}
                          >
                            <div
                              className="px-3.5 py-2 text-sm leading-relaxed"
                              style={{
                                borderRadius: bubbleRadius,
                                background: isOwn
                                  ? "linear-gradient(135deg, #7c3aed, #6366f1)"
                                  : "#ffffff",
                                color: isOwn ? "#ffffff" : "#111827",
                                boxShadow: isOwn
                                  ? "none"
                                  : "0 1px 2px rgba(0,0,0,0.08)",
                              }}
                            >
                              {msg.text}
                            </div>
                          </button>

                          {/* Emoji picker popover */}
                          {showEmojiPicker && (
                            <div onClick={(e) => e.stopPropagation()}>
                              <EmojiPicker
                                onSelect={(emoji) =>
                                  handleReact(msg.id, emoji)
                                }
                                align={isOwn ? "right" : "left"}
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Reaction bar */}
                      {!isEditing &&
                        Object.keys(msg.reactions ?? {}).length > 0 && (
                          <ReactionBar
                            reactions={msg.reactions}
                            currentUserId={currentUserId}
                            onToggle={(emoji) => handleReact(msg.id, emoji)}
                          />
                        )}

                      {/* Timestamp + edit/delete */}
                      {lastInGroup && !isEditing && (
                        <div
                          className={`flex items-center gap-2 mt-0.5 px-0.5 ${
                            isOwn ? "flex-row-reverse" : "flex-row"
                          }`}
                        >
                          <span className="text-[10px] text-gray-400">
                            {formatTime(msg.created_at)}
                            {msg.edited_at && (
                              <span className="ml-1 italic">· edited</span>
                            )}
                          </span>
                          {isOwn && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEdit(msg);
                                }}
                                className="text-[10px] font-semibold text-violet-400 active:opacity-60"
                              >
                                Edit
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(msg.id);
                                }}
                                className="text-[10px] font-semibold text-rose-400 active:opacity-60"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* ── Input bar ── */}
      <div
        className="flex-shrink-0 flex items-center gap-2 px-3 py-2.5 border-t border-black/5"
        style={{
          background: "rgba(255,255,255,0.96)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
        }}
      >
        <div
          className="flex-1 flex items-center rounded-full px-4 py-2"
          style={{ background: "#f1f5f9" }}
        >
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
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none"
          />
        </div>

        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full transition-all active:scale-90 disabled:opacity-30"
          style={{
            background: input.trim()
              ? "linear-gradient(135deg, #7c3aed, #6366f1)"
              : "#e5e7eb",
          }}
        >
          <svg
            className="w-3.5 h-3.5 text-white"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}