"use client";

// app/embed/home/page.tsx — Queers & Allies Fitness Home Dashboard
// .env.local: NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY

import { useEffect, useState, CSSProperties } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Types ────────────────────────────────────────────────────────────────────
type FeedType = "streak" | "join" | "score" | "team" | "message";

interface Challenge {
  id: string;
  name: string;
  type: string;
  emoji: string;
  member_count: number;
  capacity: number;
}

interface FeedItem {
  id: string;
  created_at: string;
  user_name: string;
  type: FeedType;
  text: string;
  meta: Record<string, unknown>;
}

// ─── Constants ────────────────────────────────────────────────────────────────
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

// ─── Chip ─────────────────────────────────────────────────────────────────────
function Chip({ type }: { type: FeedType }) {
  const s = CHIP_STYLES[type];
  return (
    <span style={{
      background: s.bg, color: s.color,
      fontSize: 10, fontWeight: 700,
      padding: "3px 8px", borderRadius: 20,
      whiteSpace: "nowrap",
    }}>
      {s.label}
    </span>
  );
}

// ─── Feed Card ────────────────────────────────────────────────────────────────
function FeedCard({ item, index }: { item: FeedItem; index: number }) {
  const avatarBg = AVATAR_COLORS[index % AVATAR_COLORS.length];
  const meta = item.meta;
  const subValue =
    item.type === "streak" ? `${meta.days}d`
    : item.type === "score" || item.type === "team" ? `#${meta.rank}`
    : null;

  return (
    <div style={{
      background: "#fff", borderRadius: 16, padding: "13px 14px",
      display: "flex", gap: 11, alignItems: "flex-start",
      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      animation: "slideIn 0.4s ease both",
      animationDelay: `${index * 0.06}s`,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: "50%", background: avatarBg,
        flexShrink: 0, display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: 17, marginTop: 1,
      }}>
        {item.type === "team" ? "🏳️‍🌈" : "😊"}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#0e0e0e" }}>{item.user_name}</div>
        <div
          style={{ fontSize: 11.5, color: "#666", marginTop: 2, lineHeight: 1.35 }}
          dangerouslySetInnerHTML={{ __html: item.text }}
        />
        <div style={{ fontSize: 10, color: "#bbb", marginTop: 3 }}>
          {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
        <Chip type={item.type} />
        {subValue && (
          <span style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 15, color: "#7b2d8b" }}>
            {subValue}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Challenge Card ───────────────────────────────────────────────────────────
function ChallengeCard({ challenge, colorIndex }: { challenge: Challenge; colorIndex: number }) {
  const c = CARD_COLORS[colorIndex % CARD_COLORS.length];
  const pct = Math.round((challenge.member_count / challenge.capacity) * 100);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        background: "#1a1a1a", borderRadius: 18, padding: "16px 14px",
        position: "relative", overflow: "hidden", cursor: "pointer",
        transform: hovered ? "scale(1.02)" : "scale(1)",
        transition: "transform 0.15s",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: c.glow, opacity: 0.15 }} />
      <div style={{ fontSize: 22, marginBottom: 8 }}>{challenge.emoji || "💪"}</div>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "rgba(255,255,255,0.45)", marginBottom: 4 }}>
        {challenge.type}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", lineHeight: 1.25, marginBottom: 12 }}>
        {challenge.name}
      </div>
      <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 8, padding: "7px 10px" }}>
        <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 16, color: c.valColor }}>
          {challenge.member_count} / {challenge.capacity}
        </div>
        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", marginTop: 1 }}>Members joined</div>
      </div>
      <div style={{ marginTop: 10, height: 3, background: "rgba(255,255,255,0.1)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: 99, width: `${pct}%`, background: `linear-gradient(90deg, ${c.prog1}, ${c.prog2})` }} />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
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
        .order("member_count", { ascending: false }).limit(2);
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

  // Full-viewport dark branded background — fills the void on desktop
  const outerStyle: CSSProperties = {
    minHeight: "100dvh",
    width: "100%",
    background: "linear-gradient(135deg, #1a0a2e 0%, #0e0e0e 50%, #0a1a0e 100%)",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
  };

  // Centered phone column — full width on mobile, capped + floating on desktop
  const appStyle: CSSProperties = {
    width: "100%",
    maxWidth: 430,
    minHeight: "100dvh",
    background: "#f5f0ff",
    display: "flex",
    flexDirection: "column",
    fontFamily: "'DM Sans', sans-serif",
    position: "relative",
    boxShadow: "0 0 80px rgba(123,45,139,0.3), 0 0 0 1px rgba(255,255,255,0.04)",
  };

  const scrollStyle: CSSProperties = {
    flex: 1, overflowY: "auto", overflowX: "hidden", paddingBottom: 100,
  };

  const heroStyle: CSSProperties = {
    margin: "10px 16px", background: "#0e0e0e",
    borderRadius: 20, padding: "24px 22px",
    position: "relative", overflow: "hidden",
  };

  if (loading) return (
    <div style={{ ...outerStyle, alignItems: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <div style={{ fontSize: 48 }}>🏳️‍🌈</div>
        <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 18, color: "#7b2d8b", letterSpacing: 2 }}>
          LOADING...
        </div>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes rainbowShift { 0%{background-position:0%} 100%{background-position:200%} }
        @keyframes slideIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; }
        body { background: #0e0e0e; }
        ::-webkit-scrollbar { display: none; }

        /* Action buttons — responsive, won't overflow */
        .action-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin: 14px 16px;
        }
        .action-btn {
          background: #fff;
          border-radius: 16px;
          padding: 12px 4px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.07);
          transition: transform 0.15s;
          min-width: 0;
        }
        .action-btn:hover { transform: translateY(-2px); }
        .action-icon {
          width: 36px; height: 36px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 16px; flex-shrink: 0;
        }
        .action-label {
          font-size: 10px; font-weight: 600; text-align: center;
          color: #0e0e0e; line-height: 1.2;
          overflow-wrap: break-word; word-break: break-word; width: 100%;
        }
        /* Squeeze gracefully on very narrow screens */
        @media (max-width: 360px) {
          .action-label { font-size: 8.5px; }
          .action-icon { width: 28px; height: 28px; font-size: 13px; }
          .action-btn { padding: 8px 2px; gap: 4px; border-radius: 12px; }
          .action-grid { gap: 6px; margin: 12px 12px; }
        }

        /* Hero pill — wraps cleanly instead of breaking layout */
        .hero-pill {
          display: inline-flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 3px;
          margin-top: 14px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 20px;
          padding: 5px 12px;
          font-size: 11px;
          color: rgba(255,255,255,0.7);
          max-width: 100%;
        }

        /* iOS safe area for bottom nav */
        .bottom-nav {
          padding-bottom: max(20px, env(safe-area-inset-bottom));
        }
      `}</style>

      {/* Dark branded full-viewport background */}
      <div style={outerStyle}>
        <div style={appStyle}>

          {/* Animated rainbow strip */}
          <div style={{
            height: 4, flexShrink: 0,
            background: "linear-gradient(90deg,#ff3c5f,#ff8c42,#ffd166,#06d6a0,#118ab2,#7b2d8b,#ff3c5f)",
            backgroundSize: "200% 100%",
            animation: "rainbowShift 4s linear infinite",
          }} />

          <div style={scrollStyle}>

            {/* Wordmark */}
            <div style={{ padding: "14px 20px 6px" }}>
              <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 13, letterSpacing: 2, color: "#7b2d8b", opacity: 0.7 }}>
                QUEERS & ALLIES FITNESS
              </div>
            </div>

            {/* Hero */}
            <div style={heroStyle}>
              <div style={{ position: "absolute", bottom: -30, right: -30, width: 140, height: 140, borderRadius: "50%", background: "linear-gradient(135deg,#7b2d8b,#ff3c5f)", opacity: 0.25 }} />
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#ffd166", marginBottom: 8 }}>
                ⚡ Welcome back{userEmail ? `, ${userEmail}` : ""}
              </div>
              <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 36, lineHeight: 1.05, color: "#fff" }}>
                Building<br />
                <span style={{ background: "linear-gradient(90deg,#ffd166,#06d6a0)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  Community
                </span><br />
                Strength.
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 8, fontWeight: 500 }}>
                Physical Fitness + Mental Health · Sacramento, CA
              </div>
              <div className="hero-pill">
                🏆&nbsp;
                <span style={{ color: "#06d6a0", fontWeight: 700 }}>{challenges.length} active challenges</span>
                &nbsp;this week
              </div>
            </div>

            {/* Quick actions */}
            <div className="action-grid">
              {ACTIONS.map((btn) => (
                <div key={btn.label} className="action-btn">
                  <div className="action-icon" style={{ background: btn.bg }}>{btn.icon}</div>
                  <div className="action-label">{btn.label}</div>
                </div>
              ))}
            </div>

            {/* Featured Challenges */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "18px 16px 10px" }}>
              <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 20, letterSpacing: 1 }}>Featured Challenges</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#7b2d8b", cursor: "pointer" }}>See all →</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, margin: "0 16px" }}>
              {challenges.map((c, i) => (
                <ChallengeCard key={c.id} challenge={c} colorIndex={i} />
              ))}
            </div>

            {/* Activity Feed */}
            <div style={{ height: 2, margin: "18px 16px 0", background: "linear-gradient(90deg,#ff3c5f,#ff8c42,#ffd166,#06d6a0,#118ab2,#7b2d8b)", borderRadius: 2, opacity: 0.3 }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "20px 16px 10px", gap: 8 }}>
              <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 20, letterSpacing: 1, flexShrink: 0 }}>
                Activity Feed
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <input
                  value={postText}
                  onChange={(e) => setPostText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handlePost()}
                  placeholder="Post a shoutout…"
                  style={{ fontSize: 11, padding: "6px 10px", borderRadius: 20, border: "1px solid #ddd", outline: "none", width: 110 }}
                />
                <button
                  onClick={handlePost}
                  disabled={posting || !postText.trim()}
                  style={{ background: "#0e0e0e", color: "#fff", fontSize: 11, fontWeight: 700, padding: "6px 12px", borderRadius: 20, border: "none", cursor: "pointer", opacity: posting ? 0.5 : 1 }}
                >
                  {posting ? "…" : "Post"}
                </button>
              </div>
            </div>

            <div style={{ margin: "0 16px", display: "flex", flexDirection: "column", gap: 8 }}>
              {feed.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: "#bbb", fontSize: 13 }}>
                  No activity yet — be the first to post! 🌈
                </div>
              ) : (
                feed.map((item, i) => <FeedCard key={item.id} item={item} index={i} />)
              )}
            </div>

          </div>

          {/* Bottom nav */}
          <div className="bottom-nav" style={{
            position: "sticky", bottom: 0, background: "#0e0e0e",
            paddingTop: 12, paddingLeft: 20, paddingRight: 20,
            display: "flex", justifyContent: "space-around",
            alignItems: "center", flexShrink: 0,
          }}>
            {([
              { id: "ranks",     icon: "🏅", label: "Ranks"     },
              { id: "dashboard", icon: "🏳️‍🌈", label: "Dashboard" },
              { id: "streak",    icon: "🔥", label: "Streak",   sub: streak !== null ? `${streak}d` : "" },
              { id: "messages",  icon: "💬", label: "Messages"  },
            ] as const).map((nav) => (
              <div
                key={nav.id}
                onClick={() => setActiveNav(nav.id)}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer", padding: "6px 10px", borderRadius: 12, background: activeNav === nav.id ? "rgba(255,255,255,0.06)" : "transparent" }}
              >
                {nav.id === "dashboard" ? (
                  <div style={{ width: 32, height: 32, background: activeNav === "dashboard" ? "linear-gradient(135deg,#7b2d8b,#ff3c5f)" : "rgba(255,255,255,0.1)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                    🏳️‍🌈
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    <div style={{ fontSize: 20, lineHeight: 1 }}>{nav.icon}</div>
                    {"sub" in nav && nav.sub && (
                      <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 11, color: "#ffd166", lineHeight: 1 }}>{nav.sub}</div>
                    )}
                  </div>
                )}
                <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: 0.5, color: activeNav === nav.id ? "#ffd166" : "rgba(255,255,255,0.4)" }}>
                  {nav.label}
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </>
  );
}