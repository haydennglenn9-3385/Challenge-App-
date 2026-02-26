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
  mode: string;
  end_date: string;
  scoring_type: string;
  emoji?: string;
}

interface ChallengeStanding {
  user_id: string;
  name: string;
  avatar_emoji: string;
  points: number;
  streak: number;
}

interface TeamStanding {
  id: string;
  name: string;
  total_points: number;
  avg_points: number;
  member_count: number;
}

interface PRRecord {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function RankRow({
  rank, name, avatar, points, sub, isMe,
}: {
  rank: number; name: string; avatar: string;
  points: number; sub: string; isMe?: boolean;
}) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 last:border-0"
      style={isMe ? { background: "#1C1C1E", borderRadius: 0 } : {}}
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
        <p className={`font-bold text-sm ${isMe ? "text-white" : "text-slate-900"}`}>
          {name}{isMe && <span className="ml-1 text-xs font-normal opacity-40">(You)</span>}
        </p>
        <p className={`text-xs mt-0.5 ${isMe ? "text-white/40" : "text-slate-400"}`}>{sub}</p>
      </div>
      <div className="text-right">
        <p
          className="text-lg font-extrabold"
          style={isMe ? {
            background: "linear-gradient(90deg,#ff6b9d,#ffdd59,#48cfad,#667eea)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          } : { color: "#0f172a" }}
        >
          {points.toLocaleString()}
        </p>
        <p className={`text-[10px] font-medium ${isMe ? "text-white/30" : "text-slate-400"}`}>pts</p>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function LeaderboardPage() {
  const router  = useRouter();

  const [tab, setTab]             = useState<Tab>("global");
  const [userId, setUserId]       = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);

  // Global tab
  const [globalUsers, setGlobalUsers] = useState<GlobalUser[]>([]);

  // Challenges tab
  const [myChallenges, setMyChallenges]         = useState<UserChallenge[]>([]);
  const [expandedChallenge, setExpandedChallenge] = useState<string | null>(null);
  const [challengeStandings, setChallengeStandings] = useState<Record<string, ChallengeStanding[] | TeamStanding[]>>({});
  const [loadingStandings, setLoadingStandings] = useState<string | null>(null);

  // PR tab
  const [prCategory, setPrCategory]     = useState<PRCategory>("strength");
  const [communityPRs, setCommunityPRs] = useState<PRRecord[]>([]);
  const [myPRs, setMyPRs]               = useState<PRRecord[]>([]);
  const [prView, setPrView]             = useState<"community" | "mine">("community");
  const [showPRModal, setShowPRModal]   = useState(false);
  const [loadingPRs, setLoadingPRs]     = useState(false);

  // ── Initial load ────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth"); return; }
      setUserId(user.id);

      // Global standings
      const { data: users } = await supabase
        .from("users")
        .select("id, name, avatar_emoji, global_points, streak")
        .order("global_points", { ascending: false })
        .limit(50);
      setGlobalUsers(users || []);

      // User's challenges
      const { data: joined } = await supabase
        .from("challenge_members")
        .select("challenges(id, name, mode, end_date, scoring_type, emoji)")
        .eq("user_id", user.id);

      if (joined) {
        setMyChallenges(
          joined
            .map((j: any) => j.challenges)
            .filter(Boolean)
            .sort((a: any, b: any) =>
              new Date(b.end_date).getTime() - new Date(a.end_date).getTime()
            )
        );
      }

      setLoading(false);
    }
    load();
  }, [router]);

  // ── Load PRs when switching to PR tab ──────────────────────────────────────
  const loadPRs = useCallback(async (cat: PRCategory) => {
    if (!userId) return;
    setLoadingPRs(true);

    // Community top PRs for category (public only)
    const { data: community } = await supabase
      .from("performance_records")
      .select(`
        id, user_id, type, label, value, unit, date, previous_value, notes,
        users(name, avatar_emoji)
      `)
      .eq("type", cat)
      .eq("is_public", true)
      .order("value", { ascending: cat === "cardio" || cat === "endurance" ? true : false })
      .limit(20);

    if (community) {
      setCommunityPRs(community.map((r: any) => ({
        ...r,
        user_name:   r.users?.name || "Member",
        user_avatar: r.users?.avatar_emoji || "😊",
      })));
    }

    // My PRs for category
    const { data: mine } = await supabase
      .from("performance_records")
      .select("id, user_id, type, label, value, unit, date, previous_value, notes")
      .eq("user_id", userId)
      .eq("type", cat)
      .order("date", { ascending: false });

    setMyPRs(mine || []);
    setLoadingPRs(false);
  }, [userId]);

  useEffect(() => {
    if (tab === "prs" && userId) loadPRs(prCategory);
  }, [tab, prCategory, userId, loadPRs]);

  // ── Load challenge standings ────────────────────────────────────────────────
  const loadChallengeStandings = async (challenge: UserChallenge) => {
    if (expandedChallenge === challenge.id) {
      setExpandedChallenge(null);
      return;
    }
    setExpandedChallenge(challenge.id);
    if (challengeStandings[challenge.id]) return; // cached

    setLoadingStandings(challenge.id);

    if (challenge.mode === "teams") {
      const { data: teams } = await supabase
        .from("teams")
        .select(`
          id, name,
          team_members(
            user_id,
            users(total_points)
          )
        `)
        .eq("challenge_id", challenge.id);

      // fallback: get teams via challenge_members
      const { data: members } = await supabase
        .from("challenge_members")
        .select(`
          user_id, team_id,
          users(total_points),
          teams(id, name)
        `)
        .eq("challenge_id", challenge.id);

      if (members) {
        // Group by team
        const teamMap: Record<string, { id: string; name: string; points: number[]; count: number }> = {};
        members.forEach((m: any) => {
          if (!m.team_id) return;
          if (!teamMap[m.team_id]) {
            teamMap[m.team_id] = { id: m.team_id, name: m.teams?.name || "Team", points: [], count: 0 };
          }
          teamMap[m.team_id].points.push(m.users?.total_points || 0);
          teamMap[m.team_id].count++;
        });

        const standings: TeamStanding[] = Object.values(teamMap)
          .map((t) => ({
            id: t.id, name: t.name,
            total_points: t.points.reduce((s, p) => s + p, 0),
            avg_points: t.count > 0 ? Math.round(t.points.reduce((s, p) => s + p, 0) / t.count) : 0,
            member_count: t.count,
          }))
          .sort((a, b) => b.avg_points - a.avg_points);

        setChallengeStandings((prev) => ({ ...prev, [challenge.id]: standings }));
      }
    } else {
      // Individual standings
      const { data: members } = await supabase
        .from("challenge_members")
        .select(`
          user_id,
          users(id, name, avatar_emoji, total_points, streak)
        `)
        .eq("challenge_id", challenge.id);

      if (members) {
        const standings: ChallengeStanding[] = members
          .map((m: any) => ({
            user_id:     m.user_id,
            name:        m.users?.name || "Member",
            avatar_emoji: m.users?.avatar_emoji || "😊",
            points:      m.users?.total_points || 0,
            streak:      m.users?.streak || 0,
          }))
          .sort((a, b) => b.points - a.points);

        setChallengeStandings((prev) => ({ ...prev, [challenge.id]: standings }));
      }
    }

    setLoadingStandings(null);
  };

  const isActive = (c: UserChallenge) =>
    new Date(c.end_date).getTime() > Date.now();

  // ── Render ──────────────────────────────────────────────────────────────────
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
          <p className="text-xs font-bold tracking-[0.2em] uppercase mb-1" style={{
            background: "linear-gradient(90deg,#ff6b9d,#ff9f43,#ffdd59,#48cfad,#4fc3f7,#667eea)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            Queers & Allies Fitness
          </p>
          <h1 className="text-3xl font-display font-extrabold text-slate-900 tracking-tight">Ranks</h1>
        </div>
        {tab === "prs" && userId && (
          <button
            onClick={() => setShowPRModal(true)}
            className="rainbow-cta rounded-xl px-4 py-2 text-sm font-bold"
          >
            + Log PR
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-2xl" style={{ background: "rgba(0,0,0,0.05)" }}>
        {(["global", "challenges", "prs"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all capitalize"
            style={tab === t ? {
              background: "linear-gradient(90deg,#ff6b9d,#ff9f43,#ffdd59,#48cfad,#667eea)",
              color: "#1a1a1a",
              boxShadow: "0 2px 8px rgba(102,126,234,0.25)",
            } : { color: "#94a3b8" }}
          >
            {t === "global" ? "🌍 Global" : t === "challenges" ? "⚡ Challenges" : "🏆 PRs"}
          </button>
        ))}
      </div>

      {/* ── GLOBAL TAB ─────────────────────────────────────────────────────── */}
      {tab === "global" && (
        <div className="space-y-3">
          {globalUsers.length === 0 ? (
            <div className="neon-card rounded-2xl p-12 text-center">
              <p className="text-2xl mb-2">🌍</p>
              <p className="font-bold text-slate-800">No standings yet</p>
              <p className="text-sm text-slate-500 mt-1">Start checking in to earn global points</p>
            </div>
          ) : (
            <div className="neon-card rounded-2xl overflow-hidden">
              {globalUsers.map((u, i) => (
                <RankRow
                  key={u.id}
                  rank={i + 1}
                  name={u.name}
                  avatar={getAvatar(u.avatar_emoji, u.name)}
                  points={u.global_points || 0}
                  sub={u.streak > 0 ? `🔥 ${u.streak}-day streak` : "No active streak"}
                  isMe={u.id === userId}
                />
              ))}
            </div>
          )}

          {/* Points key */}
          <div className="neon-card rounded-2xl p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">How to earn points</p>
            <div className="space-y-2">
              {[
                ["Daily check-in",         "+5 pts"],
                ["7-day streak",           "+25 pts"],
                ["30-day streak",          "+100 pts"],
                ["100-day streak",         "+500 pts"],
                ["Win a challenge",        "+100 pts"],
                ["Win on a winning team",  "+50 pts"],
                ["Log a PR",              "+10 pts"],
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

      {/* ── CHALLENGES TAB ─────────────────────────────────────────────────── */}
      {tab === "challenges" && (
        <div className="space-y-3">
          {myChallenges.length === 0 ? (
            <div className="neon-card rounded-2xl p-12 text-center space-y-3">
              <p className="text-2xl">⚡</p>
              <p className="font-bold text-slate-800">No challenges yet</p>
              <p className="text-sm text-slate-500">Join a challenge to see standings here</p>
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
              const isTeams   = challenge.mode === "teams";

              return (
                <div key={challenge.id} className="neon-card rounded-2xl overflow-hidden">
                  <div className="h-1 w-full" style={{
                    background: active
                      ? "linear-gradient(90deg,#ff6b9d,#ff9f43,#ffdd59,#48cfad,#667eea)"
                      : "#e2e8f0",
                  }} />

                  {/* Challenge header */}
                  <button
                    onClick={() => loadChallengeStandings(challenge)}
                    className="w-full flex items-center gap-3 px-5 py-4 text-left"
                  >
                    <span className="text-2xl">{challenge.emoji || (isTeams ? "🏳️‍🌈" : "⚡")}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-slate-900 truncate">{challenge.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {isTeams ? "Teams" : challenge.mode === "individual" ? "Personal" : "Individual"} · {active ? `${Math.ceil((new Date(challenge.end_date).getTime() - Date.now()) / 86400000)}d left` : "Ended"}
                      </p>
                    </div>
                    <span className="text-slate-400 text-sm">{expanded ? "▲" : "▼"}</span>
                  </button>

                  {/* Expanded standings */}
                  {expanded && (
                    <div className="border-t border-slate-100">
                      {isLoading ? (
                        <p className="text-center text-slate-400 text-sm py-6">Loading standings…</p>
                      ) : !standings || standings.length === 0 ? (
                        <p className="text-center text-slate-400 text-sm py-6">No data yet</p>
                      ) : isTeams ? (
                        // Team standings
                        <div>
                          <p className="px-5 pt-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wide">Team Standings</p>
                          {(standings as TeamStanding[]).map((team, i) => (
                            <div key={team.id} className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 last:border-0">
                              <span className="text-base w-6 text-center">{getMedal(i + 1) ?? i + 1}</span>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm text-slate-900">{team.name}</p>
                                <p className="text-xs text-slate-400">{team.member_count} members · {team.total_points} total pts</p>
                              </div>
                              <p className="text-base font-extrabold text-slate-900">{team.avg_points}</p>
                              <p className="text-xs text-slate-400">avg</p>
                            </div>
                          ))}
                        </div>
                      ) : challenge.mode === "individual" ? (
                        // Personal only
                        <div className="px-5 py-4">
                          {(() => {
                            const me = (standings as ChallengeStanding[]).find((s) => s.user_id === userId);
                            return me ? (
                              <div className="text-center space-y-1">
                                <p className="text-3xl font-extrabold" style={{
                                  background: "linear-gradient(90deg,#ff6b9d,#667eea)",
                                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                                }}>{me.points.toLocaleString()}</p>
                                <p className="text-xs text-slate-400">your points</p>
                                {me.streak > 0 && <p className="text-xs font-bold text-orange-500">🔥 {me.streak}-day streak</p>}
                              </div>
                            ) : <p className="text-xs text-slate-400 text-center">No data yet</p>;
                          })()}
                        </div>
                      ) : (
                        // Individuals compete
                        <div>
                          <p className="px-5 pt-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wide">Individual Standings</p>
                          {(standings as ChallengeStanding[]).map((s, i) => (
                            <RankRow
                              key={s.user_id}
                              rank={i + 1}
                              name={s.name}
                              avatar={getAvatar(s.avatar_emoji, s.name)}
                              points={s.points}
                              sub={s.streak > 0 ? `🔥 ${s.streak}-day streak` : ""}
                              isMe={s.user_id === userId}
                            />
                          ))}
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

      {/* ── PR TAB ─────────────────────────────────────────────────────────── */}
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
                  background: prCategory === cat.value ? "rgba(168,85,247,0.08)" : "white",
                }}
              >
                <span className="text-lg">{cat.icon}</span>
                <span className="text-[10px] font-bold" style={{ color: prCategory === cat.value ? "#7c3aed" : "#94a3b8" }}>
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
                style={prView === v ? {
                  background: "white",
                  color: "#0f172a",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                } : { color: "#94a3b8" }}
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
                  const improved = pr.previous_value != null && pr.value > pr.previous_value;
                  return (
                    <div key={pr.id} className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 last:border-0">
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
                        <p className="text-xs text-slate-400">{pr.user_name} · {new Date(pr.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-extrabold text-slate-900">{pr.value} <span className="text-xs font-medium text-slate-400">{pr.unit}</span></p>
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
          ) : (
            // My PRs
            myPRs.length === 0 ? (
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
                  const improved = pr.previous_value != null && pr.value > pr.previous_value;
                  return (
                    <div key={pr.id} className="neon-card rounded-xl px-4 py-3.5 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-slate-900">{pr.label}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {new Date(pr.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          {pr.notes && <span> · {pr.notes}</span>}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-extrabold text-slate-900">
                          {pr.value} <span className="text-xs font-medium text-slate-400">{pr.unit}</span>
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
            )
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