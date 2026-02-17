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
}

export default function LeaderboardPage() {
  const router = useRouter();
  const { getUserParams } = useUser();
  const [leaders, setLeaders] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  const navigate = (path: string) => {
    router.push(path + getUserParams());
  };

  useEffect(() => {
    async function loadLeaderboard() {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, streak, total_points')
        .order('total_points', { ascending: false })
        .limit(20);

      if (!error && data) {
        setLeaders(data);
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
      {/* Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <button
          onClick={() => navigate("/embed/challenges")}
          className="px-4 py-2 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition text-sm"
        >
          ← Back to Challenges
        </button>
        <div className="flex gap-3">
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition text-sm"
          >
            Home
          </button>
          <button
            onClick={() => navigate("/embed/profile")}
            className="px-4 py-2 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition text-sm"
          >
            Profile
          </button>
        </div>
      </div>

      {/* Page Header */}
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500 mb-2">LEADERBOARD</p>
        <h2 className="text-4xl font-display">Top Performers</h2>
        <p className="text-sm text-slate-600 mt-1">Ranked by total points</p>
      </div>

      {loading ? (
        <div className="neon-card rounded-3xl p-12 text-center">
          <p className="text-slate-500">Loading leaderboard...</p>
        </div>
      ) : leaders.length === 0 ? (
        <div className="neon-card rounded-3xl p-12 text-center">
          <p className="text-slate-500 mb-2">No one on the leaderboard yet!</p>
          <p className="text-sm text-slate-400">Start checking in to earn points 💪</p>
        </div>
      ) : (
        <div className="neon-card rounded-3xl p-6">
          <div className="space-y-3">
            {leaders.map((user, index) => {
              const rank = index + 1;
              const medal = getMedal(rank);
              return (
                <div
                  key={user.id}
                  className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                    rank <= 3
                      ? "bg-white shadow border-slate-200"
                      : "bg-white/60 border-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                      rank === 1 ? "bg-yellow-100 text-yellow-700" :
                      rank === 2 ? "bg-slate-100 text-slate-600" :
                      rank === 3 ? "bg-orange-100 text-orange-600" :
                      "bg-slate-50 text-slate-500 text-sm"
                    }`}>
                      {medal || rank}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{user.name}</p>
                      <p className="text-xs text-slate-500">🔥 {user.streak || 0} day streak</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-slate-900">{user.total_points || 0}</p>
                    <p className="text-xs text-slate-500 uppercase tracking-wider">points</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* How points work */}
      <div className="neon-card rounded-3xl p-6">
        <h3 className="font-semibold mb-2">How points work 💡</h3>
        <p className="text-sm text-slate-600">
          Earn <strong>10 points</strong> for every daily check-in. The more consistent you are, the higher you climb!
        </p>
      </div>
    </div>
  );
}