"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/UserContext";
import { supabase } from "@/lib/supabase/client";

interface LeaderboardUser {
  id: string;
  name: string;
  streak: number;
  total_points: number;
  team_name?: string;
}

interface TeamStanding {
  id: string;
  name: string;
  color: string;
  avg_points: number;
  total_points: number;
  member_count: number;
}

export default function LeaderboardPage() {
  const router = useRouter();
  const { user, getUserParams } = useUser();
  const [individuals, setIndividuals] = useState<LeaderboardUser[]>([]);
  const [teams, setTeams] = useState<TeamStanding[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"teams" | "individual">("teams");

  const navigate = (path: string) => router.push(path + getUserParams());

  useEffect(() => {
    async function loadLeaderboard() {
      const { data: users } = await supabase
        .from("users")
        .select("id, name, streak, total_points")
        .order("total_points", { ascending: false })
        .limit(20);
      if (users) setIndividuals(users);

      const { data: teamData } = await supabase
        .from("teams")
        .select(`
          id, name, color,
          team_members (
            user_id,
            users ( total_points )
          )
        `)
        .in("name", ["Team Hayden", "Team Aria", "Team Tiffany"]);

      if (teamData) {
        const standings: TeamStanding[] = teamData.map((team: any) => {
          const members = team.team_members || [];
          const memberCount = members.length;
          const totalPoints = members.reduce((sum: number, tm: any) => sum + (tm.users?.total_points || 0), 0);
          const avgPoints = memberCount > 0 ? Math.ceil(totalPoints / memberCount) : 0;
          return { id: team.id, name: team.name, color: team.color || "#6366f1", avg_points: avgPoints, total_points: totalPoints, member_count: memberCount };
        });
        standings.sort((a, b) => b.avg_points - a.avg_points);
        setTeams(standings);
      }
      setLoading(false);
    }
    loadLeaderboard();
  }, []);

  const getMedal = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return null;
  };

  // Reorder for podium display: [2nd, 1st, 3rd]
  function podiumOrder<T>(list: T[]): T[] {
    if (list.length < 2) return list;
    const [first, second, third] = list;
    return third ? [second, first, third] : [second, first];
  }

  const PODIUM_STYLES = [
    // 2nd — soft bi flag
    { height: "h-20", bg: "linear-gradient(180deg, #f4a0c8, #c084e8, #93bbf4)", textColor: "#fff" },
    // 1st — soft rainbow pastel
    { height: "h-28", bg: "linear-gradient(180deg, #ffb3c8, #ffd4a3, #fff5a3, #b3f0dc, #b3d4f7)", textColor: "#555" },
    // 3rd — soft pan flag
    { height: "h-16", bg: "linear-gradient(180deg, #f9a8d4, #fde68a, #a5d8f3)", textColor: "#555" },
  ];

  function Podium({ items, getName, getPoints }: {
    items: any[];
    getName: (i: any) => string;
    getPoints: (i: any) => number | string;
  }) {
    const ordered = podiumOrder(items.slice(0, 3));
    const actualRanks = [2, 1, 3]; // display order maps to actual ranks

    return (
      <div className="neon-card rounded-2xl p-5 mb-1">
        <div className="flex items-end justify-center gap-3" style={{ height: 160 }}>
          {ordered.map((item, i) => {
            const actualRank = actualRanks[i];
            const style = PODIUM_STYLES[i];
            const medal = getMedal(actualRank);
            return (
              <div key={i} className="flex flex-col items-center gap-2 flex-1">
                <p className="text-xs font-bold text-slate-700 text-center leading-tight truncate w-full px-1">
                  {getName(item).split(" ")[0]}
                </p>
                <div
                  className={`w-full ${style.height} rounded-t-xl flex items-center justify-center`}
                  style={{ background: style.bg }}
                >
                  <span className="text-lg font-bold" style={{ color: style.textColor }}>
                    {medal}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Find the current user's rank
  const myIndividualRank = individuals.findIndex(p => p.name === user?.name);
  const myTeamRank = -1; // teams don't have a "you" concept the same way

  return (
    <div className="min-h-screen px-5 pt-6 pb-28 space-y-6">

      {/* Header */}
      <div>
        <p className="text-xs font-bold tracking-[0.2em] uppercase mb-1"
          style={{ background: "linear-gradient(90deg, #ff6b9d, #ff9f43, #ffdd59, #48cfad, #4fc3f7, #667eea)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Queers & Allies Fitness
        </p>
        <h1 className="text-3xl font-display font-extrabold text-slate-900 tracking-tight">
          Leaderboard
        </h1>
      </div>

      {/* Tab toggle */}
      <div className="flex p-1 rounded-full bg-white shadow-sm" style={{ border: "1px solid #E5E5EA" }}>
        <button
          onClick={() => setTab("teams")}
          className="flex-1 py-2.5 rounded-full text-sm font-bold transition-all"
          style={tab === "teams" ? {
            background: "linear-gradient(90deg, #ff6b9d, #ff9f43, #ffdd59, #48cfad, #4fc3f7, #667eea)",
            color: "#1a1a1a",
          } : { color: "#8E8E93" }}
        >
          Teams
        </button>
        <button
          onClick={() => setTab("individual")}
          className="flex-1 py-2.5 rounded-full text-sm font-bold transition-all"
          style={tab === "individual" ? {
            background: "linear-gradient(90deg, #ff6b9d, #ff9f43, #ffdd59, #48cfad, #4fc3f7, #667eea)",
            color: "#1a1a1a",
          } : { color: "#8E8E93" }}
        >
          Individual
        </button>
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
              <p className="text-sm text-slate-500 mt-1">Check back once challenges are active</p>
            </div>
          ) : (
            <>
              {teams.length >= 2 && (
                <Podium
                  items={teams}
                  getName={(t) => t.name}
                  getPoints={(t) => t.avg_points}
                />
              )}

              {/* Rank list — clean, no circles */}
              <div className="neon-card rounded-2xl overflow-hidden">
                {teams.map((team, index) => {
                  const rank = index + 1;
                  const medal = getMedal(rank);
                  return (
                    <div key={team.id} className="flex items-center gap-4 px-5 py-4 border-b border-slate-100 last:border-0">
                      <div className="w-6 text-center flex-shrink-0">
                        {medal
                          ? <span className="text-base">{medal}</span>
                          : <span className="text-sm font-bold text-slate-400">{rank}</span>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900">{team.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5 font-medium">
                          {team.member_count} member{team.member_count !== 1 ? "s" : ""} · {team.total_points} total pts
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-2xl font-extrabold text-slate-900">{team.avg_points}</p>
                        <p className="text-xs text-slate-400 font-medium">avg pts</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="neon-card rounded-2xl px-5 py-3 text-center">
                <p className="text-xs text-slate-500 font-medium">
                  Team score = total points ÷ members, rounded up
                </p>
              </div>
            </>
          )}
        </div>

      ) : (
        /* Individual tab */
        <div className="space-y-3">
          {individuals.length === 0 ? (
            <div className="neon-card rounded-2xl p-12 text-center">
              <p className="text-2xl mb-2">💪</p>
              <p className="font-bold text-slate-800">No check-ins yet</p>
              <p className="text-sm text-slate-500 mt-1">Be the first to log a workout!</p>
            </div>
          ) : (
            <>
              {individuals.length >= 2 && (
                <Podium
                  items={individuals}
                  getName={(p) => p.name || "User"}
                  getPoints={(p) => p.total_points || 0}
                />
              )}

              {/* Rank list — clean, no circles */}
              <div className="neon-card rounded-2xl overflow-hidden">
                {individuals.map((person, index) => {
                  const rank = index + 1;
                  const medal = getMedal(rank);
                  const isMe = user?.name === person.name;
                  if (isMe) return null; // render "You" card separately below
                  return (
                    <div key={person.id} className="flex items-center gap-4 px-5 py-4 border-b border-slate-100 last:border-0">
                      <div className="w-6 text-center flex-shrink-0">
                        {medal
                          ? <span className="text-base">{medal}</span>
                          : <span className="text-sm font-bold text-slate-400">{rank}</span>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900">{person.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5 font-medium">
                          🔥 {person.streak || 0}-day streak
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-2xl font-extrabold text-slate-900">{person.total_points || 0}</p>
                        <p className="text-xs text-slate-400 font-medium">points</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Dark "You" card pinned at bottom */}
              {myIndividualRank >= 0 && (
                <div
                  className="rounded-2xl px-5 py-4 flex items-center gap-4"
                  style={{ background: "#1C1C1E" }}
                >
                  <div className="w-6 text-center flex-shrink-0">
                    {getMedal(myIndividualRank + 1)
                      ? <span className="text-base">{getMedal(myIndividualRank + 1)}</span>
                      : <span className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.4)" }}>#{myIndividualRank + 1}</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white">
                      {individuals[myIndividualRank].name} <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>(You)</span>
                    </p>
                    <p className="text-xs mt-0.5 font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>
                      🔥 {individuals[myIndividualRank].streak || 0}-day streak
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-2xl font-extrabold text-white">
                      {individuals[myIndividualRank].total_points || 0}
                    </p>
                    <p className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>points</p>
                  </div>
                </div>
              )}

              {/* Nudge if not in top 3 */}
              {myIndividualRank > 2 && individuals[myIndividualRank - 1] && (
                <div className="neon-card rounded-2xl px-5 py-3 flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#FF6B9D" }} />
                  <p className="text-xs font-semibold text-slate-500">
                    You're <strong className="text-slate-900">{(individuals[myIndividualRank - 1].total_points || 0) - (individuals[myIndividualRank].total_points || 0)} pts</strong> away from passing {individuals[myIndividualRank - 1].name}
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