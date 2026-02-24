"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getChallenges, Challenge } from "@/lib/storage";
import { useUser } from "@/lib/UserContext";
import { supabase } from "@/lib/supabase/client";

type MsgTab = "community" | "groups" | "dms";

export default function MessagesPage() {
  const router = useRouter();
  const { user, getUserParams } = useUser();
  const [challenges, setChallenges]   = useState<Challenge[]>([]);
  const [postText, setPostText]       = useState("");
  const [posting, setPosting]         = useState(false);
  const [loading, setLoading]         = useState(true);
  const [tab, setTab]                 = useState<MsgTab>("community");
  const [feed, setFeed]               = useState<any[]>([]);

  const navigate = (path: string) => router.push(path + getUserParams());

  useEffect(() => {
    async function load() {
      const data = await getChallenges();
      setChallenges(data);

      const { data: fData } = await supabase
        .from("activity_feed")
        .select("*")
        .eq("type", "message")
        .order("created_at", { ascending: false })
        .limit(20);
      setFeed(fData || []);
      setLoading(false);
    }
    load();

    // Real-time community posts
    const sub = supabase
      .channel("messages_feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_feed" },
        (payload) => {
          if (payload.new.type === "message") {
            setFeed(prev => [payload.new, ...prev.slice(0, 19)]);
          }
        }
      ).subscribe();

    return () => { supabase.removeChannel(sub); };
  }, []);

  async function handlePost() {
    if (!postText.trim()) return;
    setPosting(true);
    await supabase.from("activity_feed").insert({
      user_name: user?.name || "Member",
      type: "message",
      text: postText.trim(),
      meta: {},
    });
    setPostText("");
    setPosting(false);
  }

  const TABS: { id: MsgTab; label: string; icon: string }[] = [
    { id: "community", label: "Community", icon: "🌈" },
    { id: "groups",    label: "Groups",    icon: "⚡" },
    { id: "dms",       label: "DMs",       icon: "💬" },
  ];

  return (
    <div className="min-h-screen pt-6 pb-28 flex flex-col">

      {/* Header */}
      <div className="px-5 mb-4">
        <p className="text-xs font-bold tracking-[0.2em] uppercase mb-1"
          style={{ background: "linear-gradient(90deg,#ff6b9d,#ff9f43,#ffdd59,#48cfad,#4fc3f7,#667eea)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Queers & Allies Fitness
        </p>
        <h1 className="text-3xl font-display font-extrabold text-slate-900 tracking-tight">Messages</h1>
      </div>

      {/* Tabs */}
      <div className="px-5 mb-4">
        <div className="flex p-1 rounded-full bg-white shadow-sm" style={{ border: "1px solid #E5E5EA" }}>
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex-1 py-2.5 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1"
              style={tab === t.id ? {
                background: "linear-gradient(90deg,#ff6b9d,#ff9f43,#ffdd59,#48cfad,#4fc3f7,#667eea)",
                color: "#1a1a1a",
              } : { color: "#8E8E93" }}>
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── COMMUNITY TAB ── */}
      {tab === "community" && (
        <div className="px-5 flex flex-col gap-4 flex-1">

          {/* Post input */}
          <div className="neon-card rounded-2xl p-4 flex gap-3 items-center">
            <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-sm text-white"
              style={{ background: "linear-gradient(135deg,#ff6b9d,#667eea)" }}>
              {user?.name?.[0]?.toUpperCase() || "?"}
            </div>
            <input
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handlePost()}
              placeholder="Post a shoutout to the community…"
              className="flex-1 text-sm bg-transparent outline-none text-slate-800 placeholder-slate-400"
            />
            <button
              onClick={handlePost}
              disabled={posting || !postText.trim()}
              className="text-xs font-bold px-4 py-2 rounded-full transition-all flex-shrink-0"
              style={postText.trim() && !posting ? {
                background: "linear-gradient(90deg,#ff6b9d,#667eea)",
                color: "white",
              } : { background: "#f1f1f1", color: "#aaa" }}
            >
              {posting ? "…" : "Post"}
            </button>
          </div>

          {/* Feed */}
          {loading ? (
            <div className="neon-card rounded-2xl p-8 text-center">
              <p className="text-slate-400 text-sm font-medium">Loading...</p>
            </div>
          ) : feed.length === 0 ? (
            <div className="neon-card rounded-2xl p-10 text-center">
              <p className="text-2xl mb-2">🌈</p>
              <p className="font-bold text-slate-800">No posts yet</p>
              <p className="text-sm text-slate-500 mt-1">Be the first to say something!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {feed.map((item, i) => (
                <div key={item.id || i} className="neon-card rounded-2xl px-4 py-4 flex gap-3 items-start">
                  <div className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-xs text-white"
                    style={{ background: ["linear-gradient(135deg,#ff6b9d,#ff9f43)", "linear-gradient(135deg,#48cfad,#667eea)", "linear-gradient(135deg,#a855f7,#ff6b9d)", "linear-gradient(135deg,#ff9f43,#ffdd59)"][i % 4] }}>
                    {item.user_name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-slate-900">{item.user_name}</p>
                    <p className="text-sm text-slate-600 mt-0.5 leading-relaxed">{item.text}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── GROUPS TAB ── */}
      {tab === "groups" && (
        <div className="px-5 flex flex-col gap-3">
          {challenges.length === 0 ? (
            <div className="neon-card rounded-2xl p-10 text-center">
              <p className="text-2xl mb-2">⚡</p>
              <p className="font-bold text-slate-800">No challenge chats yet</p>
              <p className="text-sm text-slate-500 mt-2 mb-4">Join a challenge to unlock its group chat</p>
              <button onClick={() => navigate("/embed/challenges")}
                className="rainbow-cta rounded-xl px-6 py-3 font-bold text-sm">
                Browse Challenges
              </button>
            </div>
          ) : (
            challenges.map((challenge) => (
              <button
                key={challenge.id}
                onClick={() => navigate(`/embed/challenge/${challenge.id}`)}
                className="w-full neon-card rounded-2xl overflow-hidden text-left hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="h-1 w-full rainbow-cta" />
                <div className="px-5 py-4 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: "linear-gradient(135deg,#ff6b9d22,#667eea22)" }}>
                    💬
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900">{challenge.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">
                      {challenge.member_count || 0} members · Tap to open chat
                    </p>
                  </div>
                  <span className="text-slate-400 text-sm">→</span>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* ── DMs TAB ── */}
      {tab === "dms" && (
        <div className="px-5">
          <div className="neon-card rounded-2xl p-10 text-center">
            <p className="text-2xl mb-2">💬</p>
            <p className="font-bold text-slate-800">Direct Messages</p>
            <p className="text-sm text-slate-500 mt-2">
              DMs are coming soon — for now, chat in your challenge groups!
            </p>
            <button onClick={() => setTab("groups")}
              className="rainbow-cta rounded-xl px-6 py-3 font-bold text-sm mt-4">
              Go to Group Chats
            </button>
          </div>
        </div>
      )}

    </div>
  );
}