"use client";
import { useEffect, useState } from "react";
import { useUser } from "@/lib/UserContext";
import { supabase } from "@/lib/supabase/client";

interface LeaderboardUser {
  id: string;
  name: string;
  streak: number;
  total_points: number;
  emoji_avatar?: string;
}

interface TeamStanding {
  id: string;
  name: string;
  color: string;
  avg_points: number;
  total_points: number;
  member_count: number;
}

const getMedal = (rank: number) => ["🥇", "🥈", "🥉"][rank - 1] ?? null;

const RANK_ACCENTS: Record<number, string> = {
  1: "linear-gradient(180deg, #ff6b9d, #ff9f43, #ffdd59, #48cfad, #667eea)",
  2: "linear-gradient(180deg, #f4a0c8, #c084e8, #93bbf4)",
  3: "linear-gradient(180deg, #a8e6f8, #f9c6d4)",
};

const FALLBACK_AVATARS = ["🏳️‍🌈", "💪", "🔥", "⚡", "🌈", "✨", "🦋", "💫"];

// ─── Glass Podium (OUTSIDE main component) ───────────────────────────────────
function GlassPodium({ items, getName, getPoints, getAvatar }: {
  items: any[];
  getName: (i: any) => string;
  getPoints: (i: any) => number;
  getAvatar: (i: any) => string;
}) {
  if (items.length < 2) return null;

  const top = items.slice(0, 3);
  // Display order: 2nd, 1st, 3rd
  const ordered =
    top.length === 2
      ? [{ item: top[1], rank: 2 }, { item: top[0], rank: 1 }]
      : [{ item: top[1], rank: 2 }, { item: top[0], rank: 1 }, { item: top[2], rank: 3 }];

  // Glass styles per rank
  const glassStyles: Record<number, { blockBg: string; shimmer: string; height: number; glow: string }> = {
    1: {
      blockBg: "linear-gradient(160deg, rgba(255,179,200,0.55) 0%, rgba(255,212,163,0.45) 30%, rgba(255,245,163,0.45) 55%, rgba(179,240,220,0.45) 80%, rgba(179,212,247,0.55) 100%)",
      shimmer: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.55) 50%, transparent 60%)",
      height: 110,
      glow: "0 0 30px rgba(255,179,200,0.5), 0 0 60px rgba(179,212,247,0.3)",
    },
    2: {
      blockBg: "linear-gradient(160deg, rgba(244,160,200,0.5) 0%, rgba(192,132,232,0.45) 50%, rgba(147,187,244,0.55) 100%)",
      shimmer: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.5) 50%, transparent 60%)",
      height: 80,
      glow: "0 0 24px rgba(192,132,232,0.45)",
    },
    3: {
      blockBg: "linear-gradient(160deg, rgba(168,230,248,0.55) 0%, rgba(255,255,255,0.4) 50%, rgba(249,198,212,0.55) 100%)",
      shimmer: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.5) 50%, transparent 60%)",
      height: 60,
      glow: "0 0 20px rgba(168,230,248,0.4)",
    },
  };

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .podium-shimmer {
          animation: shimmer 3s ease-in-out infinite;
          background-size: 200% 100%;
        }
      `}</style>
      <div className="neon-card rounded-2xl p-5 mb-1">
        <div className="flex items-end justify-center gap-3" style={{ height: 190 }}>
          {ordered.map(({ item, rank }) => {
            const s = glassStyles[rank];
            const medal = getMedal(rank);
            const name = getName(item).split(" ")[0];
            const pts = getPoints(item);
            const avatar = getAvatar(item);
            return (
              <div key={rank} className="flex flex-col items-center gap-1 flex-1">
                {/* Avatar circle */}
                <div
                  className="rounded-full flex items-center justify-center text-xl flex-shrink-0"
                  style={{
                    width: rank === 1 ? 44 : 36,
                    height: rank === 1 ? 44 : 36,
                    background: rank === 1
                      ? "linear-gradient(135deg, #ff6b9d, #667eea)"
                      : "rgba(255,255,255,0.8)",
                    border: rank === 1 ? "2px solid rgba(255,255,255,0.6)" : "2px solid rgba(0,0,0,0.06)",
                    boxShadow: rank === 1 ? "0 4px 12px rgba(102,126,234,0.35)" : "none",
                  }}
                >
                  {avatar}
                </div>
                <p className="text-xs font-bold text-slate-700 text-center truncate w-full px-1">{name}</p>
                <p className="text-xs font-semibold text-slate-400">{pts} pts</p>

                {/* Glass block */}
                <div
                  className="w-full rounded-t-xl relative overflow-hidden"
                  style={{
                    height: s.height,
                    background: s.blockBg,
                    boxShadow: s.glow,
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(255,255,255,0.6)",
                    borderBottom: "none",
                  }}
                >
                  {/* Shimmer overlay */}
                  <div
                    className="podium-shimmer absolute inset-0"
                    style={{ background: s.shimmer }}
                  />
                  {/* Top highlight edge */}
                  <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "rgba(255,255,255,0.8)" }} />
                  {/* Medal */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl drop-shadow-sm">{medal}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ─── RankRow (OUTSIDE main component) ────────────────────────────────────────
function RankRow({ rank, name, sub, points, pointsLabel, isMe, avatar }: {
  rank: number; name: string; sub: string; points: number;
  pointsLabel: string; isMe?: boolean; avatar: string;
}) {
  const accent = RANK_ACCENTS[rank];
  return (
    <div
      className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 last:border-0 relative overflow-hidden"
      style={isMe ? { background: "#1C1C1E" } : {}}
    >
      {accent && !isMe && (
        <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: accent }} />
      )}
      {/* Rank number */}
      <div className="w-6 text-center flex-shrink-0 ml-2">
        {getMedal(rank)
          ? <span className="text-base">{getMedal(rank)}</span>
          : <span className={`text-sm font-bold ${isMe ? "text-white/40" : "text-slate-400"}`}>{rank}</span>
        }
      </div>
      {/* Emoji avatar circle */}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0"
        style={{
          background: isMe
            ? "linear-gradient(135deg, #ff6b9d, #667eea)"
            : "rgba(0,0,0,0.04)",
          border: isMe ? "none" : "1px solid rgba(0,0,0,0.06)",
        }}
      >
        {avatar}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-bold text-sm ${isMe ? "text-white" : "text-slate-900"}`}>
          {name}{isMe && <span className="ml-1 text-xs font-normal opacity-40">(You)</span>}
        </p>
        <p className={`text-xs mt-0.5 font-medium ${isMe ? "text-white/40" : "text-slate-500"}`}>{sub}</p>
      </div>
      <div className="text-right flex-shrink-0">
        {isMe ? (
          <p className="text-2xl font-extrabold" style={{
            background: "linear-gradient(90deg,#ff6b9d,#ff9f43,#ffdd59,#48cfad,#667eea)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>{points}</p>
        ) : (
          <p className="text-2xl font-extrabold text-slate-900">{points}</p>
        )}
        <p className={`text-xs font-medium ${isMe ? "text-white/40" : "text-slate-400"}`}>{pointsLabel}</p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function LeaderboardPage() {
  const { user } = useUser();
  const [individuals, setIndividuals] = useState<LeaderboardUser[]>([]);
  const [teams, setTeams]             = useState<TeamStanding[]>([]);
  const [loading, setLoading]         = useState(true);
  const [tab, setTab]                 = useState<"teams" | "individual">("teams");

  useEffect(() => {
    async function load() {
      const { data: users } = await supabase
        .from("users")
        .select("id, name, streak, total_points, emoji_avatar")
        .order("total_points", { ascending: false })
        .limit(20);
      if (users) setIndividuals(users);

      const { data: teamData } = await supabase
        .from("teams")
        .select(`id, name, color, team_members(user_id, users(total_points))`)
        .in("name", ["Team Hayden", "Team Aria", "Team Tiffany"]);

      if (teamData) {
        const standings: TeamStanding[] = teamData.map((team: any) => {
          const members  = team.team_members || [];
          const totalPts = members.reduce((s: number, m: any) => s + (m.users?.total_points || 0), 0);
          const avgPts   = members.length > 0 ? Math.ceil(totalPts / members.length) : 0;
          return { id: team.id, name: team.name, color: team.color || "#6366f1", avg_points: avgPts, total_points: totalPts, member_count: members.length };
        });
        standings.sort((a, b) => b.avg_points - a.avg_points);
        setTeams(standings);
      }
      setLoading(false);
    }
    load();
  }, []);

  // Get avatar emoji for a person, fallback to name-based default
  const getPersonAvatar = (person: LeaderboardUser) =>
    person.emoji_avatar || FALLBACK_AVATARS[person.name?.charCodeAt(0) % FALLBACK_AVATARS.length] || "💪";

  // Teams use the team name initial mapped to a flag emoji
  const getTeamAvatar = (team: TeamStanding) => {
    const teamEmojis: Record<string, string> = {
      "Team Hayden": "⚡",
      "Team Aria": "🌈",
      "Team Tiffany": "🦋",
    };
    return teamEmojis[team.name] || "🏳️‍🌈";
  };

  const myIdx = individuals.findIndex(p => p.name === user?.name);

  return (
    <div className="min-h-screen px-5 pt-6 pb-28 space-y-5">

      {/* Header */}
      <div>
        <p className="text-xs font-bold tracking-[0.2em] uppercase mb-1" style={{
          background: "linear-gradient(90deg,#ff6b9d,#ff9f43,#ffdd59,#48cfad,#4fc3f7,#667eea)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          Queers & Allies Fitness
        </p>
        <h1 className="text-3xl font-display font-extrabold text-slate-900 tracking-tight">Leaderboard</h1>
      </div>

      {/* Toggle */}
      <div className="flex p-1 rounded-full bg-white shadow-sm" style={{ border: "1px solid #E5E5EA" }}>
        {(["teams", "individual"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 py-2.5 rounded-full text-sm font-bold transition-all"
            style={tab === t ? {
              background: "linear-gradient(90deg,#ff6b9d,#ff9f43,#ffdd59,#48cfad,#4fc3f7,#667eea)",
              color: "#1a1a1a",
            } : { color: "#8E8E93" }}>
            {t === "teams" ? "Teams" : "Individual"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="neon-card rounded-2xl p-12 text-center">
          <p className="text-slate-400 font-semibold">Loading standings...</p>
        </div>

      ) : tab === "teams" ? (
        <div className="space-y-3">
          {teams.length === 0 ? (
            <div className="neon-card rounded-2xl p-12 text-center">
              <p className="text-2xl mb-2">🏆</p>
              <p className="font-bold text-slate-800">No teams yet</p>
            </div>
          ) : (
            <>
              <GlassPodium
                items={teams}
                getName={(t) => t.name}
                getPoints={(t) => t.avg_points}
                getAvatar={getTeamAvatar}
              />
              <div className="neon-card rounded-2xl overflow-hidden">
                {teams.map((team, i) => (
                  <RankRow
                    key={team.id}
                    rank={i + 1}
                    name={team.name}
                    sub={`${team.member_count} member${team.member_count !== 1 ? "s" : ""} · ${team.total_points} total pts`}
                    points={team.avg_points}
                    pointsLabel="avg pts"
                    avatar={getTeamAvatar(team)}
                  />
                ))}
              </div>
              <div className="neon-card rounded-2xl px-5 py-3 text-center">
                <p className="text-xs text-slate-500 font-medium">Team score = total points ÷ members, rounded up</p>
              </div>
            </>
          )}
        </div>

      ) : (
        <div className="space-y-3">
          {individuals.length === 0 ? (
            <div className="neon-card rounded-2xl p-12 text-center">
              <p className="text-2xl mb-2">💪</p>
              <p className="font-bold text-slate-800">No check-ins yet</p>
              <p className="text-sm text-slate-500 mt-1">Be the first to log a workout!</p>
            </div>
          ) : (
            <>
              <GlassPodium
                items={individuals}
                getName={(p) => p.name || "User"}
                getPoints={(p) => p.total_points || 0}
                getAvatar={getPersonAvatar}
              />
              <div className="neon-card rounded-2xl overflow-hidden">
                {individuals.map((person, i) => {
                  if (user?.name === person.name) return null;
                  return (
                    <RankRow
                      key={person.id}
                      rank={i + 1}
                      name={person.name}
                      sub={`🔥 ${person.streak || 0}-day streak`}
                      points={person.total_points || 0}
                      pointsLabel="points"
                      avatar={getPersonAvatar(person)}
                    />
                  );
                })}
                {/* You card — always at bottom */}
                {myIdx >= 0 && (
                  <RankRow
                    rank={myIdx + 1}
                    name={individuals[myIdx].name}
                    sub={`🔥 ${individuals[myIdx].streak || 0}-day streak`}
                    points={individuals[myIdx].total_points || 0}
                    pointsLabel="points"
                    isMe
                    avatar={getPersonAvatar(individuals[myIdx])}
                  />
                )}
              </div>

              {/* Nudge */}
              {myIdx > 2 && individuals[myIdx - 1] && (
                <div className="neon-card rounded-2xl px-5 py-3 flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#FF6B9D" }} />
                  <p className="text-xs font-semibold text-slate-500">
                    <strong className="text-slate-900">
                      {Math.max(0, (individuals[myIdx - 1].total_points || 0) - (individuals[myIdx].total_points || 0))} pts
                    </strong> away from passing {individuals[myIdx - 1].name}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}