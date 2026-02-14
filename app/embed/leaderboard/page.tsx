"use client";

import { useEffect, useState } from "react";
import { ensureSeedData, getLeaderboard, LeaderboardEntry } from "@/lib/storage";

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    ensureSeedData();
    setEntries(getLeaderboard());
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Rankings</p>
        <h2 className="text-3xl font-display">Leaderboard</h2>
        <p className="text-slate-600">Top streaks across every challenge.</p>
      </div>

      <div className="neon-card rounded-3xl p-6">
        <div className="space-y-3">
          {entries.map((entry, index) => (
            <div
              key={`${entry.challengeId}-${entry.id}`}
              className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white/80 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg font-display">#{index + 1}</span>
                <div>
                  <p className="font-semibold">{entry.name}</p>
                  <p className="text-xs text-slate-500">{entry.challengeTitle}</p>
                </div>
              </div>
              <span className="text-sm font-semibold">{entry.streak} days</span>
            </div>
          ))}
          {entries.length === 0 && (
            <p className="text-sm text-slate-500">No streaks yet. Time to move.</p>
          )}
        </div>
      </div>
    </div>
  );
}
