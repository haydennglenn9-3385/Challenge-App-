"use client";
// app/embed/dashboard/page.tsx — Queers & Allies Fitness Dashboard
import { useEffect, useState, CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────
type FeedType = "streak" | "score" | "team" | "message" | "join";

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
  user_id: string | null;
  user_name: string;
  emoji_avatar: string | null;
  type: FeedType;
  text: string;
  meta: Record<string, unknown>;
  reactions: Record<string, string[]>;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const TYPE_FALLBACK_EMOJI: Record<FeedType, string> = {
  streak:  "🔥",
  score:   "⚡",
  team:    "🏆",
  message: "💬",
  join:    "🎉",
};

const AVATAR_COLORS: Record<FeedType, string> = {
  streak:  "#fff3e0",
  score:   "#e8d9f7",
  team:    "#fde0ef",
  message: "#d4eaf7",
  join:    "#d4f5e2",
};

const QUICK_REACTIONS = ["🔥", "💜", "💪", "🌈", "🎉", "👏", "👎", "😭", "😂"];

const ACTIONS = [
  { icon: "➕", label: "New Challenge", iconBg: "#fde0ef", route: "/embed/challenges/new" },
  { icon: "🔥", label: "My Streak",     iconBg: "#fde0ef", route: "/embed/profile"       },
  { icon: "⚡", label: "My Challenges", iconBg: "#d4f5e2", route: "/embed/challenges?filter=mine" },
  { icon: "🏆", label: "My Teams",      iconBg: "#e8d9f7", route: "/embed/teams"         },
];

const CARD_COLORS = [
  { glow: "#ff3c5f", prog1: "#ff3c5f", prog2: "#ffd166", valColor: "#ffd166" },
  { glow: "#06d6a0", prog1: "#06d6a0", prog2: "#118ab2", valColor: "#06d6a0" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function daysLeft(endDate?: string) {
  if (!endDate) return null;
  const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000);
  return diff > 0 ? diff : 0;
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── Date Section Grouping ────────────────────────────────────────────────────
function getDateLabel(iso: string): "Today" | "Yesterday" | "Earlier" {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86400000;
  const itemDay = new Date(new Date(iso).toDateString()).getTime();
  if (itemDay === today) return "Today";
  if (itemDay === yesterday) return "Yesterday";
  return "Earlier";
}

type FeedGroup = { label: string; items: FeedItem[] };

function groupFeedByDate(feed: FeedItem[]): FeedGroup[] {
  const order: string[] = ["Today", "Yesterday", "Earlier"];
  const map = new Map<string, FeedItem[]>();
  for (const item of feed) {
    const label = getDateLabel(item.created_at);
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(item);
  }
  return order
    .filter((label) => map.has(label))
    .map((label) => ({ label, items: map.get(label)! }));
}

// ─── App Check-in Streak ──────────────────────────────────────────────────────
// Reads/writes app_streak + app_last_checkin on the users table.
// Call once on load after confirming the user is authenticated.
async function handleAppCheckin(
  userId: string
): Promise<{ appStreak: number; isNewStreak: boolean }> {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const { data } = await supabase
    .from("users")
    .select("app_streak, app_last_checkin")
    .eq("id", userId)
    .single();

  const lastCheckin: string | null = data?.app_last_checkin ?? null;
  const currentStreak: number = data?.app_streak ?? 0;

  // Already checked in today — no change
  if (lastCheckin === today) {
    return { appStreak: currentStreak, isNewStreak: false };
  }

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const newStreak = lastCheckin === yesterday ? currentStreak + 1 : 1;
  const isNewStreak = newStreak > currentStreak;

  await supabase
    .from("users")
    .update({ app_streak: newStreak, app_last_checkin: today })
    .eq("id", userId);

  return { appStreak: newStreak, isNewStreak };
}

// ─── Feed Reactions ───────────────────────────────────────────────────────────
function FeedReactions({
  item,
  currentUserId,
  onReact,
}: {
  item: FeedItem;
  currentUserId: string | null;
  onReact: (itemId: string, emoji: string) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const reactions = item.reactions || {};
  const hasAny = Object.keys(reactions).some((e) => reactions[e]?.length > 0);

  return (
    <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      {Object.entries(reactions).map(([emoji, users]) =>
        users.length > 0 ? (
          <button
            key={emoji}
            onClick={() => currentUserId && onReact(item.id, emoji)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 9px",
              borderRadius: 20,
              border: currentUserId && users.includes(currentUserId)
                ? "1.5px solid #7b2d8b"
                : "1.5px solid #e5e7eb",
              background: currentUserId && users.includes(currentUserId)
                ? "rgba(123,45,139,0.07)"
                : "rgba(255,255,255,0.6)",
              cursor: currentUserId ? "pointer" : "default",
              fontSize: 13,
              fontWeight: 700,
              color: "#444",
              transition: "all 0.15s",
            }}
          >
            <span>{emoji}</span>
            <span style={{ fontSize: 11, color: "#888" }}>{users.length}</span>
          </button>
        ) : null
      )}
      {currentUserId && (
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowPicker((v) => !v)}
            style={{
              padding: "3px 9px",
              borderRadius: 20,
              border: "1.5px dashed #ccc",
              background: "transparent",
              cursor: "pointer",
              fontSize: 13,
              color: "#aaa",
            }}
          >
            {hasAny ? "+" : "React"}
          </button>
          {showPicker && (
            <div
              style={{
                position: "absolute",
                bottom: "calc(100% + 6px)",
                left: 0,
                background: "#fff",
                borderRadius: 16,
                boxShadow: "0 4px 24px rgba(0,0,0,0.13)",
                padding: "8px 10px",
                display: "flex",
                gap: 6,
                zIndex: 50,
                border: "1px solid #f0f0f0",
              }}
            >
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => { onReact(item.id, emoji); setShowPicker(false); }}
                  style={{ fontSize: 20, background: "none", border: "none", cursor: "pointer", borderRadius: 8, padding: 4, transition: "transform 0.1s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.25)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Differentiated Feed Card Components ─────────────────────────────────────
type FeedCardProps = {
  item: FeedItem;
  currentUserId: string | null;
  onReact: (itemId: string, emoji: string) => void;
  onProfileClick: (userId: string) => void;
};

function AvatarButton({
  item,
  bg,
  onProfileClick,
}: {
  item: FeedItem;
  bg: string;
  onProfileClick: (id: string) => void;
}) {
  const emoji = item.emoji_avatar || TYPE_FALLBACK_EMOJI[item.type];
  return (
    <button
      onClick={() => item.user_id && onProfileClick(item.user_id)}
      disabled={!item.user_id}
      style={{
        width: 42, height: 42, borderRadius: "50%", background: bg,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 20, flexShrink: 0, border: "none",
        cursor: item.user_id ? "pointer" : "default",
        transition: "transform 0.15s", marginTop: 1,
      }}
      onMouseEnter={(e) => item.user_id && ((e.currentTarget as HTMLButtonElement).style.transform = "scale(1.1)")}
      onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.transform = "scale(1)")}
    >
      {emoji}
    </button>
  );
}

function NameButton({ item, onProfileClick }: { item: FeedItem; onProfileClick: (id: string) => void }) {
  return (
    <button
      onClick={() => item.user_id && onProfileClick(item.user_id)}
      disabled={!item.user_id}
      style={{ background: "none", border: "none", padding: 0, cursor: item.user_id ? "pointer" : "default", fontSize: 13, fontWeight: 700, color: "#0e0e0e", textAlign: "left" }}
    >
      {item.user_name}
    </button>
  );
}

// 🔥 Streak Card — bold fire, streak counter badge
function StreakCard({ item, currentUserId, onReact, onProfileClick }: FeedCardProps) {
  const days = (item.meta?.days as number) || 0;
  return (
    <div
      style={{
        background: "linear-gradient(135deg, rgba(255,147,0,0.07) 0%, rgba(255,60,95,0.04) 100%)",
        borderRadius: 18, padding: "14px", border: "1px solid rgba(255,147,0,0.15)",
        boxShadow: "0 2px 10px rgba(255,100,0,0.06)", transition: "transform 0.15s",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "translateX(3px)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "translateX(0)"; }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <AvatarButton item={item} bg="#fff3e0" onProfileClick={onProfileClick} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <NameButton item={item} onProfileClick={onProfileClick} />
          <div style={{ fontSize: 12, color: "#555", marginTop: 2, lineHeight: 1.4 }}>{item.text}</div>
          <div style={{ fontSize: 10, color: "#bbb", marginTop: 3 }}>{timeAgo(item.created_at)}</div>
          <FeedReactions item={item} currentUserId={currentUserId} onReact={onReact} />
        </div>
        {days > 0 && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            background: "#fff3e0", borderRadius: 14, padding: "8px 12px", flexShrink: 0,
            border: "1px solid rgba(255,147,0,0.2)",
          }}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>🔥</span>
            <span style={{ fontFamily: "var(--font-bebas, 'Bebas Neue', sans-serif)", fontSize: 24, color: "#e65100", lineHeight: 1.1 }}>{days}</span>
            <span style={{ fontSize: 9, color: "#e65100", fontWeight: 700, letterSpacing: 0.5 }}>DAYS</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ⚡ Score Card — metric-forward, purple accent
function ScoreCard({ item, currentUserId, onReact, onProfileClick }: FeedCardProps) {
  const rank = item.meta?.rank as number | undefined;
  return (
    <div
      style={{
        background: "rgba(123,45,139,0.04)", borderRadius: 18, padding: "14px",
        border: "1px solid rgba(123,45,139,0.12)", boxShadow: "0 2px 10px rgba(123,45,139,0.06)",
        transition: "transform 0.15s",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "translateX(3px)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "translateX(0)"; }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 11 }}>
        <AvatarButton item={item} bg="#e8d9f7" onProfileClick={onProfileClick} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <NameButton item={item} onProfileClick={onProfileClick} />
          <div style={{ fontSize: 12, color: "#555", marginTop: 2, lineHeight: 1.4 }}>{item.text}</div>
          <div style={{ fontSize: 10, color: "#bbb", marginTop: 3 }}>{timeAgo(item.created_at)}</div>
          <FeedReactions item={item} currentUserId={currentUserId} onReact={onReact} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
          <span style={{ background: "#e8d9f7", color: "#7b2d8b", fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 20, whiteSpace: "nowrap" }}>⚡ Score</span>
          {rank && <span style={{ fontFamily: "var(--font-bebas, 'Bebas Neue', sans-serif)", fontSize: 15, color: "#7b2d8b" }}>#{rank}</span>}
        </div>
      </div>
    </div>
  );
}

// ✅ Join Card — celebratory, green, welcoming
function JoinCard({ item, currentUserId, onReact, onProfileClick }: FeedCardProps) {
  const challengeName = item.meta?.challenge_name as string | undefined;
  return (
    <div
      style={{
        background: "rgba(27,122,78,0.04)", borderRadius: 18, padding: "14px",
        border: "1px solid rgba(6,214,160,0.2)", boxShadow: "0 2px 10px rgba(6,214,160,0.07)",
        transition: "transform 0.15s",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "translateX(3px)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "translateX(0)"; }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 11 }}>
        <AvatarButton item={item} bg="#d4f5e2" onProfileClick={onProfileClick} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <NameButton item={item} onProfileClick={onProfileClick} />
            <span style={{ background: "#d4f5e2", color: "#1b7a4e", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>✅ Joined</span>
          </div>
          <div style={{ fontSize: 12, color: "#555", marginTop: 3, lineHeight: 1.4 }}>{item.text}</div>
          {challengeName && (
            <div style={{ fontSize: 11, color: "#06d6a0", fontWeight: 600, marginTop: 2 }}>
              {challengeName}
            </div>
          )}
          <div style={{ fontSize: 10, color: "#bbb", marginTop: 3 }}>{timeAgo(item.created_at)}</div>
          <FeedReactions item={item} currentUserId={currentUserId} onReact={onReact} />
        </div>
      </div>
    </div>
  );
}

// 🏆 Team Card — bold, ranking-forward, pink-red accent
function TeamCard({ item, currentUserId, onReact, onProfileClick }: FeedCardProps) {
  const rank = item.meta?.rank as number | undefined;
  return (
    <div
      style={{
        background: "rgba(181,0,60,0.03)", borderRadius: 18, padding: "14px",
        border: "1px solid rgba(255,60,95,0.14)", boxShadow: "0 2px 10px rgba(255,60,95,0.06)",
        transition: "transform 0.15s",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "translateX(3px)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "translateX(0)"; }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 11 }}>
        <AvatarButton item={item} bg="#fde0ef" onProfileClick={onProfileClick} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <NameButton item={item} onProfileClick={onProfileClick} />
          <div style={{ fontSize: 12, color: "#555", marginTop: 2, lineHeight: 1.4 }}>{item.text}</div>
          <div style={{ fontSize: 10, color: "#bbb", marginTop: 3 }}>{timeAgo(item.created_at)}</div>
          <FeedReactions item={item} currentUserId={currentUserId} onReact={onReact} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
          <span style={{ background: "#fde0ef", color: "#b5003c", fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 20, whiteSpace: "nowrap" }}>🏆 Team</span>
          {rank && <span style={{ fontFamily: "var(--font-bebas, 'Bebas Neue', sans-serif)", fontSize: 15, color: "#b5003c" }}>#{rank}</span>}
        </div>
      </div>
    </div>
  );
}

// 💬 Message Card — speech-bubble shape, clean white, conversational
function MessageCard({ item, currentUserId, onReact, onProfileClick }: FeedCardProps) {
  return (
    <div
      style={{
        background: "#ffffff",
        // Speech bubble: flat bottom-left corner
        borderRadius: "18px 18px 18px 4px",
        padding: "13px 14px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
        border: "1px solid rgba(17,138,178,0.1)",
        transition: "transform 0.15s, box-shadow 0.15s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateX(3px)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 18px rgba(0,0,0,0.09)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateX(0)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 10px rgba(0,0,0,0.06)";
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 11 }}>
        <AvatarButton item={item} bg="#d4eaf7" onProfileClick={onProfileClick} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <NameButton item={item} onProfileClick={onProfileClick} />
            <span style={{ fontSize: 10, color: "#bbb" }}>{timeAgo(item.created_at)}</span>
          </div>
          <div style={{ fontSize: 13, color: "#333", marginTop: 4, lineHeight: 1.5, fontStyle: "italic" }}>
            {item.text}
          </div>
          <FeedReactions item={item} currentUserId={currentUserId} onReact={onReact} />
        </div>
      </div>
    </div>
  );
}

// ─── FeedCard Dispatcher ──────────────────────────────────────────────────────
function FeedCard(props: FeedCardProps) {
  switch (props.item.type) {
    case "streak":  return <StreakCard  {...props} />;
    case "score":   return <ScoreCard   {...props} />;
    case "join":    return <JoinCard    {...props} />;
    case "team":    return <TeamCard    {...props} />;
    case "message": return <MessageCard {...props} />;
    default:        return <MessageCard {...props} />;
  }
}

// ─── Date Section Header ──────────────────────────────────────────────────────
function DateSectionHeader({ label }: { label: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, padding: "8px 0 4px",
    }}>
      <div style={{ flex: 1, height: 1, background: "rgba(0,0,0,0.06)", borderRadius: 2 }} />
      <span style={{
        fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
        textTransform: "uppercase", color: "#aaa", flexShrink: 0,
      }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: "rgba(0,0,0,0.06)", borderRadius: 2 }} />
    </div>
  );
}

// ─── Challenge Card ───────────────────────────────────────────────────────────
function ChallengeCard({
  challenge,
  colorIndex,
  onClick,
}: {
  challenge: Challenge;
  colorIndex: number;
  onClick: () => void;
}) {
  const c = CARD_COLORS[colorIndex % CARD_COLORS.length];
  const pct = challenge.capacity > 0
    ? Math.round((challenge.member_count / challenge.capacity) * 100)
    : 0;
  const days = daysLeft(challenge.end_date);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      style={{
        background: "#1a1a1a", borderRadius: 18, padding: "16px 14px",
        position: "relative", overflow: "hidden", cursor: "pointer",
        transform: hovered ? "scale(1.02)" : "scale(1)",
        transition: "transform 0.15s", height: 190,
        display: "flex", flexDirection: "column", justifyContent: "space-between",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ position: "absolute", top: -16, right: -16, width: 72, height: 72, borderRadius: "50%", background: c.glow, opacity: 0.2 }} />
      <div>
        <div style={{ fontSize: 20, marginBottom: 6 }}>{challenge.emoji || "💪"}</div>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>
          {challenge.type}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
          {challenge.name}
        </div>
      </div>
      <div>
        <div style={{ background: "rgba(255,255,255,0.09)", borderRadius: 10, padding: "8px 10px", marginBottom: 8 }}>
          <div style={{ fontFamily: "var(--font-inter), system-ui, sans-serif", fontSize: 15, color: c.valColor }}>
            {challenge.member_count} / {challenge.capacity}
          </div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>
            Members{days !== null ? ` · ${days}d left` : ""}
          </div>
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
  const [challenges, setChallenges]         = useState<Challenge[]>([]);
  const [feed, setFeed]                     = useState<FeedItem[]>([]);
  const [userEmail, setUserEmail]           = useState<string>("");
  const [userStreak, setUserStreak]         = useState<number>(0);
  const [appStreak, setAppStreak]           = useState<number>(0);
  const [loading, setLoading]               = useState(true);
  const [postText, setPostText]             = useState("");
  const [posting, setPosting]               = useState(false);
  const [authed, setAuthed]                 = useState(false);
  const [currentUserId, setCurrentUserId]   = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        setAuthed(true);
        setCurrentUserId(user.id);
        if (user?.email) setUserEmail(user.email.split("@")[0]);

        // Challenge streak
        const { data: sData } = await supabase
          .from("users")
          .select("streak")
          .eq("id", user.id)
          .single();
        if (sData) setUserStreak(sData.streak || 0);

        // App check-in streak (separate from challenge streak)
        const { appStreak: streak } = await handleAppCheckin(user.id);
        setAppStreak(streak);
      }

      // ─── BUG FIX ──────────────────────────────────────────────────────────
      // Previously: select("*, users(emoji_avatar)") — the relational join on
      // the users table was blocked by RLS, silently returning null for the
      // entire query. emoji_avatar is already a column on activity_feed itself.
      const { data: fData } = await supabase
        .from("activity_feed")
        .select("*")                          // ← fixed: no join needed
        .order("created_at", { ascending: false })
        .limit(30);

      setFeed(
        (fData || []).map((row: any) => ({
          ...row,
          emoji_avatar: row.emoji_avatar ?? null,  // ← fixed: read from row directly
          reactions: row.reactions ?? {},
        })) as FeedItem[]
      );
      // ──────────────────────────────────────────────────────────────────────

      const { data: cData } = await supabase
        .from("challenges")
        .select("*, challenge_members(count)")
        .order("created_at", { ascending: false })
        .limit(6);

      setChallenges(
        (cData || []).map((c: any) => ({
          ...c,
          member_count: c.challenge_members?.[0]?.count ?? 0,
        })) as Challenge[]
      );

      setLoading(false);
    }

    load();

    const sub = supabase
      .channel("activity_feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_feed" },
        (payload) => setFeed((prev) => [payload.new as FeedItem, ...prev.slice(0, 29)])
      )
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, []);

  async function handlePost() {
    if (!postText.trim()) return;
    setPosting(true);
    await supabase.from("activity_feed").insert({
      user_id: currentUserId,
      user_name: userEmail || "Member",
      type: "message",
      text: `"${postText.trim()}"`,
      meta: {},
    });
    setPostText("");
    setPosting(false);
  }

  async function handleReact(itemId: string, emoji: string) {
    if (!currentUserId) return;
    // Optimistic update
    setFeed((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const existing = item.reactions[emoji] ?? [];
        const hasReacted = existing.includes(currentUserId);
        return {
          ...item,
          reactions: {
            ...item.reactions,
            [emoji]: hasReacted
              ? existing.filter((id) => id !== currentUserId)
              : [...existing, currentUserId],
          },
        };
      })
    );
    // Persist
    const { data } = await supabase
      .from("activity_feed")
      .select("reactions")
      .eq("id", itemId)
      .single();
    const current: Record<string, string[]> = data?.reactions ?? {};
    const existing = current[emoji] ?? [];
    const hasReacted = existing.includes(currentUserId);
    await supabase
      .from("activity_feed")
      .update({
        reactions: {
          ...current,
          [emoji]: hasReacted
            ? existing.filter((id) => id !== currentUserId)
            : [...existing, currentUserId],
        },
      })
      .eq("id", itemId);
  }

  function handleProfileClick(userId: string) {
    router.push(`/embed/profile/${userId}`);
  }

  const feedGroups = groupFeedByDate(feed);

  const pageStyle: CSSProperties = {
    minHeight: "100dvh",
    width: "100%",
    background: "linear-gradient(135deg, #d4f5e2 0%, #fde0ef 30%, #fdf6d3 60%, #d4eaf7 100%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    fontFamily: "var(--font-inter), system-ui, sans-serif",
  };

  if (loading) return (
    <div style={{ ...pageStyle, justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <div style={{ fontSize: 52 }}>🏳️‍🌈</div>
        <div style={{ fontFamily: "var(--font-inter), system-ui, sans-serif", fontSize: 18, color: "#7b2d8b", letterSpacing: 2 }}>
          LOADING...
        </div>
      </div>
    </div>
  );

  // App streak context string for the hero
  const streakContext = appStreak >= 3
    ? `🔥 ${appStreak}-day streak`
    : appStreak === 2
    ? "🔥 2 days in a row"
    : null;

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
          position: absolute; inset: 0; z-index: 10;
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; gap: 12px; padding: 24px;
        }
        .feed-auth-card {
          background: rgba(255,255,255,0.92); backdrop-filter: blur(16px);
          border-radius: 20px; padding: 24px 20px; text-align: center;
          box-shadow: 0 8px 32px rgba(0,0,0,0.12); width: 100%; max-width: 280px;
        }
        .login-btn {
          display: inline-block; margin-top: 14px; padding: 12px 28px;
          border-radius: 14px; border: none;
          background: linear-gradient(135deg, #7b2d8b, #ff3c5f);
          color: #fff; font-size: 14px; font-weight: 700;
          font-family: var(--font-inter), system-ui, sans-serif;
          cursor: pointer; width: 100%;
        }
      `}</style>

      <div style={pageStyle}>
        {/* Rainbow strip */}
        <div style={{
          height: 12, width: "100%",
          background: "linear-gradient(90deg,#ff3c5f,#ff8c42,#ffd166,#06d6a0,#118ab2,#7b2d8b,#ff3c5f)",
          backgroundSize: "200% 100%", animation: "rainbowShift 4s linear infinite", flexShrink: 0,
        }} />

        <div className="page-padding" style={{ width: "100%", flex: 1, overflowY: "auto", paddingBottom: 112 }}>
          {/* Wordmark */}
          <div style={{ padding: "16px 0 8px" }}>
            <div style={{ fontFamily: "var(--font-inter), system-ui, sans-serif", fontSize: 13, letterSpacing: 2.5, color: "#7b2d8b", opacity: 0.8 }}>
              QUEERS & ALLIES FITNESS
            </div>
          </div>

          {/* Hero banner */}
          <div style={{ background: "#0e0e0e", borderRadius: 22, padding: "24px 22px", position: "relative", overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
            <div style={{ position: "absolute", bottom: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: "linear-gradient(135deg,#7b2d8b,#ff3c5f)", opacity: 0.2 }} />
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#ffd166", marginBottom: 10 }}>
              ⚡ Welcome back{userEmail ? `, ${userEmail}` : ""}
              {streakContext && (
                <span style={{ marginLeft: 8, color: "#ff8c42" }}>· {streakContext}</span>
              )}
            </div>
            <a
              href="https://queersandalliesfitness.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "none" }}
            >
              <div style={{ fontFamily: "var(--font-inter), system-ui, sans-serif", fontSize: 40, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.0, color: "#fff" }}>
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
            <div style={{ fontFamily: "var(--font-inter), system-ui, sans-serif", fontSize: 22, letterSpacing: 1 }}>Featured Challenges</div>
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

          {/* Activity Feed header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0 0" }}>
            <div style={{ fontFamily: "var(--font-inter), system-ui, sans-serif", fontSize: 22, letterSpacing: 1 }}>Activity Feed</div>
          </div>

          {/* Post input */}
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

          {/* Feed */}
          <div style={{ position: "relative", paddingBottom: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, filter: authed ? "none" : "blur(4px)", pointerEvents: authed ? "auto" : "none", userSelect: authed ? "auto" : "none" }}>
              {feed.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: "#999", fontSize: 13 }}>
                  No activity yet — be the first to post! 🌈
                </div>
              ) : (
                feedGroups.map((group) => (
                  <div key={group.label}>
                    <DateSectionHeader label={group.label} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                      {group.items.map((item) => (
                        <FeedCard
                          key={item.id}
                          item={item}
                          currentUserId={currentUserId}
                          onReact={handleReact}
                          onProfileClick={handleProfileClick}
                        />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Login overlay */}
            {!authed && (
              <div className="feed-blur-overlay">
                <div className="feed-auth-card">
                  <div style={{ fontSize: 36, marginBottom: 8 }}>🏳️‍🌈</div>
                  <div style={{ fontFamily: "var(--font-inter), system-ui, sans-serif", fontSize: 20, color: "#0e0e0e", letterSpacing: 1 }}>
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