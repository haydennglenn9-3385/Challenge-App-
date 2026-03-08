"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@/lib/UserContext";
import { supabase } from "@/lib/supabase/client";
import ChatPanel from "@/components/chat/ChatPanel";

type MsgTab = "community" | "groups" | "dms";

type Challenge = {
  id: string;
  name: string;
  member_count: number | null;
};

type DMConversation = {
  userId: string;
  name: string;
  lastMessage?: string;
  lastAt?: string;
};

// ─── Slow-load notice ─────────────────────────────────────────────────────────
// Appears after 6s if still loading. Non-alarming, gives user something to do.
function SlowLoadNotice({ onRetry }: { onRetry: () => void }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 6000);
    return () => clearTimeout(t);
  }, []);
  if (!show) return null;
  return (
    <p className="text-xs text-slate-400 text-center mt-3">
      Taking longer than usual…{" "}
      <button
        onClick={onRetry}
        className="underline text-purple-500 font-semibold"
      >
        tap to refresh
      </button>
    </p>
  );
}

export default function MessagesPage() {
  const nav          = useRouter();
  const searchParams = useSearchParams();
  const { user }     = useUser();

  const [tab, setTab]                         = useState<MsgTab>("community");
  const [challenges, setChallenges]           = useState<Challenge[]>([]);
  const [dmConversations, setDmConversations] = useState<DMConversation[]>([]);
  const [openChallenge, setOpenChallenge]     = useState<Challenge | null>(null);
  const [openDmUser, setOpenDmUser]           = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading]                 = useState(true);
  const [loadKey, setLoadKey]                 = useState(0); // increment to retry

  // Handle ?dm=userId deep-link from profile page
  useEffect(() => {
    const dmUserId = searchParams.get("dm");
    if (!dmUserId || !user) return;
    async function openDmFromParam() {
      const { data } = await supabase
        .from("users").select("id, name").eq("id", dmUserId).single();
      if (data) {
        setTab("dms");
        setOpenDmUser({ id: data.id, name: data.name });
      }
    }
    openDmFromParam();
  }, [searchParams, user]);

  useEffect(() => {
    async function load() {
      setLoading(true);

      // ── Parallel: challenge memberships (community tab now uses ChatPanel, no feed query needed)
      const [joinedResult] = await Promise.all([
        user
          ? supabase
              .from("challenge_members")
              .select("challenge_id, challenges(id, name, member_count)")
              .eq("user_id", user.id)
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (joinedResult.data) {
        setChallenges(
          (joinedResult.data as any[]).map((j) => j.challenges).filter(Boolean)
        );
      }

      // ── DM conversations — parallel sent + received
      if (user) {
        const [sentResult, receivedResult] = await Promise.all([
          supabase
            .from("messages")
            .select("recipient_id, text, created_at, users!messages_recipient_id_fkey(id, name)")
            .eq("author_id", user.id)
            .eq("is_dm", true)
            .order("created_at", { ascending: false }),

          supabase
            .from("messages")
            .select("author_id, text, created_at, users!messages_author_id_fkey(id, name)")
            .eq("recipient_id", user.id)
            .eq("is_dm", true)
            .order("created_at", { ascending: false }),
        ]);

        const convMap: Record<string, DMConversation> = {};

        (sentResult.data || []).forEach((m: any) => {
          const otherId   = m.recipient_id;
          const otherName = m.users?.name || "Member";
          if (!convMap[otherId] || new Date(m.created_at) > new Date(convMap[otherId].lastAt!)) {
            convMap[otherId] = { userId: otherId, name: otherName, lastMessage: m.text, lastAt: m.created_at };
          }
        });

        (receivedResult.data || []).forEach((m: any) => {
          const otherId   = m.author_id;
          const otherName = m.users?.name || "Member";
          if (!convMap[otherId] || new Date(m.created_at) > new Date(convMap[otherId].lastAt!)) {
            convMap[otherId] = { userId: otherId, name: otherName, lastMessage: m.text, lastAt: m.created_at };
          }
        });

        setDmConversations(
          Object.values(convMap).sort((a, b) =>
            new Date(b.lastAt || 0).getTime() - new Date(a.lastAt || 0).getTime()
          )
        );
      }

      setLoading(false);
    }

    load();
  }, [user, loadKey]);

  const TABS: { id: MsgTab; label: string; icon: string }[] = [
    { id: "community", label: "Community", icon: "🌈" },
    { id: "groups",    label: "Groups",    icon: "⚡" },
    { id: "dms",       label: "DMs",       icon: "💬" },
  ];

  const isInChat = !!openChallenge || !!openDmUser;

  const AVATAR_GRADIENTS = [
    "linear-gradient(135deg,#ff6b9d,#ff9f43)",
    "linear-gradient(135deg,#48cfad,#667eea)",
    "linear-gradient(135deg,#a855f7,#ff6b9d)",
    "linear-gradient(135deg,#ff9f43,#ffdd59)",
  ];

  return (
    <div className="min-h-screen pt-6 pb-28 flex flex-col">

      {/* Header */}
      {!isInChat && (
        <div className="px-5 mb-4">
          <p
            className="text-xs font-bold tracking-[0.2em] uppercase mb-1"
            style={{
              background: "linear-gradient(90deg,#ff6b9d,#ff9f43,#ffdd59,#48cfad,#4fc3f7,#667eea)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Queers & Allies Fitness
          </p>
          <h1 className="text-3xl font-display font-extrabold text-slate-900 tracking-tight">
            Messages
          </h1>
        </div>
      )}

      {/* Tabs */}
      {!isInChat && (
        <div className="px-5 mb-4">
          <div className="flex p-1 rounded-full bg-white shadow-sm" style={{ border: "1px solid #E5E5EA" }}>
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 py-2 rounded-full text-[11px] font-bold transition-all flex items-center justify-center gap-1 min-w-0 ${
                  tab === t.id ? "rainbow-cta text-[#1a1a1a]" : "text-[#8E8E93]"
                }`}
              >
                <span className="flex-shrink-0">{t.icon}</span>
                <span className="truncate">{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── COMMUNITY TAB — now a full ChatPanel ─────────────────────────────── */}
      {!isInChat && tab === "community" && user && (
        <div style={{ position: "fixed", inset: "0 0 98px 0", display: "flex", flexDirection: "column" }}>
          {/* Replicate the page header inside the fixed container */}
          <div className="px-5 pt-6 pb-0 flex-shrink-0">
            <p
              className="text-xs font-bold tracking-[0.2em] uppercase mb-1"
              style={{
                background: "linear-gradient(90deg,#ff6b9d,#ff9f43,#ffdd59,#48cfad,#4fc3f7,#667eea)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Queers & Allies Fitness
            </p>
            <h1 className="text-3xl font-display font-extrabold text-slate-900 tracking-tight mb-3">
              Messages
            </h1>
            {/* Tabs */}
            <div className="flex p-1 rounded-full bg-white shadow-sm mb-3" style={{ border: "1px solid #E5E5EA" }}>
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex-1 py-2 rounded-full text-[11px] font-bold transition-all flex items-center justify-center gap-1 min-w-0 ${
                    t.id === "community" ? "rainbow-cta text-[#1a1a1a]" : "text-[#8E8E93]"
                  }`}
                >
                  <span className="flex-shrink-0">{t.icon}</span>
                  <span className="truncate">{t.label}</span>
                </button>
              ))}
            </div>
          </div>
          {/* ChatPanel fills remaining space */}
          <div className="flex-1 min-h-0 px-5 pb-3">
            <ChatPanel
              context={{ type: "community" }}
              currentUserId={user.id}
              currentUserName={user.name}
            />
          </div>
        </div>
      )}

      {/* Not logged in — community tab */}
      {!isInChat && tab === "community" && !user && (
        <div className="px-5">
          <div className="neon-card rounded-2xl p-10 text-center">
            <p className="text-2xl mb-2">🌈</p>
            <p className="font-bold text-slate-800">Log in to join the conversation</p>
            <button
              onClick={() => nav.push("/auth")}
              className="rainbow-cta rounded-xl px-6 py-3 font-bold text-sm mt-4"
            >
              Log In / Sign Up
            </button>
          </div>
        </div>
      )}

      {/* ── GROUPS TAB ────────────────────────────────────────────────────────── */}
      {!isInChat && tab === "groups" && (
        <div className="px-5 flex flex-col gap-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="text-5xl">🏳️‍🌈</div>
              <p className="text-sm font-bold tracking-widest uppercase text-purple-600">Loading...</p>
              <SlowLoadNotice onRetry={() => setLoadKey((k) => k + 1)} />
            </div>
          ) : challenges.length === 0 ? (
            <div className="neon-card rounded-2xl p-10 text-center">
              <p className="text-2xl mb-2">⚡</p>
              <p className="font-bold text-slate-800">No challenge chats yet</p>
              <p className="text-sm text-slate-500 mt-2 mb-4">Join a challenge to unlock its group chat</p>
              <button
                onClick={() => nav.push("/embed/challenges")}
                className="rainbow-cta rounded-xl px-6 py-3 font-bold text-sm"
              >
                Browse Challenges
              </button>
            </div>
          ) : (
            challenges.map((challenge) => (
              <button
                key={challenge.id}
                onClick={() => setOpenChallenge(challenge)}
                className="w-full neon-card rounded-2xl overflow-hidden text-left hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="h-1 w-full rainbow-cta" />
                <div className="px-5 py-4 flex items-center gap-4">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: "linear-gradient(135deg,#ff6b9d22,#667eea22)" }}
                  >
                    💬
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900">{challenge.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">
                      {challenge.member_count || 0} members
                    </p>
                  </div>
                  <span className="text-slate-400 text-sm">→</span>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* ── DMs TAB ───────────────────────────────────────────────────────────── */}
      {!isInChat && tab === "dms" && (
        <div className="px-5 flex flex-col gap-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="text-5xl">🏳️‍🌈</div>
              <p className="text-sm font-bold tracking-widest uppercase text-purple-600">Loading...</p>
              <SlowLoadNotice onRetry={() => setLoadKey((k) => k + 1)} />
            </div>
          ) : dmConversations.length === 0 ? (
            <div className="neon-card rounded-2xl p-10 text-center">
              <p className="text-2xl mb-2">💬</p>
              <p className="font-bold text-slate-800">No messages yet</p>
              <p className="text-sm text-slate-500 mt-2">
                Visit someone&apos;s profile and tap <strong>Message</strong> to start a conversation.
              </p>
              <button
                onClick={() => setTab("groups")}
                className="rainbow-cta rounded-xl px-5 py-3 font-bold text-sm mt-4"
              >
                Browse Group Chats
              </button>
            </div>
          ) : (
            dmConversations.map((conv, i) => (
              <button
                key={conv.userId}
                onClick={() => setOpenDmUser({ id: conv.userId, name: conv.name })}
                className="w-full neon-card rounded-2xl overflow-hidden text-left hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="px-5 py-4 flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white flex-shrink-0"
                    style={{ background: AVATAR_GRADIENTS[i % 4] }}
                  >
                    {conv.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900">{conv.name}</p>
                    {conv.lastMessage && (
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{conv.lastMessage}</p>
                    )}
                  </div>
                  {conv.lastAt && (
                    <p className="text-[10px] text-slate-400 flex-shrink-0">
                      {new Date(conv.lastAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* ── Challenge chat ─────────────────────────────────────────────────────── */}
      {openChallenge && user && (
        <div style={{ position: "fixed", inset: "0 0 98px 0", display: "flex", flexDirection: "column" }}>
          <ChatPanel
            context={{ type: "challenge", id: openChallenge.id }}
            currentUserId={user.id}
            currentUserName={user.name}
            title={openChallenge.name}
            onBack={() => setOpenChallenge(null)}
          />
        </div>
      )}

      {/* ── DM chat ───────────────────────────────────────────────────────────── */}
      {openDmUser && user && (
        <div style={{ position: "fixed", inset: "0 0 98px 0", display: "flex", flexDirection: "column" }}>
          <ChatPanel
            context={{ type: "dm", id: openDmUser.id }}
            currentUserId={user.id}
            currentUserName={user.name}
            title={openDmUser.name}
            onBack={() => {
              setOpenDmUser(null);
              nav.replace("/embed/messages?tab=dms");
            }}
          />
        </div>
      )}

    </div>
  );
}