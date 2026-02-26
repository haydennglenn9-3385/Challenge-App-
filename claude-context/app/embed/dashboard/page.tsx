"use client";
// app/embed/dashboard/page.tsx — Queers & Allies Fitness Dashboard
import { useEffect, useState, CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────
type FeedType = "streak" | "score" | "team" | "message";

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

// ─── Constants ────────────────────────────────────────────────────────────────
const CHIP_STYLES: Record<FeedType, { bg: string; color: string; label: string }> = {
  streak:  { bg: "#fff3e0", color: "#e65100", label: "🔥 Streak" },
  score:   { bg: "#e8d9f7", color: "#7b2d8b", label: "📊 Score"  },
  team:    { bg: "#fde0ef", color: "#b5003c", label: "🏆 Team"   },
  message: { bg: "#d4eaf7", color: "#118ab2", label: "💬 Post"   },
};

const AVATAR_COLORS = ["#fde0ef", "#d4f5e2", "#fdf6d3", "#e8d9f7", "#d4eaf7"];

const ACTIONS = [
  { icon: "➕", label: "New Challenge", iconBg: "#fde0ef", route: "/embed/challenges/new" },
  { icon: "🔥", label: "My Streak",     iconBg: "#fde0ef", route: "/embed/profile"       },
  { icon: "⚡", label: "My Challenges", iconBg: "#d4f5e2", route: "/embed/challenges"    },
  { icon: "🏆", label: "My Teams",      iconBg: "#e8d9f7", route: "/embed/teams"        },
];

const CARD_COLORS = [
  { glow: "#ff3c5f", prog1: "#ff3c5f", prog2: "#ffd166", valColor: "#ffd166" },
  { glow: "#06d6a0", prog1: "#06d6a0", prog2: "#118ab2", valColor: "#06d6a0" },
];

function daysLeft(endDate?: string) {
  if (!endDate) return null;
  const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000);
  return diff > 0 ? diff : 0;
}

// ─── Chip ─────────────────────────────────────────────────────────────────────
function Chip({ type }: { type: FeedType }) {
  const s = CHIP_STYLES[type];
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, whiteSpace: "nowrap" }}>
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
    <div style={{ background: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)", borderRadius: 16, padding: "13px 14px", display: "flex", gap: 11, alignItems: "flex-start", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", animation: "slideIn 0.4s ease both", animationDelay: `${index * 0.06}s` }}>
      <div style={{ width: 40, height: 40, borderRadius: "50%", background: avatarBg, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, marginTop: 1 }}>
        {item.type === "team" ? "🏳️‍🌈" : "😊"}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#0e0e0e" }}>{item.user_name}</div>
        <div style={{ fontSize: 11.5, color: "#555", marginTop: 2, lineHeight: 1.4 }} dangerouslySetInnerHTML={{ __html: item.text }} />
        <div style={{ fontSize: 10, color: "#bbb", marginTop: 3 }}>
          {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
        <Chip type={item.type} />
        {subValue && <span style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 14, color: "#7b2d8b" }}>{subValue}</span>}
      </div>
    </div>
  );
}

// ─── Challenge Card ───────────────────────────────────────────────────────────
function ChallengeCard({ challenge, colorIndex, onClick }: { challenge: Challenge; colorIndex: number; onClick: () => void }) {
  const c = CARD_COLORS[colorIndex % CARD_COLORS.length];
  const pct = challenge.capacity > 0 ? Math.round((challenge.member_count / challenge.capacity) * 100) : 0;
  const days = daysLeft(challenge.end_date);
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      style={{ background: "#1a1a1a", borderRadius: 18, padding: "16px 14px", position: "relative", overflow: "hidden", cursor: "pointer", transform: hovered ? "scale(1.02)" : "scale(1)", transition: "transform 0.15s", height: 190, display: "flex", flexDirection: "column", justifyContent: "space-between" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ position: "absolute", top: -16, right: -16, width: 72, height: 72, borderRadius: "50%", background: c.glow, opacity: 0.2 }} />
      <div>
        <div style={{ fontSize: 20, marginBottom: 6 }}>{challenge.emoji || "💪"}</div>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>{challenge.type}</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
          {challenge.name}
        </div>
      </div>
      <div>
        <div style={{ background: "rgba(255,255,255,0.09)", borderRadius: 10, padding: "8px 10px", marginBottom: 8 }}>
          <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 15, color: c.valColor }}>{challenge.member_count} / {challenge.capacity}</div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>Members{days !== null ? ` · ${days}d left` : ""}</div>
        </div>
        <div style={{ height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 99, width: `${pct}%`, background: `linear-gradient(90deg, ${c.prog1}, ${c.prog2})` }} />
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [feed, setFeed]             = useState<FeedItem[]>([]);
  const [userEmail, setUserEmail]   = useState<string>("");
  const [userStreak, setUserStreak] = useState<number>(0);
  const [loading, setLoading]       = useState(true);
  const [postText, setPostText]     = useState("");
  const [posting, setPosting]       = useState(false);
  const [authed, setAuthed]         = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        setAuthed(true);
        if (user?.email) setUserEmail(user.email.split("@")[0]);
        const { data: sData } = await supabase.from("users").select("streak").eq("id", user.id).single();
        if (sData) setUserStreak(sData.streak || 0);
      }

      const { data: cData } = await supabase
        .from("challenges").select("*")
        .order("member_count", { ascending: false }).limit(6);
      setChallenges((cData as Challenge[]) || []);

      const { data: fData } = await supabase
        .from("activity_feed").select("*")
        .order("created_at", { ascending: false }).limit(10);
      setFeed((fData as FeedItem[]) || []);

      setLoading(false);
    }
    load();

    const sub = supabase
      .channel("activity_feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_feed" },
        (payload) => setFeed((prev) => [payload.new as FeedItem, ...prev.slice(0, 9)])
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

  const pageStyle: CSSProperties = {
    minHeight: "100dvh",
    width: "100%",
    background: "linear-gradient(135deg, #d4f5e2 0%, #fde0ef 30%, #fdf6d3 60%, #d4eaf7 100%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    fontFamily: "'DM Sans', sans-serif",
  };

  if (loading) return (
    <div style={{ ...pageStyle, justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <div style={{ fontSize: 52 }}>🏳️‍🌈</div>
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
        @keyframes slideIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; }
        ::-webkit-scrollbar { display: none; }
        .action-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin: 14px 0;
        }
        .action-btn {
          background: rgba(255,255,255,0.85);
          backdrop-filter: blur(8px);
          border-radius: 18px;
          padding: 14px 6px;
          display: flex; flex-direction: column; align-items: center; gap: 8px;
          cursor: pointer;
          box-shadow: 0 2px 12px rgba(0,0,0,0.07);
          transition: transform 0.15s, box-shadow 0.15s;
          min-width: 0;
        }
        .action-btn:hover { transform: translateY(-3px); box-shadow: 0 6px 20px rgba(0,0,0,0.1); }
        .action-icon {
          width: 40px; height: 40px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center; font-size: 18px;
        }
        .action-label {
          font-size: 10px; font-weight: 700; text-align: center;
          color: #1a1a1a; line-height: 1.2;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%;
        }
        @media (max-width: 340px) {
          .action-label { white-space: normal; font-size: 9px; }
          .action-icon { width: 34px; height: 34px; font-size: 15px; }
        }
        .page-padding { padding-left: 16px; padding-right: 16px; }
        @media (min-width: 768px) {
          .page-padding { padding-left: 24px; padding-right: 24px; }
        }
        .feed-blur-overlay {
          position: absolute;
          inset: 0;
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 24px;
        }
        .feed-auth-card {
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(16px);
          border-radius: 20px;
          padding: 24px 20px;
          text-align: center;
          box-shadow: 0 8px 32px rgba(0,0,0,0.12);
          width: 100%;
          max-width: 280px;
        }
        .login-btn {
          display: inline-block;
          margin-top: 14px;
          padding: 12px 28px;
          border-radius: 14px;
          border: none;
          background: linear-gradient(135deg, #7b2d8b, #ff3c5f);
          color: #fff;
          font-size: 14px;
          font-weight: 700;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer;
          width: 100%;
        }
      `}</style>

      <div style={pageStyle}>
        {/* Rainbow strip */}
        <div style={{ height: 12, width: "100%", background: "linear-gradient(90deg,#ff3c5f,#ff8c42,#ffd166,#06d6a0,#118ab2,#7b2d8b,#ff3c5f)", backgroundSize: "200% 100%", animation: "rainbowShift 4s linear infinite", flexShrink: 0 }} />

        <div className="page-padding" style={{ width: "100%", flex: 1, overflowY: "auto", paddingBottom: 112 }}>

          {/* Wordmark */}
          <div style={{ padding: "16px 0 8px" }}>
            <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 13, letterSpacing: 2.5, color: "#7b2d8b", opacity: 0.8 }}>
              QUEERS & ALLIES FITNESS
            </div>
          </div>

          {/* Hero banner */}
          <div style={{ background: "#0e0e0e", borderRadius: 22, padding: "24px 22px", position: "relative", overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
            <div style={{ position: "absolute", bottom: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: "linear-gradient(135deg,#7b2d8b,#ff3c5f)", opacity: 0.2 }} />
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#ffd166", marginBottom: 10 }}>
              ⚡ Welcome back{userEmail ? `, ${userEmail}` : ""}
            </div>
            {/* "Building Community Strength" — links to website */}
            <a
              href="https://queersandalliesfitness.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "none" }}
            >
              <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 40, lineHeight: 1.0, color: "#fff" }}>
                Building<br />
                <span style={{ background: "linear-gradient(90deg,#ffd166,#06d6a0)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  Community
                </span><br />
                Strength.
              </div>
            </a>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 10, fontWeight: 500 }}>
              Physical Fitness + Mental Health · Sacramento, CA
            </div>
            {/* Active challenges — tappable */}
            <button
              onClick={() => router.push("/embed/challenges")}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 14, background: "rgba(255,255,255,0.09)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 20, padding: "6px 14px", fontSize: 12, color: "rgba(255,255,255,0.75)", cursor: "pointer" }}
            >
              🏆&nbsp;<span style={{ color: "#06d6a0", fontWeight: 700 }}>{challenges.length} active challenges</span>&nbsp;this week →
            </button>
          </div>

          {/* Quick actions */}
          <div className="action-grid">
            {ACTIONS.map((btn) => (
              <div key={btn.label} className="action-btn" onClick={() => router.push(btn.route)}>
                <div className="action-icon" style={{ background: btn.iconBg }}>
                  {btn.icon}
                </div>
                <div className="action-label">
                  {btn.label === "My Streak" && userStreak > 0 ? `🔥 ${userStreak} days` : btn.label}
                </div>
              </div>
            ))}
          </div>

          {/* Featured Challenges */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0 12px" }}>
            <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 22, letterSpacing: 1 }}>Featured Challenges</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#7b2d8b", cursor: "pointer" }} onClick={() => router.push("/embed/challenges")}>
              See all →
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {challenges.slice(0, 2).map((c, i) => (
              <ChallengeCard
                key={c.id}
                challenge={c}
                colorIndex={i}
                onClick={() => router.push(`/embed/challenge/${c.id}`)}
              />
            ))}
          </div>

          {/* Rainbow divider */}
          <div style={{ margin: "20px 0 0", height: 1.5, background: "linear-gradient(90deg,#ff3c5f,#ff8c42,#ffd166,#06d6a0,#118ab2,#7b2d8b)", opacity: 0.25, borderRadius: 2 }} />

          {/* Activity Feed */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0 0" }}>
            <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 22, letterSpacing: 1 }}>Activity Feed</div>
          </div>

          {/* Post input — only shown when logged in */}
          {authed && (
            <div style={{ padding: "10px 0 12px", display: "flex", gap: 8 }}>
              <input
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePost()}
                placeholder="Post a shoutout to the community…"
                style={{ flex: 1, fontSize: 13, padding: "10px 16px", borderRadius: 24, border: "none", outline: "none", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)", boxShadow: "0 2px 8px rgba(0,0,0,0.07)" }}
              />
              <button
                onClick={handlePost}
                disabled={posting || !postText.trim()}
                style={{ background: posting || !postText.trim() ? "rgba(0,0,0,0.15)" : "#0e0e0e", color: "#fff", fontSize: 13, fontWeight: 700, padding: "10px 20px", borderRadius: 24, border: "none", cursor: posting || !postText.trim() ? "default" : "pointer", flexShrink: 0, transition: "background 0.15s" }}
              >
                {posting ? "…" : "Post"}
              </button>
            </div>
          )}

          {/* Feed — blurred with login prompt if not authed */}
          <div style={{ position: "relative", paddingBottom: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, filter: authed ? "none" : "blur(4px)", pointerEvents: authed ? "auto" : "none", userSelect: authed ? "auto" : "none" }}>
              {feed.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: "#999", fontSize: 13 }}>
                  No activity yet — be the first to post! 🌈
                </div>
              ) : (
                feed.map((item, i) => <FeedCard key={item.id} item={item} index={i} />)
              )}
            </div>

            {/* Login overlay — shown when not authed */}
            {!authed && (
              <div className="feed-blur-overlay">
                <div className="feed-auth-card">
                  <div style={{ fontSize: 36, marginBottom: 8 }}>🏳️‍🌈</div>
                  <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 20, color: "#0e0e0e", letterSpacing: 1 }}>
                    Join the Community
                  </div>
                  <div style={{ fontSize: 13, color: "#777", marginTop: 6, lineHeight: 1.5 }}>
                    Log in to see what your community is up to and post your own updates.
                  </div>
                  <button className="login-btn" onClick={() => router.push("/auth")}>
                    Log In / Sign Up
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}