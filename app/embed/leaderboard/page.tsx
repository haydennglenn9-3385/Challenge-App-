"use client";
import { useEffect, useState } from "react";
import { useUser } from "@/lib/UserContext";
import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface LeaderboardUser {
  id: string;
  name: string;
  streak: number;
  total_points: number;
}

interface TeamStanding {
  id: string;
  name: string;
  color: string;
  avg_points: number;
  total_points: number;
  member_count: number;
}

// Podium block styles — display order: [2nd, 1st, 3rd]
const PODIUM_STYLES = [
  { height: 80,  bg: "linear-gradient(180deg, #f4a0c8, #c084e8, #93bbf4)" }, // 2nd — bi flag
  { height: 110, bg: "linear-gradient(180deg, #ffb3c8, #ffd4a3, #fff5a3, #b3f0dc, #b3d4f7)" }, // 1st — rainbow
  { height: 60,  bg: "linear-gradient(180deg, #a8e6f8, #ffffff, #f9c6d4)" }, // 3rd — trans flag
];

const RANK_ACCENTS: Record<number, string> = {
  1: "linear-gradient(180deg, #ff6b9d, #ff9f43, #ffdd59, #48cfad, #667eea)",
  2: "linear-gradient(180deg, #f4a0c8, #c084e8, #93bbf4)",
  3: "linear-gradient(180deg, #a8e6f8, #f9c6d4)",
};

const getMedal = (rank: number) => ["🥇", "🥈", "🥉"][rank - 1] ?? null;

// ─── Podium (defined OUTSIDE main component) ──────────────────────────────────
function Podium({ items, getName, getPoints }: {
  items: any[];
  getName: (i: any) => string;
  getPoints: (i: any) => number;
}) {
  if (items.length < 2) return null;

  // Display order: 2nd, 1st, 3rd
  const top = items.slice(0, 3);
  const ordered =
    top.length === 2
      ? [{ item: top[1], actualRank: 2, styleIdx: 0 }, { item: top[0], actualRank: 1, styleIdx: 1 }]
      : [{ item: top[1], actualRank: 2, styleIdx: 0 }, { item: top[0], actualRank: 1, styleIdx: 1 }, { item: top[2], actualRank: 3, styleIdx: 2 }];

  return (
    <div className="neon-card rounded-2xl p-5 mb-1">
      <div className="flex items-end justify-center gap-3" style={{ height: 170 }}>
        {ordered.map(({ item, actualRank, styleIdx }) => {
          const s = PODIUM_STYLES[styleIdx];
          return (
            <div key={actualRank} className="flex flex-col items-center gap-1 flex-1">
              <p className="text-xs font-bold text-slate-700 text-center leading-tight truncate w-full px-1">
                {getName(item).split(" ")[0]}
              </p>
              <p className="text-xs font-semibold text-slate-400">{getPoints(item)} pts</p>
              <div
                className="w-full rounded-t-xl flex items-center justify-center"
                style={{ height: s.height, background: s.bg }}
              >
                <span className="text-xl">{getMedal(actualRank)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── RankRow (defined OUTSIDE main component) ─────────────────────────────────
function RankRow({ rank, name, sub, points, pointsLabel, isMe }: {
  rank: number;
  name: string;
  sub: string;
  points: number;
  pointsLabel: string;
  isMe?: boolean;
}) {
  const accent = RANK_ACCENTS[rank];
  return (
    <div
      className="flex items-center gap-4 px-4 py-4 border-b border-slate-100 last:border-0 relative overflow-hidden"
      style={isMe ? { background: "#1C1C1E" } : {}}
    >
      {accent && !isMe && (
        <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: accent }} />
      )}
      <div className="w-6 text-center flex-shrink-0 ml-2">
        {getMedal(rank)
          ? <span className="text-base">{getMedal(rank)}</span>
          : <span className={`text-sm font-bold ${isMe ? "text-white/40" : "text-slate-400"}`}>{rank}</span>
        }
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
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            {points}
          </p>
        ) : (
          <p className="text-2xl font-extrabold text-slate-900">{points}</p>
        )}
        <p className={`text-xs font-medium ${isMe ? "text-white/40" : "text-slate-400"}`}>{pointsLabel}</p>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
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
        .select("id, name, streak, total_points")
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
          return {
            id: team.id,
            name: team.name,
            color: team.color || "#6366f1",
            avg_points: avgPts,
            total_points: totalPts,
            member_count: members.length,
          };
        });
        standings.sort((a, b) => b.avg_points - a.avg_points);
        setTeams(standings);
      }
      setLoading(false);
    }
    load();
  }, []);

  const myIdx = individuals.findIndex(p => p.name === user?.name);

  return (
    <div className="min-h-screen px-5 pt-6 pb-28 space-y-6">

      {/* Header */}
      <div>
        <p className="text-xs font-bold tracking-[0.2em] uppercase mb-1" style={{
          background: "linear-gradient(90deg,#ff6b9d,#ff9f43,#ffdd59,#48cfad,#4fc3f7,#667eea)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
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
              <Podium items={teams} getName={(t) => t.name} getPoints={(t) => t.avg_points} />
              <div className="neon-card rounded-2xl overflow-hidden">
                {teams.map((team, i) => (
                  <RankRow
                    key={team.id}
                    rank={i + 1}
                    name={team.name}
                    sub={`${team.member_count} member${team.member_count !== 1 ? "s" : ""} · ${team.total_points} total pts`}
                    points={team.avg_points}
                    pointsLabel="avg pts"
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
              <Podium items={individuals} getName={(p) => p.name || "User"} getPoints={(p) => p.total_points || 0} />
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
                    />
                  );
                })}
                {myIdx >= 0 && (
                  <RankRow
                    rank={myIdx + 1}
                    name={individuals[myIdx].name}
                    sub={`🔥 ${individuals[myIdx].streak || 0}-day streak`}
                    points={individuals[myIdx].total_points || 0}
                    pointsLabel="points"
                    isMe
                  />
                )}
              </div>

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