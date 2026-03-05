"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";

type Reaction = {
  id: string;
  emoji: string;
  user_id: string;
  users: { name: string } | null;
};

type Message = {
  id: string;
  text: string;
  created_at: string;
  edited_at: string | null;
  author_id: string;
  users: { id: string; name: string } | null;
  reactions?: Reaction[];
};

type ChatContext =
  | { type: "challenge"; id: string }
  | { type: "team"; id: string }
  | { type: "dm"; userId: string };

interface Props {
  context: ChatContext;
  currentUserId: string;
  currentUserName: string;
  title?: string;
  onBack?: () => void;
}

const QUICK_EMOJIS = ["🔥", "💪", "🌈", "👏", "❤️", "😂", "🎉", "⚡"];

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg,#ff6b9d,#ff9f43)",
  "linear-gradient(135deg,#48cfad,#667eea)",
  "linear-gradient(135deg,#a855f7,#ff6b9d)",
  "linear-gradient(135deg,#ff9f43,#ffdd59)",
];

function avatarGradient(userId: string) {
  return AVATAR_GRADIENTS[userId.charCodeAt(0) % AVATAR_GRADIENTS.length];
}

export default function ChatPanel({
  context,
  currentUserId,
  currentUserName,
  title,
  onBack,
}: Props) {
  const [messages, setMessages]       = useState<Message[]>([]);
  const [text, setText]               = useState("");
  const [sending, setSending]         = useState(false);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [editText, setEditText]       = useState("");
  const [loading, setLoading]         = useState(true);
  const [pickerMsgId, setPickerMsgId] = useState<string | null>(null);
  const bottomRef                     = useRef<HTMLDivElement>(null);

  function getQueryParam() {
    if (context.type === "challenge") return `challengeId=${context.id}`;
    if (context.type === "team")      return `teamId=${context.id}`;
    return `dmUserId=${context.userId}`;
  }

  function getContextKey() {
    return context.type === "dm"
      ? (context as { type: "dm"; userId: string }).userId
      : (context as { type: "challenge" | "team"; id: string }).id;
  }

  const fetchMessages = useCallback(async () => {
    const res = await fetch(`/api/messages?${getQueryParam()}`);
    const data = await res.json();
    if (!Array.isArray(data)) return;

    if (data.length === 0) {
      setMessages([]);
      return;
    }

    const ids = data.map((m: Message) => m.id);
    const { data: reactions } = await supabase
      .from("reactions")
      .select("id, emoji, user_id, message_id, users(name)")
      .in("message_id", ids);

    const reactionsByMsg: Record<string, Reaction[]> = {};
    (reactions || []).forEach((r: any) => {
      if (!reactionsByMsg[r.message_id]) reactionsByMsg[r.message_id] = [];
      reactionsByMsg[r.message_id].push(r);
    });

    setMessages(
      data.map((m: Message) => ({
        ...m,
        reactions: reactionsByMsg[m.id] || [],
      }))
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context.type, getContextKey()]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      await fetchMessages();
      if (!cancelled) setLoading(false);
    }

    load();

    const contextKey = getContextKey();
    const filter =
      context.type === "challenge"
        ? `challenge_id=eq.${contextKey}`
        : context.type === "team"
        ? `team_id=eq.${contextKey}`
        : null;

    if (!filter) return;

    const channel = supabase
      .channel(`chat-${context.type}-${contextKey}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter },
        () => { if (!cancelled) fetchMessages(); }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reactions" },
        () => { if (!cancelled) fetchMessages(); }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context.type, getContextKey()]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);

    const body: Record<string, any> = { text: trimmed };
    if (context.type === "challenge")      body.challengeId = context.id;
    else if (context.type === "team")      body.teamId = context.id;
    else                                   body.dmUserId = (context as any).userId;

    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setText("");
    setSending(false);
    // Manual re-fetch as fallback when WebSocket is unavailable
    await fetchMessages();
  }

  async function handleEdit(id: string) {
    const trimmed = editText.trim();
    if (!trimmed) return;

    await fetch("/api/messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, text: trimmed }),
    });

    setEditingId(null);
    setEditText("");
    await fetchMessages();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/messages?id=${id}`, { method: "DELETE" });
    await fetchMessages();
  }

  async function handleReaction(messageId: string, emoji: string) {
    setPickerMsgId(null);
    await fetch("/api/reactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId, emoji }),
    });
    await fetchMessages();
  }

  function groupReactions(reactions: Reaction[] = []) {
    const grouped: Record<string, { count: number; reacted: boolean; names: string[] }> = {};
    reactions.forEach((r) => {
      if (!grouped[r.emoji]) grouped[r.emoji] = { count: 0, reacted: false, names: [] };
      grouped[r.emoji].count++;
      if (r.user_id === currentUserId) grouped[r.emoji].reacted = true;
      if (r.users?.name) grouped[r.emoji].names.push(r.users.name);
    });
    return grouped;
  }

  return (
    <div
      className="flex flex-col h-full"
      onClick={() => setPickerMsgId(null)}
    >
      {/* Header */}
      {(title || onBack) && (
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-white/80 backdrop-blur-sm flex-shrink-0">
          {onBack && (
            <button
              onClick={onBack}
              className="text-slate-400 hover:text-slate-700 transition-colors text-sm font-medium"
            >
              ← Back
            </button>
          )}
          {title && (
            <p className="font-bold text-slate-900 text-base truncate">{title}</p>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-20">
            <div className="text-4xl">🏳️‍🌈</div>
            <p className="text-sm font-bold tracking-widest uppercase text-purple-600">
              Loading…
            </p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 py-20 text-center">
            <p className="text-3xl">💬</p>
            <p className="font-bold text-slate-800">No messages yet</p>
            <p className="text-sm text-slate-500">Be the first to say something!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn     = msg.author_id === currentUserId;
            const name      = msg.users?.name || "Member";
            const isEditing = editingId === msg.id;
            const grouped   = groupReactions(msg.reactions);

            return (
              <div
                key={msg.id}
                className={`flex gap-3 items-start group ${isOwn ? "flex-row-reverse" : ""}`}
              >
                {/* Avatar */}
                <div
                  className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-xs text-white mt-1"
                  style={{ background: avatarGradient(msg.author_id) }}
                >
                  {name[0]?.toUpperCase()}
                </div>

                {/* Content */}
                <div className={`flex flex-col gap-1 max-w-[72%] ${isOwn ? "items-end" : "items-start"}`}>
                  <p className={`text-xs font-semibold text-slate-500 ${isOwn ? "text-right" : ""}`}>
                    {name}
                  </p>

                  {/* Bubble or edit input */}
                  {isEditing ? (
                    <div className="flex gap-2 items-center">
                      <input
                        autoFocus
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleEdit(msg.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="text-sm px-3 py-2 rounded-xl border border-slate-200 outline-none focus:border-purple-400 bg-white min-w-[160px]"
                      />
                      <button
                        onClick={() => handleEdit(msg.id)}
                        className="text-xs font-bold text-purple-600"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-xs text-slate-400"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <div
                        className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          isOwn
                            ? "text-white rounded-tr-sm"
                            : "bg-white border border-slate-100 text-slate-800 rounded-tl-sm shadow-sm"
                        }`}
                        style={
                          isOwn
                            ? { background: "linear-gradient(135deg,#667eea,#a855f7)" }
                            : {}
                        }
                      >
                        {msg.text}
                      </div>

                      {/* Emoji picker trigger */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPickerMsgId(pickerMsgId === msg.id ? null : msg.id);
                        }}
                        className={`absolute -bottom-2 ${isOwn ? "-left-2" : "-right-2"} opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-xs hover:scale-110`}
                      >
                        😊
                      </button>

                      {/* Emoji picker */}
                      {pickerMsgId === msg.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className={`absolute bottom-6 ${isOwn ? "right-0" : "left-0"} z-50 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 flex gap-1`}
                        >
                          {QUICK_EMOJIS.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => handleReaction(msg.id, emoji)}
                              className="w-8 h-8 rounded-xl hover:bg-slate-100 flex items-center justify-center text-base transition-colors"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Reactions row */}
                  {Object.keys(grouped).length > 0 && (
                    <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? "justify-end" : ""}`}>
                      {Object.entries(grouped).map(([emoji, { count, reacted, names }]) => (
                        <button
                          key={emoji}
                          onClick={() => handleReaction(msg.id, emoji)}
                          title={names.join(", ")}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border transition-all ${
                            reacted
                              ? "border-purple-300 bg-purple-50 text-purple-700"
                              : "border-slate-200 bg-white text-slate-600 hover:border-purple-200 hover:bg-purple-50"
                          }`}
                        >
                          <span>{emoji}</span>
                          <span>{count}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Timestamp + edit/delete */}
                  <div className={`flex items-center gap-2 ${isOwn ? "flex-row-reverse" : ""}`}>
                    <p className="text-[10px] text-slate-400">
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {msg.edited_at && " · edited"}
                    </p>
                    {isOwn && !isEditing && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                        <button
                          onClick={() => {
                            setEditingId(msg.id);
                            setEditText(msg.text);
                          }}
                          className="text-[10px] text-slate-400 hover:text-purple-500 font-medium transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(msg.id)}
                          className="text-[10px] text-slate-400 hover:text-red-400 font-medium transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-slate-100 bg-white flex-shrink-0">
        <div className="flex gap-2 items-center bg-slate-50 rounded-2xl px-4 py-2 border border-slate-200">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Message…"
            className="flex-1 bg-transparent text-sm outline-none text-slate-800 placeholder-slate-400"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
            style={
              text.trim() && !sending
                ? { background: "linear-gradient(135deg,#667eea,#a855f7)", color: "white" }
                : { background: "#e5e7eb", color: "#9ca3af" }
            }
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}