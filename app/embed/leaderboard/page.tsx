"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import PRLogModal from "@/components/PRLogModal";

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = "global" | "challenges" | "prs";
type PRCategory = "strength" | "cardio" | "endurance" | "custom";

interface GlobalUser {
  id: string;
  name: string;
  avatar_emoji: string;
  global_points: number;
  streak: number;
}

interface UserChallenge {
  id: string;
  name: string;
  emoji?: string;
  mode: string;
  has_teams: boolean;
  end_date: string;
  scoring_type: string;
  target_unit: string | null;
}

interface ChallengeStanding {
  user_id: string;
  name: string;
  avatar_emoji: string;
  metric: number;       // sum of reps_completed (the actual measured value)
  points: number;       // sum of points_earned (local challenge pts)
  streak: number;
}

interface TeamStanding {
  id: string;
  name: string;
  color: string;
  total_metric: number;
  avg_metric: number;
  total_points: number;
  member_count: number;
}

interface PRRecord {
  id: string;
  user_id: string;
  user_name?: string;
  user_avatar?: string;
  type: PRCategory;
  label: string;
  value: number;
  unit: string;
  date: string;
  previous_value?: number;
  notes?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const PR_CATEGORIES: { value: PRCategory; label: string; icon: string }[] = [
  { value: "strength",  label: "Strength",  icon: "💪" },
  { value: "cardio",    label: "Cardio",    icon: "🏃" },
  { value: "endurance", label: "Endurance", icon: "⏱️" },
  { value: "custom",    label: "Custom",    icon: "⭐" },
];

const MEDALS = ["🥇", "🥈", "🥉"];

function getMedal(rank: number) {
  return MEDALS[rank - 1] ?? null;
}

function getAvatar(emoji: string, name: string) {
  return emoji || name?.[0]?.toUpperCase() || "?";
}

// ─── Metric helpers ───────────────────────────────────────────────────────────
/**
 * Returns the display unit for a challenge's metric.
 * Falls back to the scoring_type label when target_unit is not set.
 */
function getMetricUnit(challenge: UserChallenge): string {
  if (challenge.target_unit) return challenge.target_unit;
  switch (challenge.scoring_type) {
    case "reps":      return "reps";
    case "time":      return "min";
    case "distance":  return "units";
    case "weight":    return "lbs";
    case "points":    return "pts";
    default:          return "pts";
  }
}

/**
 * Formats the primary metric value for display.
 * Time challenges: treat the stored value as minutes → "Xh Ym" if ≥ 60.
 */
function formatMetric(value: number, challenge: UserChallenge): string {
  const unit = getMetricUnit(challenge);

  if (challenge.scoring_type === "time") {
    switch (challenge.target_unit) {
      case "sec":
        if (value >= 3600) {
          const h = Math.floor(value / 3600);
          const m = Math.floor((value % 3600) / 60);
          const s = Math.round(value % 60);
          return m > 0 || s > 0 ? `${h}h ${m}m ${s}s` : `${h}h`;
        }
        if (value >= 60) {
          const m = Math.floor(value / 60);
          const s = Math.round(value % 60);
          return s > 0 ? `${m}m ${s}s` : `${m}m`;
        }
        return `${Math.round(value)}s`;

      case "min":
        if (value >= 60) {
          const h = Math.floor(value / 60);
          const m = Math.round(value % 60);
          return m > 0 ? `${h}h ${m}m` : `${h}h`;
        }
        return `${value % 1 === 0 ? value : value.toFixed(1)}m`;

      case "hr":
        if (value >= 1) {
          const h = Math.floor(value);
          const m = Math.round((value % 1) * 60);
          return m > 0 ? `${h}h ${m}m` : `${h}h`;
        }
        return `${Math.round(value * 60)}m`;

      default:
        return `${value % 1 === 0 ? value : value.toFixed(1)} min`;
    }
  }

  const display = Number.isInteger(value) ? value.toLocaleString() : value.toFixed(1);
  return `${display} ${unit}`;
}

/**
 * Whether this challenge should rank by the raw metric (reps/time/distance/weight)
 * or by local points_earned.
 */
function ranksByMetric(challenge: UserChallenge): boolean {
  return ["reps", "time", "distance", "weight"].includes(challenge.scoring_type);
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function RankRow({
  rank, name, avatar, primary, secondary, isMe, userId, onNavigate,
}: {
  rank: number;
  name: string;
  avatar: string;
  primary: string;
  secondary: string;
  isMe?: boolean;
  userId?: string;         // ADD THIS PROP
  onNavigate?: (id: string) => void; // ADD THIS PROP
}) {
  const clickable = !!userId && !!onNavigate && !isMe;
 
  return (
    <div
      onClick={() => clickable && onNavigate!(userId!)}
      className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 last:border-0"
      style={{
        ...(isMe ? { background: "#1C1C1E", borderRadius: 0 } : {}),
        cursor: clickable ? "pointer" : "default",
        transition: "background 0.12s",
      }}
      onMouseEnter={e => { if (clickable) (e.currentTarget as HTMLElement).style.background = isMe ? "#252525" : "rgba(0,0,0,0.03)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isMe ? "#1C1C1E" : ""; }}
    >
      <div className="w-6 text-center flex-shrink-0">
        {getMedal(rank)
          ? <span className="text-base">{getMedal(rank)}</span>
          : <span className={`text-sm font-bold ${isMe ? "text-white/40" : "text-slate-400"}`}>{rank}</span>
        }
      </div>
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0"
        style={{
          background: isMe ? "linear-gradient(135deg,#ff6b9d,#667eea)" : "rgba(0,0,0,0.05)",
          border: isMe ? "none" : "1px solid rgba(0,0,0,0.06)",
        }}
      >
        {avatar}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-bold text-sm ${isMe ? "text-white" : clickable ? "text-purple-700" : "text-slate-900"}`}>
          {name}{isMe && <span className="ml-1 text-xs font-normal opacity-40">(You)</span>}
        </p>
        <p className={`text-xs mt-0.5 ${isMe ? "text-white/40" : "text-slate-400"}`}>{secondary}</p>
      </div>
      <div className="text-right">
        <p
          className="text-base font-extrabold"
          style={isMe ? {
            background: "linear-gradient(90deg,#ff6b9d,#ffdd59,#48cfad,#667eea)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          } : { color: "#0f172a" }}
        >
          {primary}
        </p>
      </div>
    </div>
  );
}

function TeamRow({
  rank, team, challenge, isFirst,
}: {
  rank: number;
  team: TeamStanding;
  challenge: UserChallenge;
  isFirst: boolean;
}) {
  const unit = getMetricUnit(challenge);
  const byMetric = ranksByMetric(challenge);
  const primaryValue = byMetric
    ? formatMetric(team.avg_metric, challenge)
    : `${team.total_points.toLocaleString()} pts`;
  const secondaryValue = byMetric
    ? `${team.total_points.toLocaleString()} pts total`
    : `${formatMetric(team.total_metric, challenge)} total`;

  return (
    <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 last:border-0">
      <span className="text-base w-6 text-center flex-shrink-0">
        {getMedal(rank) ?? <span className="text-sm font-bold text-slate-400">{rank}</span>}
      </span>
      {/* Team color dot */}
      <div
        className="w-3 h-3 rounded-full flex-shrink-0"
        style={{ background: team.color || "#6366f1" }}
      />
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-slate-900">{team.name}</p>
        <p className="text-xs text-slate-400 mt-0.5">
          {team.member_count} members · {secondaryValue}
        </p>
      </div>
      <div className="text-right">
        <p className="text-base font-extrabold text-slate-900">{primaryValue}</p>
        <p className="text-[10px] text-slate-400">avg / member</p>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function LeaderboardPage() {
  const router = useRouter();
  const [tab, setTab]         = useState<Tab>("global");
  const [userId, setUserId]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [standingsSearch, setStandingsSearch] = useState("");

  // Global tab
  const [globalUsers, setGlobalUsers] = useState<GlobalUser[]>([]);

  // Challenges tab
  const [myChallenges, setMyChallenges]             = useState<UserChallenge[]>([]);
  const [expandedChallenge, setExpandedChallenge]   = useState<string | null>(null);
  const [challengeStandings, setChallengeStandings] = useState<
    Record<string, ChallengeStanding[] | TeamStanding[]>
  >({});
  const [loadingStandings, setLoadingStandings] = useState<string | null>(null);

  // PR tab
  const [prCategory, setPrCategory]   = useState<PRCategory>("strength");
  const [communityPRs, setCommunityPRs] = useState<PRRecord[]>([]);
  const [myPRs, setMyPRs]             = useState<PRRecord[]>([]);
  const [prView, setPrView]           = useState<"community" | "mine">("community");
  const [showPRModal, setShowPRModal] = useState(false);
  const [loadingPRs, setLoadingPRs]   = useState(false);

  // ── Initial load ─────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth"); return; }
      setUserId(user.id);

      // Global standings — ranked by global_points
      const { data: users } = await supabase
        .from("users")
        .select("id, name, avatar_emoji, global_points, streak")
        .order("global_points", { ascending: false })
        .limit(50);
      setGlobalUsers(users || []);

      // User's challenges — include scoring fields
      const { data: joined } = await supabase
        .from("challenge_members")
        .select(`
          challenges(
            id, name, emoji, mode, has_teams,
            end_date, scoring_type, target_unit
          )
        `)
        .eq("user_id", user.id);

      if (joined) {
        setMyChallenges(
          joined
            .map((j: any) => j.challenges)
            .filter(Boolean)
            .sort((a: any, b: any) => {
              if (a.end_date === null) return -1;
              if (b.end_date === null) return 1;
              return new Date(b.end_date).getTime() - new Date(a.end_date).getTime();
            })
        );
      }
      setLoading(false);
    }
    load();
  }, [router]);

  // ── Load PRs ─────────────────────────────────────────────────────────────────
  const loadPRs = useCallback(async (cat: PRCategory) => {
    if (!userId) return;
    setLoadingPRs(true);

    const { data: community } = await supabase
      .from("performance_records")
      .select(`
        id, user_id, type, label, value, unit, date, previous_value, notes,
        users(name, avatar_emoji)
      `)
      .eq("type", cat)
      .eq("is_public", true)
      .order("value", { ascending: cat === "cardio" || cat === "endurance" })
      .limit(20);

    setCommunityPRs(
      (community || []).map((r: any) => ({
        ...r,
        user_name:   r.users?.name         || "Member",
        user_avatar: r.users?.avatar_emoji || "😊",
      }))
    );

    const { data: mine } = await supabase
      .from("performance_records")
      .select("id, user_id, type, label, value, unit, date, previous_value, notes")
      .eq("user_id", userId)
      .eq("type", cat)
      .order("date", { ascending: false });

    setMyPRs((mine || []).map((r: any) => ({ ...r })));
    setLoadingPRs(false);
  }, [userId]);

  useEffect(() => {
    if (tab === "prs" && userId) loadPRs(prCategory);
  }, [tab, prCategory, userId, loadPRs]);

  // ── Load challenge standings ──────────────────────────────────────────────────
  const loadChallengeStandings = async (challenge: UserChallenge) => {
    if (expandedChallenge === challenge.id) {
      setExpandedChallenge(null);
      setStandingsSearch("");
      return;
    }
    setExpandedChallenge(challenge.id);
    if (challengeStandings[challenge.id]) return; // cached

    setLoadingStandings(challenge.id);

    // Pull both reps_completed (actual metric) and points_earned (local pts)
    const { data: logs } = await supabase
      .from("daily_logs")
      .select("user_id, reps_completed, points_earned")
      .eq("challenge_id", challenge.id);

    // Aggregate per user
    const metricMap: Record<string, number> = {};
    const pointsMap: Record<string, number> = {};
    for (const log of logs ?? []) {
      metricMap[log.user_id] = (metricMap[log.user_id] ?? 0) + (log.reps_completed ?? 0);
      pointsMap[log.user_id] = (pointsMap[log.user_id] ?? 0) + (log.points_earned  ?? 0);
    }

    const isTeams = challenge.has_teams || challenge.mode === "teams";

    if (isTeams) {
      // ── Team standings ───────────────────────────────────────────────────
      const { data: members } = await supabase
        .from("challenge_members")
        .select(`
          user_id, team_id,
          teams(id, name, color)
        `)
        .eq("challenge_id", challenge.id);

      if (members) {
        const teamMap: Record<string, {
          id: string; name: string; color: string;
          metrics: number[]; points: number[];
        }> = {};

        members.forEach((m: any) => {
          if (!m.team_id) return;
          if (!teamMap[m.team_id]) {
            teamMap[m.team_id] = {
              id:      m.team_id,
              name:    m.teams?.name  || "Team",
              color:   m.teams?.color || "#6366f1",
              metrics: [],
              points:  [],
            };
          }
          teamMap[m.team_id].metrics.push(metricMap[m.user_id] ?? 0);
          teamMap[m.team_id].points.push(pointsMap[m.user_id]  ?? 0);
        });

        const byMetric = ranksByMetric(challenge);

        const standings: TeamStanding[] = Object.values(teamMap)
          .map((t) => {
            const totalMetric  = t.metrics.reduce((s, v) => s + v, 0);
            const totalPoints  = t.points.reduce((s, v) => s + v, 0);
            const memberCount  = t.metrics.length;
            return {
              id:           t.id,
              name:         t.name,
              color:        t.color,
              total_metric: totalMetric,
              avg_metric:   memberCount > 0 ? totalMetric / memberCount : 0,
              total_points: totalPoints,
              member_count: memberCount,
            };
          })
          .sort((a, b) =>
            byMetric
              ? b.avg_metric  - a.avg_metric
              : b.total_points - a.total_points
          );

        setChallengeStandings((prev) => ({ ...prev, [challenge.id]: standings }));
      }
    } else {
      // ── Individual standings ─────────────────────────────────────────────
      const { data: members } = await supabase
        .from("challenge_members")
        .select(`
          user_id,
          users!challenge_members_user_id_fkey(id, name, avatar_emoji, streak)
        `)
        .eq("challenge_id", challenge.id);

      if (members) {
        const byMetric = ranksByMetric(challenge);

        const standings: ChallengeStanding[] = members
          .map((m: any) => ({
            user_id:      m.user_id,
            name:         m.users?.name         || "Member",
            avatar_emoji: m.users?.avatar_emoji || "😊",
            metric:       metricMap[m.user_id]  ?? 0,
            points:       pointsMap[m.user_id]  ?? 0,
            streak:       m.users?.streak        ?? 0,
          }))
          .sort((a, b) =>
            byMetric
              ? b.metric - a.metric
              : b.points - a.points
          );

        setChallengeStandings((prev) => ({ ...prev, [challenge.id]: standings }));
      }
    }
    setLoadingStandings(null);
  };

  const isActive = (c: UserChallenge) =>
  c.end_date === null || new Date(c.end_date).getTime() > Date.now();

const daysLeft = (c: UserChallenge) =>
  c.end_date === null
    ? null
    : Math.ceil((new Date(c.end_date).getTime() - Date.now()) / 86_400_000);

  // ── Render ────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-400 font-semibold">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-5 pt-6 pb-28 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
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
          <h1 className="text-4xl font-bold font-display text-slate-900 tracking-tight">
            Ranks
          </h1>
        </div>
        {tab === "prs" && userId && (
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/embed/pr")}
              className="rounded-xl px-4 py-2 text-sm font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition"
            >
              ✏️ Edit PRs
            </button>
            <button
              onClick={() => setShowPRModal(true)}
              className="rainbow-cta rounded-xl px-4 py-2 text-sm font-bold"
            >
              + Log PR
            </button>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-2xl" style={{ background: "rgba(0,0,0,0.05)" }}>
        {(["global", "challenges", "prs"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all capitalize ${
              tab === t
                ? "rainbow-cta text-[#1a1a1a] shadow-[0_2px_8px_rgba(102,126,234,0.25)]"
                : "text-[#94a3b8]"
            }`}
          >
            {t === "global" ? "🌍 Global" : t === "challenges" ? "⚡ Challenges" : "🏆 PRs"}
          </button>
        ))}
      </div>

      {/* ── GLOBAL TAB ────────────────────────────────────────────────────────── */}
      {tab === "global" && (
        <div className="space-y-3">
          {globalUsers.length === 0 ? (
            <div className="neon-card rounded-2xl p-12 text-center">
              <p className="text-2xl mb-2">🌍</p>
              <p className="font-bold text-slate-800">No standings yet</p>
              <p className="text-sm text-slate-500 mt-1">
                Start checking in to earn global points
              </p>
            </div>
          ) : (
            <div className="neon-card rounded-2xl overflow-hidden">
              {globalUsers.map((u, i) => (
                <RankRow
                  key={u.id}
                  rank={i + 1}
                  name={u.name}
                  avatar={getAvatar(u.avatar_emoji, u.name)}
                  primary={`${(u.global_points || 0).toLocaleString()} pts`}
                  secondary={
                    u.streak > 0
                      ? `🔥 ${u.streak}-day streak`
                      : "No active streak"
                  }
                  isMe={u.id === userId}
                  userId={u.id}
                  onNavigate={(id) => router.push(`/embed/profile/${id}`)}
                />
              ))}
            </div>
          )}

          {/* Points key */}
          <div className="neon-card rounded-2xl p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
              How to earn global points
            </p>
            <div className="space-y-2">
              {[
                ["Daily check-in",        "+5 pts"],
                ["7-day streak",          "+25 pts"],
                ["30-day streak",         "+100 pts"],
                ["100-day streak",        "+500 pts"],
                ["Win a challenge",       "+100 pts"],
                ["Win on a winning team", "+50 pts"],
                ["Log a PR",             "+10 pts"],
              ].map(([label, pts]) => (
                <div key={label} className="flex items-center justify-between">
                  <p className="text-xs text-slate-600">{label}</p>
                  <p className="text-xs font-bold text-purple-600">{pts}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── CHALLENGES TAB ────────────────────────────────────────────────────── */}
      {tab === "challenges" && (
        <div className="space-y-3">
          {myChallenges.length === 0 ? (
            <div className="neon-card rounded-2xl p-12 text-center space-y-3">
              <p className="text-2xl">⚡</p>
              <p className="font-bold text-slate-800">No challenges yet</p>
              <p className="text-sm text-slate-500">
                Join a challenge to see standings here
              </p>
              <button
                onClick={() => router.push("/embed/challenges")}
                className="rainbow-cta rounded-xl px-5 py-2.5 text-sm font-bold"
              >
                Browse Challenges
              </button>
            </div>
          ) : (
            myChallenges.map((challenge) => {
              const active    = isActive(challenge);
              const expanded  = expandedChallenge === challenge.id;
              const standings = challengeStandings[challenge.id];
              const isLoading = loadingStandings === challenge.id;
              const isTeams   = challenge.has_teams || challenge.mode === "teams";
              const unit      = getMetricUnit(challenge);
              const byMetric  = ranksByMetric(challenge);

              return (
                <div key={challenge.id} className="neon-card rounded-2xl overflow-hidden">
                  {/* Active/ended stripe */}
                  <div
                    className="h-1 w-full"
                    style={{
                      background: active
                        ? "linear-gradient(90deg,#ff6b9d,#ff9f43,#ffdd59,#48cfad,#667eea)"
                        : "#e2e8f0",
                    }}
                  />

                  {/* Challenge header — tap to expand */}
                  <button
                    onClick={() => loadChallengeStandings(challenge)}
                    className="w-full flex items-center gap-3 px-5 py-4 text-left"
                  >
                    <span className="text-2xl">
                      {challenge.emoji || (isTeams ? "🏳️‍🌈" : "⚡")}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-slate-900 truncate">
                        {challenge.name}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={{
                            background: isTeams
                              ? "rgba(99,102,241,0.1)"
                              : "rgba(16,185,129,0.1)",
                            color: isTeams ? "#6366f1" : "#059669",
                          }}
                        >
                          {isTeams ? "🏳️‍🌈 Teams" : "👤 Individual"}
                        </span>
                        <span className="text-slate-300">·</span>
                        {/* Metric badge */}
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={{
                            background: "rgba(0,0,0,0.05)",
                            color: "#64748b",
                          }}
                        >
                          {unit}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span>
                          {active
                            ? daysLeft(challenge) === null
                              ? "Ongoing"
                              : `${daysLeft(challenge)}d left`
                            : "Ended"}
                        </span>
                      </p>
                    </div>
                    <span className="text-slate-300 text-sm ml-1">
                      {expanded ? "▲" : "▼"}
                    </span>
                  </button>

                  {/* Expanded standings */}
                  {expanded && (
                    <div className="border-t border-slate-100">
                      {isLoading ? (
                        <p className="text-center text-slate-400 text-sm py-6">
                          Loading standings…
                        </p>
                      ) : !standings || standings.length === 0 ? (
                        <p className="text-center text-slate-400 text-sm py-6">
                          No data yet
                        </p>
                      ) : isTeams ? (
                        // ── Team standings ──────────────────────────────────
                        <div>
                          <div className="px-5 pt-3 pb-1 flex items-center justify-between">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                              Team Standings
                            </p>
                            <p className="text-[10px] text-slate-400">
                              Ranked by {byMetric ? `avg ${unit}` : "total pts"}
                            </p>
                          </div>
                          {(standings as TeamStanding[]).map((team, i) => (
                            <TeamRow
                              key={team.id}
                              rank={i + 1}
                              team={team}
                              challenge={challenge}
                              isFirst={i === 0}
                            />
                          ))}
                        </div>
                      ) : (
                        // ── Individual standings ────────────────────────────
                        <div>
                          <div className="px-5 pt-3 pb-1 flex items-center justify-between">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                              Individual Standings
                            </p>
                            <p className="text-[10px] text-slate-400">
                              Ranked by {byMetric ? unit : "pts"}
                            </p>
                          </div>
                          {(standings as ChallengeStanding[]).length > 2 && (
                            <div className="px-5 pb-2">
                              <input
                                type="text"
                                placeholder="Search members…"
                                value={standingsSearch}
                                onChange={(e) => setStandingsSearch(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-slate-300"
                              />
                            </div>
                          )}
                          {(standings as ChallengeStanding[])
                            .filter((s) =>
                              !standingsSearch.trim() ||
                              s.name.toLowerCase().includes(standingsSearch.toLowerCase())
                            )
                            .map((s, i) => {
                              const primary = byMetric
                                ? formatMetric(s.metric, challenge)
                                : `${s.points.toLocaleString()} pts`;
                              const secondary = [
                                byMetric
                                  ? `${s.points.toLocaleString()} pts`
                                  : s.metric > 0
                                    ? formatMetric(s.metric, challenge)
                                    : null,
                                s.streak > 0 ? `🔥 ${s.streak}-day streak` : null,
                              ]
                                .filter(Boolean)
                                .join(" · ");

                              return (
                                <RankRow
                                  key={s.user_id}
                                  rank={i + 1}
                                  name={s.name}
                                  avatar={getAvatar(s.avatar_emoji, s.name)}
                                  primary={primary}
                                  secondary={secondary}
                                  isMe={s.user_id === userId}
                                  userId={s.user_id}
                                  onNavigate={(id) => router.push(`/embed/profile/${id}`)}
                                />
                              );
                            })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── PR TAB ────────────────────────────────────────────────────────────── */}
      {tab === "prs" && (
        <div className="space-y-4">
          {/* Category picker */}
          <div className="flex gap-2">
            {PR_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setPrCategory(cat.value)}
                className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 transition-all"
                style={{
                  borderColor: prCategory === cat.value ? "#a855f7" : "#e2e8f0",
                  background:  prCategory === cat.value ? "rgba(168,85,247,0.08)" : "white",
                }}
              >
                <span className="text-lg">{cat.icon}</span>
                <span
                  className="text-[10px] font-bold"
                  style={{ color: prCategory === cat.value ? "#7c3aed" : "#94a3b8" }}
                >
                  {cat.label}
                </span>
              </button>
            ))}
          </div>

          {/* Community / Mine toggle */}
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(0,0,0,0.05)" }}>
            {(["community", "mine"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setPrView(v)}
                className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
                style={
                  prView === v
                    ? { background: "white", color: "#0f172a", boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }
                    : { color: "#94a3b8" }
                }
              >
                {v === "community" ? "🌍 Community" : "⭐ My PRs"}
              </button>
            ))}
          </div>

          {loadingPRs ? (
            <p className="text-center text-slate-400 text-sm py-8">Loading…</p>
          ) : prView === "community" ? (
            communityPRs.length === 0 ? (
              <div className="neon-card rounded-2xl p-10 text-center space-y-2">
                <p className="text-2xl">{PR_CATEGORIES.find((c) => c.value === prCategory)?.icon}</p>
                <p className="font-bold text-slate-800">No community PRs yet</p>
                <p className="text-sm text-slate-500">Be the first to log one!</p>
                <button
                  onClick={() => setShowPRModal(true)}
                  className="rainbow-cta rounded-xl px-5 py-2.5 text-sm font-bold mt-1"
                >
                  + Log PR
                </button>
              </div>
            ) : (
              <div className="neon-card rounded-2xl overflow-hidden">
                {communityPRs.map((pr, i) => {
                  const improved =
                    pr.previous_value != null && pr.value > pr.previous_value;
                  return (
                    <div
                      key={pr.id}
                      className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 last:border-0"
                    >
                      <div className="w-6 text-center flex-shrink-0">
                        {getMedal(i + 1)
                          ? <span className="text-base">{getMedal(i + 1)}</span>
                          : <span className="text-sm font-bold text-slate-400">{i + 1}</span>
                        }
                      </div>
                      <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-base flex-shrink-0">
                        {pr.user_avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-slate-900">{pr.label}</p>
                        <p className="text-xs text-slate-400">
                          {pr.user_name} ·{" "}
                          {new Date(pr.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-extrabold text-slate-900">
                          {pr.value}{" "}
                          <span className="text-xs font-medium text-slate-400">{pr.unit}</span>
                        </p>
                        {improved && (
                          <p className="text-[10px] font-bold text-green-500">
                            +{(pr.value - (pr.previous_value ?? 0)).toFixed(1)} from last
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : myPRs.length === 0 ? (
            <div className="neon-card rounded-2xl p-10 text-center space-y-2">
              <p className="text-2xl">🏆</p>
              <p className="font-bold text-slate-800">No {prCategory} PRs yet</p>
              <button
                onClick={() => setShowPRModal(true)}
                className="rainbow-cta rounded-xl px-5 py-2.5 text-sm font-bold mt-1"
              >
                + Log Your First PR
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {myPRs.map((pr) => {
                const improved =
                  pr.previous_value != null && pr.value > pr.previous_value;
                return (
                  <div
                    key={pr.id}
                    className="neon-card rounded-xl px-4 py-3.5 flex items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-slate-900">{pr.label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(pr.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                        {pr.notes && <span> · {pr.notes}</span>}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-extrabold text-slate-900">
                        {pr.value}{" "}
                        <span className="text-xs font-medium text-slate-400">{pr.unit}</span>
                      </p>
                      {improved && (
                        <p className="text-[10px] font-bold text-green-500">
                          ↑ {(pr.value - (pr.previous_value ?? 0)).toFixed(1)} PR!
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* PR Log Modal */}
      {showPRModal && userId && (
        <PRLogModal
          userId={userId}
          onClose={() => setShowPRModal(false)}
          onSaved={() => {
            setShowPRModal(false);
            loadPRs(prCategory);
          }}
        />
      )}
    </div>
  );
}