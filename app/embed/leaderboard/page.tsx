"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/UserContext";
import { supabase } from "@/lib/supabase";

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
  const [tab, setTab] = useState<'teams' | 'individual'>('teams');

  const navigate = (path: string) => router.push(path + getUserParams());

  useEffect(() => {
    async function loadLeaderboard() {
      const { data: users } = await supabase
        .from('users')
        .select('id, name, streak, total_points')
        .order('total_points', { ascending: false })
        .limit(20);

      if (users) setIndividuals(users);

      const { data: teamData } = await supabase
        .from('teams')
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
        .in('name', ['Team Hayden', 'Team Aria', 'Team Tiffany']);

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
            color: team.color || '#6366f1',
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

  return (
    <div className="space-y-8">
      {/* Nav */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <button onClick={() => navigate("/embed/challenges")}
          className="px-4 py-2 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition text-sm">
          ← Back to Challenges
        </button>
        <div className="flex gap-3">
          <button onClick={() => router.push("/")}
            className="px-4 py-2 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition text-sm">
            Home
          </button>
          {user && (
            <button onClick={() => navigate("/embed/dashboard")}
              className="rainbow-cta rounded-full px-5 py-2 font-semibold text-sm hover:shadow-xl transition-shadow">
              Dashboard
            </button>
          )}
        </div>
      </div>

      {/* Header */}
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500 mb-2">LEADERBOARD</p>
        <h2 className="text-4xl font-display">Standings</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('teams')}
          className={`px-5 py-2 rounded-full font-semibold text-sm transition ${
            tab === 'teams'
              ? 'rainbow-cta'
              : 'border border-slate-300 bg-white/80 hover:bg-white'
          }`}
        >
          Team Standings
        </button>
        <button
          onClick={() => setTab('individual')}
          className={`px-5 py-2 rounded-full font-semibold text-sm transition ${
            tab === 'individual'
              ? 'rainbow-cta'
              : 'border border-slate-300 bg-white/80 hover:bg-white'
          }`}
        >
          Individual
        </button>
      </div>

      {loading ? (
        <div className="neon-card rounded-3xl p-12 text-center">
          <p className="text-slate-500">Loading standings...</p>
        </div>
      ) : tab === 'teams' ? (
        <div className="space-y-4">
          {teams.length === 0 ? (
            <div className="neon-card rounded-3xl p-12 text-center">
              <p className="text-slate-500">No team data yet!</p>
            </div>
          ) : (
            teams.map((team, index) => {
              const rank = index + 1;
              const medal = getMedal(rank);
              return (
                <div key={team.id}
                  className={`neon-card rounded-3xl p-6 ${rank === 1 ? 'shadow-lg' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold ${
                        rank === 1 ? 'bg-yellow-100' :
                        rank === 2 ? 'bg-slate-100' :
                        'bg-orange-100'
                      }`}>
                        {medal || rank}
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">{team.name}</h3>
                        <p className="text-sm text-slate-500">
                          {team.member_count} member{team.member_count !== 1 ? 's' : ''} • {team.total_points} total pts
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold">{team.avg_points}</p>
                      <p className="text-xs text-slate-500 uppercase tracking-wider">avg pts</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div className="neon-card rounded-3xl p-4 text-center">
            <p className="text-sm text-slate-600">
              💡 Team score = total points ÷ members, rounded up
            </p>
          </div>
        </div>
      ) : (
        <div className="neon-card rounded-3xl p-6">
          <div className="space-y-3">
            {individuals.length === 0 ? (
              <p className="text-slate-500 text-center py-8">No check-ins yet! Be the first 💪</p>
            ) : (
              individuals.map((user, index) => {
                const rank = index + 1;
                const medal = getMedal(rank);
                return (
                  <div key={user.id}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                      rank <= 3 ? 'bg-white shadow border-slate-200' : 'bg-white/60 border-slate-100'
                    }`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                        rank === 1 ? 'bg-yellow-100 text-yellow-700 text-lg' :
                        rank === 2 ? 'bg-slate-100 text-slate-600 text-lg' :
                        rank === 3 ? 'bg-orange-100 text-orange-600 text-lg' :
                        'bg-slate-50 text-slate-500 text-sm'
                      }`}>
                        {medal || rank}
                      </div>
                      <div>
                        <p className="font-semibold">{user.name}</p>
                        <p className="text-xs text-slate-500">🔥 {user.streak || 0} day streak</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold">{user.total_points || 0}</p>
                      <p className="text-xs text-slate-500 uppercase tracking-wider">points</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}