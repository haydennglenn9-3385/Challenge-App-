"use client";

// app/embed/home/page.tsx — Queers & Allies Fitness Home Dashboard

import { useEffect, useState, CSSProperties } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type FeedType = "streak" | "join" | "score" | "team" | "message";

interface Challenge {
  id: string;
  name: string;
  type: string;
  emoji: string;
  member_count: number;
  capacity: number;
  end_date?: string;
}

interface FeedItem {
  id: string;
  created_at: string;
  user_name: string;
  type: FeedType;
  text: string;
  meta: Record<string, unknown>;
}

const CHIP_STYLES: Record<FeedType, { bg: string; color: string; label: string }> = {
  streak:  { bg: "#fff3e0", color: "#e65100", label: "🔥 Streak" },
  join:    { bg: "#d4f5e2", color: "#1b7a4e", label: "✅ Joined" },
  score:   { bg: "#e8d9f7", color: "#7b2d8b", label: "📊 Score"  },
  team:    { bg: "#fde0ef", color: "#b5003c", label: "🏆 Team"   },
  message: { bg: "#d4eaf7", color: "#118ab2", label: "💬 Post"   },
};

const AVATAR_COLORS = ["#fde0ef", "#d4f5e2", "#fdf6d3", "#e8d9f7", "#d4eaf7"];

const ACTIONS = [
  { icon: "➕", label: "New Challenge", bg: "#fde0ef" },
  { icon: "🔗", label: "Join with Code", bg: "#fdf6d3" },
  { icon: "👀", label: "View All",       bg: "#d4f5e2" },
  { icon: "🏅", label: "Leaderboard",    bg: "#e8d9f7" },
] as const;

const CARD_COLORS = [
  { glow: "#ff3c5f", prog1: "#ff3c5f", prog2: "#ffd166", valColor: "#ffd166" },
  { glow: "#06d6a0", prog1: "#06d6a0", prog2: "#118ab2", valColor: "#06d6a0" },
];

function daysLeft(endDate?: string) {
  if (!endDate) return null;
  const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000);
  return diff > 0 ? diff : 0;
}

function Chip({ type }: { type: FeedType }) {
  const s = CHIP_STYLES[type];
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, whiteSpace: "nowrap" as const }}>
      {s.label}
    </span>
  );
}

function FeedCard({ item, index }: { item: FeedItem; index: number }) {
  const avatarBg = AVATAR_COLORS[index % AVATAR_COLORS.length];
  const meta = item.meta;
  const subValue =
    item.type === "streak" ? `${meta.days}d`
    : item.type === "score" || item.type === "team" ? `#${meta.rank}`
    : null;

  return (
    <div style={{ background: "#fff", borderRadius: 14, padding: "12px 13px", display: "flex", gap: 10, alignItems: "flex-start" as const, boxShadow: "0 1px 6px rgba(0,0,0,0.06)", animation: "slideIn 0.4s ease both", animationDelay: `${index * 0.06}s` }}>
      <div style={{ width: 38, height: 38, borderRadius: "50%", background: avatarBg, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, marginTop: 1 }}>
        {item.type === "team" ? "🏳️‍🌈" : "😊"}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#0e0e0e" }}>{item.user_name}</div>
        <div style={{ fontSize: 11.5, color: "#666", marginTop: 2, lineHeight: 1.35 }} dangerouslySetInnerHTML={{ __html: item.text }} />
        <div style={{ fontSize: 10, color: "#bbb", marginTop: 2 }}>
          {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "flex-end" as const, gap: 4, flexShrink: 0 }}>
        <Chip type={item.type} />
        {subValue && <span style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 14, color: "#7b2d8b" }}>{subValue}</span>}
      </div>
    </div>
  );
}

function ChallengeCard({ challenge, colorIndex }: { challenge: Challenge; colorIndex: number }) {
  const c = CARD_COLORS[colorIndex % CARD_COLORS.length];
  const pct = challenge.capacity > 0 ? Math.round((challenge.member_count / challenge.capacity) * 100) : 0;
  const days = daysLeft(challenge.end_date);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{ background: "#1a1a1a", borderRadius: 16, padding: "14px 13px", position: "relative" as const, overflow: "hidden" as const, cursor: "pointer", transform: hovered ? "scale(1.02)" : "scale(1)", transition: "transform 0.15s" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ position: "absolute" as const, top: -16, right: -16, width: 64, height: 64, borderRadius: "50%", background: c.glow, opacity: 0.18 }} />
      <div style={{ fontSize: 20, marginBottom: 6 }}>{challenge.emoji || "💪"}</div>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" as const, color: "rgba(255,255,255,0.4)", marginBottom: 3 }}>{challenge.type}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", lineHeight: 1.25, marginBottom: 10 }}>{challenge.name}</div>
      <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 8, padding: "6px 9px" }}>
        <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 14, color: c.valColor }}>{challenge.member_count} / {challenge.capacity}</div>
        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.45)" }}>Members{days !== null ? ` · ${days}d left` : ""}</div>
      </div>
      <div style={{ marginTop: 8, height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 99, overflow: "hidden" as const }}>
        <div style={{ height: "100%", borderRadius: 99, width: `${pct}%`, background: `linear-gradient(90deg, ${c.prog1}, ${c.prog2})` }} />
      </div>
    </div>
  );
}

function DesktopChallengeRow({ challenge }: { challenge: Challenge }) {
  const days = daysLeft(challenge.end_date);
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{ padding: "14px 16px", borderRadius: 12, background: hovered ? "#f8f4ff" : "#f5f5f5", cursor: "pointer", transition: "background 0.15s" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ fontWeight: 700, fontSize: 14, color: "#0e0e0e" }}>{challenge.name}</div>
      <div style={{ fontSize: 12, color: "#888", marginTop: 3 }}>
        {challenge.member_count} member{challenge.member_count !== 1 ? "s" : ""}
        {days !== null ? ` · ${days} days left` : ""}
      </div>
    </div>
  );
}

export default function HomePage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [feed, setFeed]             = useState<FeedItem[]>([]);
  const [streak, setStreak]         = useState<number | null>(null);
  const [userEmail, setUserEmail]   = useState<string>("");
  const [loading, setLoading]       = useState(true);
  const [postText, setPostText]     = useState("");
  const [posting, setPosting]       = useState(false);
  const [activeNav, setActiveNav]   = useState("dashboard");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) setUserEmail(user.email.split("@")[0]);

      const { data: cData } = await supabase
        .from("challenges").select("*")
        .order("member_count", { ascending: false }).limit(6);
      setChallenges((cData as Challenge[]) || []);

      const { data: fData } = await supabase
        .from("activity_feed").select("*")
        .order("created_at", { ascending: false }).limit(10);
      setFeed((fData as FeedItem[]) || []);

      if (user) {
        const { data: sData } = await supabase
          .from("user_streaks").select("current_streak")
          .eq("user_id", user.id).single();
        setStreak((sData as { current_streak: number } | null)?.current_streak ?? 0);
      }
      setLoading(false);
    }

    load();

    const sub = supabase
      .channel("activity_feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_feed" },
        (payload) => setFeed(prev => [payload.new as FeedItem, ...prev.slice(0, 9)])
      ).subscribe();

    return () => { supabase.removeChannel(sub); };
  }, []);

  async function handlePost() {
    if (!postText.trim()) return;
    setPosting(true);
    await supabase.from("activity_feed").insert({
      user_name: userEmail || "Member",
      type: "message",
      text: `"${postText.trim()}"`,
      meta: {},
    });
    setPostText("");
    setPosting(false);
  }

  if (loading) return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#d4f5e2 0%,#fde0ef 35%,#fdf6d3 65%,#d4eaf7 100%)" }}>
      <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 12 }}>
        <div style={{ fontSize: 48 }}>🏳️‍🌈</div>
        <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 18, color: "#7b2d8b", letterSpacing: 2 }}>LOADING...</div>
      </div>
    </div>
  );

  // The app panel (shared between mobile and desktop right column)
  const appPanel = (
    <div id="app-panel" style={{ display: "flex", flexDirection: "column" as const, flex: 1, minHeight: "100dvh", background: "#f5f0ff", position: "relative" as const }}>
      {/* Rainbow strip */}
      <div style={{ height: 4, flexShrink: 0, background: "linear-gradient(90deg,#ff3c5f,#ff8c42,#ffd166,#06d6a0,#118ab2,#7b2d8b,#ff3c5f)", backgroundSize: "200% 100%", animation: "rainbowShift 4s linear infinite" }} />

      <div id="scroll-area" style={{ flex: 1, overflowY: "auto" as const, overflowX: "hidden" as const, paddingBottom: 90 }}>
        <div style={{ padding: "14px 16px 6px" }}>
          <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 13, letterSpacing: 2, color: "#7b2d8b", opacity: 0.7 }}>QUEERS & ALLIES FITNESS</div>
        </div>

        {/* Hero */}
        <div style={{ margin: "0 16px", background: "#0e0e0e", borderRadius: 20, padding: "22px 20px", position: "relative" as const, overflow: "hidden" as const }}>
          <div style={{ position: "absolute" as const, bottom: -30, right: -30, width: 130, height: 130, borderRadius: "50%", background: "linear-gradient(135deg,#7b2d8b,#ff3c5f)", opacity: 0.25 }} />
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" as const, color: "#ffd166", marginBottom: 8 }}>
            ⚡ Welcome back{userEmail ? `, ${userEmail}` : ""}
          </div>
          <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 34, lineHeight: 1.05, color: "#fff" }}>
            Building<br />
            <span style={{ background: "linear-gradient(90deg,#ffd166,#06d6a0)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Community</span><br />
            Strength.
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 6, fontWeight: 500 }}>Physical Fitness + Mental Health · Sacramento, CA</div>
          <div className="hero-pill">
            🏆&nbsp;<span style={{ color: "#06d6a0", fontWeight: 700 }}>{challenges.length} active challenges</span>&nbsp;this week
          </div>
        </div>

        {/* Actions */}
        <div className="action-grid">
          {ACTIONS.map((btn) => (
            <div key={btn.label} className="action-btn">
              <div className="action-icon" style={{ background: btn.bg }}>{btn.icon}</div>
              <div className="action-label">{btn.label}</div>
            </div>
          ))}
        </div>

        {/* Featured Challenges */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "4px 16px 10px" }}>
          <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 20, letterSpacing: 1 }}>Featured Challenges</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#7b2d8b", cursor: "pointer" }}>See all →</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, margin: "0 16px" }}>
          {challenges.slice(0, 2).map((c, i) => <ChallengeCard key={c.id} challenge={c} colorIndex={i} />)}
        </div>

        {/* Activity Feed */}
        <div style={{ height: 2, margin: "16px 16px 0", background: "linear-gradient(90deg,#ff3c5f,#ff8c42,#ffd166,#06d6a0,#118ab2,#7b2d8b)", borderRadius: 2, opacity: 0.25 }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "14px 16px 10px", gap: 8 }}>
          <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 20, letterSpacing: 1, flexShrink: 0 }}>Activity Feed</div>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <input value={postText} onChange={(e) => setPostText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handlePost()} placeholder="Post a shoutout…" style={{ fontSize: 11, padding: "6px 10px", borderRadius: 20, border: "1px solid #ddd", outline: "none", width: 108 }} />
            <button onClick={handlePost} disabled={posting || !postText.trim()} style={{ background: "#0e0e0e", color: "#fff", fontSize: 11, fontWeight: 700, padding: "6px 12px", borderRadius: 20, border: "none", cursor: "pointer", opacity: posting ? 0.5 : 1 }}>
              {posting ? "…" : "Post"}
            </button>
          </div>
        </div>
        <div style={{ margin: "0 16px 16px", display: "flex", flexDirection: "column" as const, gap: 8 }}>
          {feed.length === 0
            ? <div style={{ textAlign: "center" as const, padding: "28px 0", color: "#bbb", fontSize: 13 }}>No activity yet — be the first to post! 🌈</div>
            : feed.map((item, i) => <FeedCard key={item.id} item={item} index={i} />)
          }
        </div>
      </div>

      {/* Bottom nav */}
      <div id="bottom-nav" style={{ background: "#0e0e0e", padding: "12px 20px max(20px, env(safe-area-inset-bottom))", display: "flex", justifyContent: "space-around", alignItems: "center", flexShrink: 0 }}>
        {([
          { id: "ranks",     icon: "🏅", label: "Ranks"     },
          { id: "dashboard", icon: "🏳️‍🌈", label: "Dashboard" },
          { id: "streak",    icon: "🔥", label: "Streak",   sub: streak !== null ? `${streak}d` : "" },
          { id: "messages",  icon: "💬", label: "Messages"  },
        ] as const).map((nav) => (
          <div key={nav.id} onClick={() => setActiveNav(nav.id)} style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 4, cursor: "pointer", padding: "6px 10px", borderRadius: 12, background: activeNav === nav.id ? "rgba(255,255,255,0.06)" : "transparent" }}>
            {nav.id === "dashboard" ? (
              <div style={{ width: 32, height: 32, background: activeNav === "dashboard" ? "linear-gradient(135deg,#7b2d8b,#ff3c5f)" : "rgba(255,255,255,0.1)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🏳️‍🌈</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 2 }}>
                <div style={{ fontSize: 20, lineHeight: 1 }}>{nav.icon}</div>
                {"sub" in nav && nav.sub && <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 11, color: "#ffd166", lineHeight: 1 }}>{nav.sub}</div>}
              </div>
            )}
            <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: 0.5, color: activeNav === nav.id ? "#ffd166" : "rgba(255,255,255,0.4)" }}>{nav.label}</div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes rainbowShift { 0%{background-position:0%} 100%{background-position:200%} }
        @keyframes slideIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; }
        ::-webkit-scrollbar { display: none; }

        .action-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 8px; margin: 14px 16px; }
        .action-btn { background: #fff; border-radius: 16px; padding: 12px 4px; display: flex; flex-direction: column; align-items: center; gap: 6px; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.07); transition: transform 0.15s; min-width: 0; }
        .action-btn:hover { transform: translateY(-2px); }
        .action-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 16px; }
        .action-label { font-size: 10px; font-weight: 600; text-align: center; color: #0e0e0e; line-height: 1.2; word-break: break-word; width: 100%; }
        .hero-pill { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 3px; margin-top: 12px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); border-radius: 20px; padding: 5px 12px; font-size: 11px; color: rgba(255,255,255,0.7); max-width: 100%; }

        /* MOBILE: full width, fixed bottom nav */
        .mobile-layout { display: flex; flex-direction: column; min-height: 100dvh; }
        #app-panel { flex: 1; }
        #scroll-area { padding-bottom: 80px !important; }
        #bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; z-index: 100; }

        /* DESKTOP: two-column, sticky nav inside right panel */
        @media (min-width: 768px) {
          body { background: linear-gradient(135deg,#d4f5e2 0%,#fde0ef 30%,#fdf6d3 60%,#d4eaf7 100%) !important; }
          .mobile-layout { flex-direction: row; max-width: 1200px; margin: 0 auto; min-height: 100dvh; }
          .desktop-left { display: flex !important; }
          #app-panel { max-width: 400px; flex-shrink: 0; box-shadow: -8px 0 40px rgba(0,0,0,0.08); }
          #scroll-area { padding-bottom: 0 !important; }
          #bottom-nav { position: sticky !important; bottom: 0 !important; left: auto !important; right: auto !important; }
          .action-label { font-size: 9.5px; }
        }

        @media (max-width: 360px) {
          .action-label { font-size: 8.5px; }
          .action-icon { width: 28px; height: 28px; font-size: 13px; }
          .action-btn { padding: 8px 2px; gap: 4px; border-radius: 12px; }
          .action-grid { gap: 6px; margin: 12px 12px; }
        }
      `}</style>

      <div className="mobile-layout">

        {/* Desktop left column — hidden on mobile via CSS */}
        <div className="desktop-left" style={{ display: "none", flex: 1, flexDirection: "column" as const, justifyContent: "center", padding: "60px 48px", gap: 24 }}>
          <div style={{ display: "inline-flex", alignItems: "center", background: "rgba(255,255,255,0.7)", backdropFilter: "blur(8px)", borderRadius: 99, padding: "6px 16px", fontSize: 13, fontWeight: 600, color: "#0e0e0e", width: "fit-content", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
            Invite-only fitness challenges
          </div>
          <div>
            <h1 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "clamp(30px,3.5vw,50px)", fontWeight: 700, color: "#0e0e0e", lineHeight: 1.1, letterSpacing: -1 }}>
              Queers and Allies<br />Fitness Challenge
            </h1>
            <p style={{ fontSize: 16, color: "#444", marginTop: 16, lineHeight: 1.6, maxWidth: 460 }}>
              Spark friendly competition, track streaks, and keep your gym crew moving together. Create vibrant challenges and cheer each other on every day.
            </p>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" as const }}>
            <button style={{ background: "linear-gradient(135deg,#ff3c5f,#ff8c42,#ffd166,#06d6a0,#118ab2,#7b2d8b)", color: "#fff", fontWeight: 700, fontSize: 15, padding: "13px 28px", borderRadius: 99, border: "none", cursor: "pointer", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>Dashboard</button>
            <button style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(8px)", color: "#0e0e0e", fontWeight: 600, fontSize: 15, padding: "13px 28px", borderRadius: 99, border: "1px solid rgba(0,0,0,0.1)", cursor: "pointer" }}>View Challenges</button>
            <button style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(8px)", color: "#0e0e0e", fontWeight: 600, fontSize: 15, padding: "13px 28px", borderRadius: 99, border: "1px solid rgba(0,0,0,0.1)", cursor: "pointer" }}>Join with code</button>
          </div>
          <div style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(12px)", borderRadius: 20, padding: "20px", boxShadow: "0 4px 24px rgba(0,0,0,0.07)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span style={{ background: "#22c55e", color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99 }}>Popular</span>
              <span style={{ fontWeight: 700, fontSize: 16, color: "#0e0e0e" }}>Active Challenges</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
              {challenges.slice(0, 4).map(c => <DesktopChallengeRow key={c.id} challenge={c} />)}
            </div>
            <button style={{ width: "100%", marginTop: 14, padding: "12px", borderRadius: 10, border: "1px solid #e5e5e5", background: "transparent", fontWeight: 600, fontSize: 14, cursor: "pointer", color: "#0e0e0e" }}>
              Browse all challenges →
            </button>
          </div>
        </div>

        {/* App panel */}
        {appPanel}

      </div>
    </>
  );
}