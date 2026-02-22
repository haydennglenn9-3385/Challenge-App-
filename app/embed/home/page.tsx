"use client";

// app/embed/home/page.tsx — Queers & Allies Fitness Home Dashboard

import { useEffect, useState, CSSProperties } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

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

const CHIP_STYLES: Record<
  FeedType,
  { bg: string; color: string; label: string }
> = {
  streak: { bg: "#fff3e0", color: "#e65100", label: "🔥 Streak" },
  join: { bg: "#d4f5e2", color: "#1b7a4e", label: "✅ Joined" },
  score: { bg: "#e8d9f7", color: "#7b2d8b", label: "📊 Score" },
  team: { bg: "#fde0ef", color: "#b5003c", label: "🏆 Team" },
  message: { bg: "#d4eaf7", color: "#118ab2", label: "💬 Post" },
};

const AVATAR_COLORS = ["#fde0ef", "#d4f5e2", "#fdf6d3", "#e8d9f7", "#d4eaf7"];

const ACTIONS = [
  { icon: "➕", label: "New Challenge", bg: "#fde0ef" },
  { icon: "🔗", label: "Join", bg: "#fdf6d3" },
  { icon: "👀", label: "View All", bg: "#d4f5e2" },
  { icon: "🏅", label: "Leaderboard", bg: "#e8d9f7" },
] as const;

const CARD_COLORS = [
  { glow: "#ff3c5f", prog1: "#ff3c5f", prog2: "#ffd166", valColor: "#ffd166" },
  { glow: "#06d6a0", prog1: "#06d6a0", prog2: "#118ab2", valColor: "#06d6a0" },
];

function daysLeft(endDate?: string) {
  if (!endDate) return null;
  const diff = Math.ceil(
    (new Date(endDate).getTime() - Date.now()) / 86400000
  );
  return diff > 0 ? diff : 0;
}

// ─── Chip ─────────────────────────────────────────────────────────────────────

function Chip({ type }: { type: FeedType }) {
  const s = CHIP_STYLES[type];
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        fontSize: 10,
        fontWeight: 700,
        padding: "3px 8px",
        borderRadius: 20,
        whiteSpace: "nowrap" as const,
      }}
    >
      {s.label}
    </span>
  );
}

// ─── Feed Card ────────────────────────────────────────────────────────────────

function FeedCard({ item, index }: { item: FeedItem; index: number }) {
  const avatarBg = AVATAR_COLORS[index % AVATAR_COLORS.length];
  const meta = item.meta;

  const subValue =
    item.type === "streak"
      ? `${meta.days}d`
      : item.type === "score" || item.type === "team"
        ? `#${meta.rank}`
        : null;

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(12px)",
        borderRadius: 16,
        padding: "13px 14px",
        display: "flex",
        gap: 11,
        alignItems: "flex-start" as const,
        boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
        animation: "slideIn 0.4s ease both",
        animationDelay: `${index * 0.06}s`,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: avatarBg,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 17,
          marginTop: 1,
        }}
      >
        {item.type === "team" ? "🏳️‍🌈" : "😊"}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{ fontSize: 13, fontWeight: 700, color: "#0e0e0e" }}
        >
          {item.user_name}
        </div>

        <div
          style={{
            fontSize: 11.5,
            color: "#555",
            marginTop: 2,
            lineHeight: 1.4,
          }}
          dangerouslySetInnerHTML={{ __html: item.text }}
        />

        <div
          style={{ fontSize: 10, color: "#bbb", marginTop: 3 }}
        >
          {new Date(item.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column" as const,
          alignItems: "flex-end" as const,
          gap: 4,
          flexShrink: 0,
        }}
      >
        <Chip type={item.type} />
        {subValue && (
          <span
            style={{
              fontFamily: "'Bebas Neue', cursive",
              fontSize: 14,
              color: "#7b2d8b",
            }}
          >
            {subValue}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Challenge Card ───────────────────────────────────────────────────────────

function ChallengeCard({
  challenge,
  colorIndex,
}: {
  challenge: Challenge;
  colorIndex: number;
}) {
  const c = CARD_COLORS[colorIndex % CARD_COLORS.length];
  const pct =
    challenge.capacity > 0
      ? Math.round((challenge.member_count / challenge.capacity) * 100)
      : 0;

  const days = daysLeft(challenge.end_date);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        background: "#1a1a1a",
        borderRadius: 18,
        padding: "16px 14px",
        position: "relative" as const,
        overflow: "hidden" as const,
        cursor: "pointer",
        transform: hovered ? "scale(1.02)" : "scale(1)",
        transition: "transform 0.15s",
        height: 190,
        display: "flex",
        flexDirection: "column" as const,
        justifyContent: "space-between",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        style={{
          position: "absolute" as const,
          top: -16,
          right: -16,
          width: 72,
          height: 72,
          borderRadius: "50%",
          background: c.glow,
          opacity: 0.2,
        }}
      />

      {/* Top section */}
      <div>
        <div style={{ fontSize: 20, marginBottom: 6 }}>
          {challenge.emoji || "💪"}
        </div>

        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: 1,
            textTransform: "uppercase" as const,
            color: "rgba(255,255,255,0.4)",
            marginBottom: 4,
          }}
        >
          {challenge.type}
        </div>

        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#fff",
            lineHeight: 1.3,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical" as const,
          }}
        >
          {challenge.name}
        </div>
      </div>

      {/* Bottom section */}
      <div>
        <div
          style={{
            background: "rgba(255,255,255,0.09)",
            borderRadius: 10,
            padding: "8px 10px",
            marginBottom: 8,
          }}
        >
          <div
            style={{
              fontFamily: "'Bebas Neue', cursive",
              fontSize: 15,
              color: c.valColor,
            }}
          >
            {challenge.member_count} / {challenge.capacity}
          </div>

          <div
            style={{
              fontSize: 9,
              color: "rgba(255,255,255,0.4)",
              marginTop: 1,
            }}
          >
            Members{days !== null ? ` · ${days}d left` : ""}
          </div>
        </div>

        <div
          style={{
            height: 3,
            background: "rgba(255,255,255,0.08)",
            borderRadius: 99,
            overflow: "hidden" as const,
          }}
        >
          <div
            style={{
              height: "100%",
              borderRadius: 99,
              width: `${pct}%`,
              background: `linear-gradient(90deg, ${c.prog1}, ${c.prog2})`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [streak, setStreak] = useState<number | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [postText, setPostText] = useState("");
  const [posting, setPosting] = useState(false);
  const [activeNav, setActiveNav] = useState("dashboard");

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.email) setUserEmail(user.email.split("@")[0]);

      const { data: cData } = await supabase
        .from("challenges")
        .select("*")
        .order("member_count", { ascending: false })
        .limit(6);

      setChallenges((cData as Challenge[]) || []);

      const { data: fData } = await supabase
        .from("activity_feed")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      setFeed((fData as FeedItem[]) || []);

      if (user) {
        const { data: sData } = await supabase
          .from("user_streaks")
          .select("current_streak")
          .eq("user_id", user.id)
          .single();

        setStreak(
          (sData as { current_streak: number } | null)?.current_streak ?? 0
        );
      }

      setLoading(false);
    }

    load();

    const sub = supabase
      .channel("activity_feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_feed" },
        (payload) =>
          setFeed((prev) => [payload.new as FeedItem, ...prev.slice(0, 9)])
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
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
    background:
      "linear-gradient(135deg, #d4f5e2 0%, #fde0ef 30%, #fdf6d3 60%, #d4eaf7 100%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    fontFamily: "'DM Sans', sans-serif",
  };

  // Desktop wrapper: full width on mobile, max 620px on desktop
  const desktopWrapper: CSSProperties = {
    width: "100%",
    margin: "0 auto",
    flex: 1,
    display: "flex",
    flexDirection: "column",
  };

  const colStyle: CSSProperties = {
    width: "100%",
    flex: 1,
    display: "flex",
    flexDirection: "column",
  };

  if (loading)
    return (
      <div style={{ ...pageStyle, justifyContent: "center" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 52 }}>🏳️‍🌈</div>
          <div
            style={{
              fontFamily: "'Bebas Neue', cursive",
              fontSize: 18,
              color: "#7b2d8b",
              letterSpacing: 2,
            }}
          >
            LOADING...
          </div>
        </div>
      </div>
    );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&display=swap');

        @keyframes rainbowShift { 
          0% { background-position: 0% } 
          100% { background-position: 200% } 
        }

        @keyframes slideIn { 
          from { opacity: 0; transform: translateY(10px) } 
          to { opacity: 1; transform: translateY(0) } 
        }

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; }
        ::-webkit-scrollbar { display: none; }

        .action-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          padding: 0;
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

        .action-btn:hover { 
          transform: translateY(-3px); 
          box-shadow: 0 6px 20px rgba(0,0,0,0.1); 
        }

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

        .bottom-nav {
          position: fixed;
          bottom: 0; left: 0; right: 0;
          background: rgba(14,14,14,0.85);
          backdrop-filter: blur(10px);
          padding: 12px 20px;
          padding-bottom: max(16px, env(safe-area-inset-bottom));
          display: flex; justify-content: space-around; align-items: center;
          z-index: 100;
        }

        @media (max-width: 620px) {
          .wrapper {
          max-width: none !important;
          margin: 0 !important;
           width: 100% !important;
          }
        }

                .page-padding {
          padding-left: 16px;
          padding-right: 16px;
        }

        @media (min-width: 768px) {
          .page-padding {
            padding-left: 24px;
            padding-right: 24px;
          }
        }

        @media (min-width: 621px) {
          .bottom-nav {
            position: sticky;
            bottom: 0;
            border-radius: 0;
          }
        }
      `}</style>

      <div style={pageStyle}>
        {/* Full-width rainbow strip at top */}
        <div
          style={{
            height: 12,
            width: "100%",
            background:
              "linear-gradient(90deg,#ff3c5f,#ff8c42,#ffd166,#06d6a0,#118ab2,#7b2d8b,#ff3c5f)",
            backgroundSize: "200% 100%",
            animation: "rainbowShift 4s linear infinite",
            flexShrink: 0,
          }}
        />

        <div className="wrapper" style={desktopWrapper}>
          <div style={colStyle}>
            {/* Scrollable content */}
           <div className="page-padding" style={{ flex: 1, overflowY: "auto", paddingBottom: 90 }}>
              {/* Wordmark */}
              <div style={{ padding: "16px 16px 8px" }}>
                <div
                  style={{
                    fontFamily: "'Bebas Neue', cursive",
                    fontSize: 13,
                    letterSpacing: 2.5,
                    color: "#7b2d8b",
                    opacity: 0.8,
                  }}
                >
                  QUEERS & ALLIES FITNESS
                </div>
              </div>

              {/* Hero banner */}
              <div
                style={{
                  margin: "0",
                  background: "#0e0e0e",
                  borderRadius: 22,
                  padding: "24px 22px",
                  position: "relative",
                  overflow: "hidden",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    bottom: -40,
                    right: -40,
                    width: 160,
                    height: 160,
                    borderRadius: "50%",
                    background:
                      "linear-gradient(135deg,#7b2d8b,#ff3c5f)",
                    opacity: 0.2,
                  }}
                />

                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: 2,
                    textTransform: "uppercase",
                    color: "#ffd166",
                    marginBottom: 10,
                  }}
                >
                  ⚡ Welcome back
                  {userEmail ? `, ${userEmail}` : ""}
                </div>

                <div
                  style={{
                    fontFamily: "'Bebas Neue', cursive",
                    fontSize: 40,
                    lineHeight: 1.0,
                    color: "#fff",
                  }}
                >
                  Building
                  <br />
                  <span
                    style={{
                      background:
                        "linear-gradient(90deg,#ffd166,#06d6a0)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    Community
                  </span>
                  <br />
                  Strength.
                </div>

                <div
                  style={{
                    fontSize: 12,
                    color: "rgba(255,255,255,0.5)",
                    marginTop: 10,
                    fontWeight: 500,
                  }}
                >
                  Physical Fitness + Mental Health · Sacramento, CA
                </div>

                {/* Hero pill */}
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    marginTop: 14,
                    background: "rgba(255,255,255,0.09)",
                    border: "1px solid rgba(255,255,255,0.14)",
                    borderRadius: 20,
                    padding: "6px 14px",
                    fontSize: 12,
                    color: "rgba(255,255,255,0.75)",
                  }}
                >
                  🏆&nbsp;
                  <span
                    style={{
                      color: "#06d6a0",
                      fontWeight: 700,
                    }}
                  >
                    {challenges.length} active challenges
                  </span>
                  &nbsp;this week
                </div>
              </div>

              {/* Quick actions */}
              <div className="action-grid">
                {ACTIONS.map((btn) => (
                  <div
                    key={btn.label}
                    className="action-btn"
                    onClick={() => {
                      if (btn.label === "New Challenge") router.push("/embed/challenges/new");
                      if (btn.label === "Join") router.push("/embed/join");
                      if (btn.label === "View All") router.push("/embed/challenges");
                      if (btn.label === "Leaderboard") router.push("/embed/leaderboard");
                    }}
                  >
                    <div
                      className="action-icon"
                      style={{ background: btn.bg }}
                    >
                      {btn.icon}
                    </div>
                    <div className="action-label">{btn.label}</div>
                  </div>
                ))}
              </div>


              {/* Featured Challenges */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "4px 16px 12px",
                }}
              >
                <div
                  style={{
                    fontFamily: "'Bebas Neue', cursive",
                    fontSize: 22,
                    letterSpacing: 1,
                  }}
                >
                  Featured Challenges
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#7b2d8b",
                    cursor: "pointer",
                  }}
                >
                  See all →
                </div>
              </div>

              {/* Challenge cards — one column, edge-to-edge */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr",
                  gap: 12,
                  padding: "0",
                }}
              >
                {challenges.slice(0, 2).map((c, i) => (
                  <ChallengeCard
                    key={c.id}
                    challenge={c}
                    colorIndex={i}
                  />
                ))}
              </div>

              {/* Activity Feed header */}
              <div
                style={{
                  margin: "20px 0 0",
                  height: 1.5,
                  background:
                    "linear-gradient(90deg,#ff3c5f,#ff8c42,#ffd166,#06d6a0,#118ab2,#7b2d8b)",
                  opacity: 0.25,
                  borderRadius: 2,
                }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px 0 0",
                }}
              >
                <div
                  style={{
                    fontFamily: "'Bebas Neue', cursive",
                    fontSize: 22,
                    letterSpacing: 1,
                  }}
                >
                  Activity Feed
                </div>
              </div>

              {/* Post input */}
              <div
                style={{
                  padding: "10px 0 12px",
                  display: "flex",
                  gap: 8,
                }}
              >
                <input
                  value={postText}
                  onChange={(e) => setPostText(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && handlePost()
                  }
                  placeholder="Post a shoutout to the community…"
                  style={{
                    flex: 1,
                    fontSize: 13,
                    padding: "10px 16px",
                    borderRadius: 24,
                    border: "none",
                    outline: "none",
                    background: "rgba(255,255,255,0.85)",
                    backdropFilter: "blur(8px)",
                    boxShadow:
                      "0 2px 8px rgba(0,0,0,0.07)",
                  }}
                />

                <button
                  onClick={handlePost}
                  disabled={posting || !postText.trim()}
                  style={{
                    background:
                      posting || !postText.trim()
                        ? "rgba(0,0,0,0.15)"
                        : "#0e0e0e",
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 700,
                    padding: "10px 20px",
                    borderRadius: 24,
                    border: "none",
                    cursor:
                      posting || !postText.trim()
                        ? "default"
                        : "pointer",
                    flexShrink: 0,
                    transition: "background 0.15s",
                  }}
                >
                  {posting ? "…" : "Post"}
                </button>
              </div>

              {/* Feed items */}
              <div
                style={{
                  padding: "0 0 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {feed.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "32px 0",
                      color: "#999",
                      fontSize: 13,
                    }}
                  >
                    No activity yet — be the first to post! 🌈
                  </div>
                ) : (
                  feed.map((item, i) => (
                    <FeedCard
                      key={item.id}
                      item={item}
                      index={i}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Bottom nav */}
            <div className="bottom-nav">
              {(
                [
                  { id: "ranks", icon: "🏅", label: "Ranks" },
                  {
                    id: "dashboard",
                    icon: "🏳️‍🌈",
                    label: "Dashboard",
                  },
                  {
                    id: "streak",
                    icon: "🔥",
                    label: "Streak",
                    sub:
                      streak !== null ? `${streak}d` : "",
                  },
                  {
                    id: "messages",
                    icon: "💬",
                    label: "Messages",
                  },
                ] as const
              ).map((nav) => (
                <div
                  key={nav.id}
                  onClick={() => setActiveNav(nav.id)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                    cursor: "pointer",
                    padding: "6px 12px",
                    borderRadius: 12,
                    background:
                      activeNav === nav.id
                        ? "rgba(255,255,255,0.07)"
                        : "transparent",
                    transition: "background 0.15s",
                  }}
                >
                  {nav.id === "dashboard" ? (
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        background:
                          activeNav === "dashboard"
                            ? "linear-gradient(135deg,#7b2d8b,#ff3c5f)"
                            : "rgba(255,255,255,0.1)",
                        borderRadius: 10,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 19,
                        transition: "background 0.15s",
                      }}
                    >
                      🏳️‍🌈
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 21,
                          lineHeight: 1,
                        }}
                      >
                        {nav.icon}
                      </div>
                      {"sub" in nav && nav.sub && (
                        <div
                          style={{
                            fontFamily:
                              "'Bebas Neue', cursive",
                            fontSize: 11,
                            color: "#ffd166",
                            lineHeight: 1,
                          }}
                        >
                          {nav.sub}
                        </div>
                      )}
                    </div>
                  )}

                  <div
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: 0.5,
                      color:
                        activeNav === nav.id
                          ? "#ffd166"
                          : "rgba(255,255,255,0.45)",
                    }}
                  >
                    {nav.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
