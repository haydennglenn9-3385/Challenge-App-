"use client";

import Link from "next/link";

export default function LeaderboardPage() {
  // Mock leaderboard data
  const leaderboard = [
    { rank: 1, name: "Alex", streak: 28, points: 420 },
    { rank: 2, name: "Jordan", streak: 25, points: 390 },
    { rank: 3, name: "Taylor", streak: 23, points: 350 },
    { rank: 4, name: "Sam", streak: 21, points: 315 },
    { rank: 5, name: "Casey", streak: 19, points: 285 },
  ];

  return (
    <div className="space-y-8">
      {/* Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <Link href="/embed/challenges">
          <button className="px-4 py-2 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition text-sm">
            ← Back to Challenges
          </button>
        </Link>
        
        <div className="flex gap-3">
          <Link href="/">
            <button className="px-4 py-2 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition text-sm">
              Home
            </button>
          </Link>
          <Link href="/embed/profile">
            <button className="px-4 py-2 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition text-sm">
              Profile
            </button>
          </Link>
        </div>
      </div>

      {/* Page Header */}
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500 mb-2">LEADERBOARD</p>
        <h2 className="text-4xl font-display">Top Performers</h2>
      </div>

      {/* Leaderboard */}
      <div className="neon-card rounded-3xl p-8">
        <div className="space-y-4">
          {leaderboard.map((user) => (
            <div
              key={user.rank}
              className="flex items-center justify-between p-4 rounded-2xl bg-white/80 border border-slate-100"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold">
                  {user.rank}
                </div>
                <div>
                  <p className="font-semibold text-lg">{user.name}</p>
                  <p className="text-sm text-slate-600">{user.streak} day streak</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-slate-900">{user.points}</p>
                <p className="text-xs text-slate-500 uppercase tracking-wider">Points</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Info Card */}
      <div className="neon-card rounded-3xl p-6">
        <p className="text-sm text-slate-600">
          <strong>How points work:</strong> Earn 10 points per check-in, plus bonus points for maintaining streaks!
        </p>
      </div>
    </div>
  );
}