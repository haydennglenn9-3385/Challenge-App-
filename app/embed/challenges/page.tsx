"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getChallenges, Challenge } from "@/lib/storage";
import { useUser } from "@/lib/UserContext";

export default function ChallengesPage() {
  const router = useRouter();
  const { user, getUserParams } = useUser();
  const [challenges, setChallenges] = useState<Challenge[]>([]);

  useEffect(() => {
    async function loadChallenges() {
      const data = await getChallenges();
      setChallenges(data);
    }
    loadChallenges();
  }, []);

  const getDuration = (challenge: Challenge) => {
    const start = new Date(challenge.start_date);
    const end = new Date(challenge.end_date);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  const navigate = (path: string) => router.push(path + getUserParams());

  return (
    <div className="space-y-8">
      {/* Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <button onClick={() => router.push("/")}
          className="px-4 py-2 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition text-sm">
          ← Home
        </button>

        <div className="flex gap-3">
          {user && (
            <button onClick={() => navigate("/embed/dashboard")}
              className="rainbow-cta rounded-full px-5 py-2 font-semibold text-sm hover:shadow-xl transition-shadow">
              Dashboard
            </button>
          )}
          <button onClick={() => navigate("/embed/challenges/new")}
            className="px-4 py-2 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition text-sm">
            New challenge
          </button>
          <button onClick={() => navigate("/embed/leaderboard")}
            className="px-4 py-2 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition text-sm">
            Leaderboard
          </button>
        </div>
      </div>

      {/* Page Header */}
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500 mb-2">CHALLENGES</p>
        <h2 className="text-4xl font-display">All Challenges</h2>
        {user && (
          <p className="text-sm text-slate-600 mt-1">Welcome back, {user.name}! 👋</p>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {challenges.map((challenge) => (
          <button
            key={challenge.id}
            onClick={() => navigate(`/embed/challenge/${challenge.id}`)}
            className="neon-card rounded-3xl px-6 py-6 text-left hover:-translate-y-1 hover:shadow-2xl transition-all duration-200"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <h3 className="text-xl font-semibold text-slate-900">{challenge.name}</h3>
              <span className="neon-chip rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap">
                {getDuration(challenge)} days
              </span>
            </div>
            <p className="text-sm text-slate-600">
              Join code: <span className="font-semibold">{challenge.join_code}</span>
            </p>
          </button>
        ))}
      </div>

      {challenges.length === 0 && (
        <div className="neon-card rounded-3xl p-12 text-center">
          <p className="text-slate-500 mb-4">No challenges yet. Start your first one!</p>
          <button onClick={() => navigate("/embed/challenges/new")}
            className="rainbow-cta rounded-full px-6 py-3 font-semibold">
            Create Challenge
          </button>
        </div>
      )}
    </div>
  );
}