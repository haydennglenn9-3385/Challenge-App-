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

const AVATAR_COLORS = [
  "#fde0ef", "#d4f5e2", "#fdf6d3", "#e8d9f7", "#d4eaf7",
  "#ffe4cc", "#d4f0f7", "#f7d4e8",
];

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
          id,
          name,
          color,
          team_members (
            user_id,
            users (
              total_points
            )
          )
        `)
        .in("name", ["Team Hayden", "Team Aria", "Team Tiffany"]);

      if (teamData) {
        const standings: TeamStanding[] = teamData.map((team: any) => {
          const members = team.team_members || [];
          const memberCount = members.length;
          const totalPoints = members.reduce((sum: number, tm: any) => {
            return sum + (tm.users?.total_points || 0);
          }, 0);
          const avgPoints = memberCount > 0 ? Math.ceil(totalPoints / memberCount) : 0;
          return {
            id: team.id,
            name: team.name,
            color: team.color || "#6366f1",
            avg_points: avgPoints,
            total_points: totalPoints,
            member_count: memberCount,
          };
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

  // Podium — top 3 only
  const podiumOrder = (list: TeamStanding[] | LeaderboardUser[]) => {
    if (list.length < 2) return list;
    const [first, second, third, ...rest] = list as any[];
    return third
      ? [second, first, third, ...rest]
      : [second, first, ...rest];
  };

  return (
    <div className="min-h-screen px-5 pt-6 pb-28 space-y-6">

      {/* Header */}
      <div>
        <p
          className="text-xs font-bold tracking-[0.2em] uppercase mb-1"
          style={{
            background: "linear-gradient(90deg, #ff6b9d, #ff9f43, #ffdd59, #48cfad, #4fc3f7, #667eea)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
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
          className={`flex-1 py-2.5 rounded-full text-sm font-bold transition-all ${
            tab === "teams" ? "text-slate-900" : "text-slate-400"
          }`}
          style={tab === "teams" ? {
            background: "linear-gradient(90deg, #ff6b9d, #ff9f43, #ffdd59, #48cfad, #4fc3f7, #667eea)",
            color: "#1a1a1a",
          } : {}}
        >
          Teams
        </button>
        <button
          onClick={() => setTab("individual")}
          className={`flex-1 py-2.5 rounded-full text-sm font-bold transition-all ${
            tab === "individual" ? "text-slate-900" : "text-slate-400"
          }`}
          style={tab === "individual" ? {
            background: "linear-gradient(90deg, #ff6b9d, #ff9f43, #ffdd59, #48cfad, #4fc3f7, #667eea)",
            color: "#1a1a1a",
          } : {}}
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
              {/* Podium — top 3 */}
              {teams.length >= 2 && (
                <div className="neon-card rounded-2xl p-5 mb-2">
                  <div className="flex items-end justify-center gap-3 h-36">
                    {podiumOrder(teams.slice(0, 3)).map((team: TeamStanding, i: number) => {
                      const actualRank = teams.indexOf(team) + 1;
                      const heights = ["h-20", "h-28", "h-16"];
                      const isFirst = actualRank === 1;
                      return (
                        <div key={team.id} className="flex flex-col items-center gap-2 flex-1">
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold"
                            style={{ background: AVATAR_COLORS[i], flexShrink: 0 }}
                          >
                            {getMedal(actualRank) || actualRank}
                          </div>
                          <p className="text-xs font-bold text-slate-700 text-center leading-tight">
                            {team.name.replace("Team ", "")}
                          </p>
                          <div
                            className={`w-full ${heights[i]} rounded-t-xl flex items-center justify-center`}
                            style={isFirst ? {
                              // 1st — soft rainbow pastel
                              background: "linear-gradient(180deg, #ffb3c8, #ffd4a3, #fff5a3, #b3f0dc, #b3d4f7)",
                            } : actualRank === 2 ? {
                              // 2nd — soft trans flag (sky blue → blush pink)
                              background: "linear-gradient(180deg, #a8e6f8, #ffffff, #f9c6d4)",
                            } : {
                              // 3rd — soft pan flag (blush → butter → sky)
                              background: "linear-gradient(180deg, #f9a8d4, #fde68a, #a5d8f3)",
                            }}
                          >
                            <span className="font-bold text-sm" style={{ color: "#666" }}>{actualRank}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Full list */}
              {teams.map((team, index) => {
                const rank = index + 1;
                const medal = getMedal(rank);
                return (
                  <div
                    key={team.id}
                    className={`neon-card rounded-2xl overflow-hidden ${rank === 1 ? "shadow-md" : ""}`}
                  >
                    {rank === 1 && <div className="h-1 w-full rainbow-cta" />}
                    <div className="px-5 py-4 flex items-center gap-4">
                      <div
                        className="w-11 h-11 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0"
                        style={{ background: AVATAR_COLORS[index % AVATAR_COLORS.length] }}
                      >
                        {medal || rank}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900">{team.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5 font-medium">
                          {team.member_count} member{team.member_count !== 1 ? "s" : ""} · {team.total_points} total pts
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-2xl font-extrabold text-slate-900">{team.avg_points}</p>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">avg pts</p>
                      </div>
                    </div>
                  </div>
                );
              })}

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
              {/* Podium — top 3 */}
              {individuals.length >= 2 && (
                <div className="neon-card rounded-2xl p-5 mb-2">
                  <div className="flex items-end justify-center gap-3 h-36">
                    {podiumOrder(individuals.slice(0, 3)).map((person: LeaderboardUser, i: number) => {
                      const actualRank = individuals.indexOf(person) + 1;
                      const heights = ["h-20", "h-28", "h-16"];
                      const isFirst = actualRank === 1;
                      const initials = person.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "?";
                      return (
                        <div key={person.id} className="flex flex-col items-center gap-2 flex-1">
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                            style={{ background: AVATAR_COLORS[i] }}
                          >
                            {getMedal(actualRank) || initials}
                          </div>
                          <p className="text-xs font-bold text-slate-700 text-center leading-tight truncate w-full px-1">
                            {person.name?.split(" ")[0] || "User"}
                          </p>
                          <div
                            className={`w-full ${heights[i]} rounded-t-xl flex items-center justify-center`}
                            style={isFirst ? {
                              // 1st — soft rainbow pastel
                              background: "linear-gradient(180deg, #ffb3c8, #ffd4a3, #fff5a3, #b3f0dc, #b3d4f7)",
                            } : actualRank === 2 ? {
                              // 2nd — soft trans flag (sky blue → white → blush pink)
                              background: "linear-gradient(180deg, #a8e6f8, #ffffff, #f9c6d4)",
                            } : {
                              // 3rd — soft pan flag (blush → butter → sky)
                              background: "linear-gradient(180deg, #f9a8d4, #fde68a, #a5d8f3)",
                            }}
                          >
                            <span className="font-bold text-sm" style={{ color: "#666" }}>{actualRank}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Full individual list */}
              {individuals.map((person, index) => {
                const rank = index + 1;
                const medal = getMedal(rank);
                const initials = person.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "?";
                const isMe = user?.name === person.name;
                return (
                  <div
                    key={person.id}
                    className="neon-card rounded-2xl overflow-hidden"
                    style={isMe ? { background: "#1C1C1E" } : {}}
                  >
                    {rank === 1 && !isMe && <div className="h-1 w-full rainbow-cta" />}
                    <div className="px-5 py-4 flex items-center gap-4">
                      <div
                        className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                        style={{ background: isMe ? "#FF6B9D" : AVATAR_COLORS[index % AVATAR_COLORS.length] }}
                      >
                        <span style={isMe ? { color: "white" } : {}}>{medal || initials}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-bold ${isMe ? "text-white" : "text-slate-900"}`}>
                          {person.name}{isMe && " (You)"}
                        </p>
                        <p className={`text-xs mt-0.5 font-medium ${isMe ? "text-white/40" : "text-slate-500"}`}>
                          🔥 {person.streak || 0}-day streak
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-2xl font-extrabold ${isMe ? "text-white" : "text-slate-900"}`}>
                          {person.total_points || 0}
                        </p>
                        <p className={`text-xs font-bold uppercase tracking-wide ${isMe ? "text-white/40" : "text-slate-400"}`}>
                          points
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}