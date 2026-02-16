"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ensureSeedData, getChallenges, Challenge } from "@/lib/storage";
import Link from "next/link";
import { useUser } from "@/contexts/UserContext";

export default function ChallengesPage() {
  const router = useRouter();
  const { user } = useUser();
  const [challenges, setChallenges] = useState<Challenge[]>([]);

  useEffect(() => {
    ensureSeedData();
    setChallenges(getChallenges());
  }, []);

  return (
    <div className="space-y-8">
      {/* Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <Link href="/">
          <button className="px-4 py-2 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition text-sm">
            ← Home
          </button>
        </Link>
        
        <div className="flex gap-3">
          <button
            onClick={() => router.push("/embed/challenges/new")}
            className="rainbow-cta rounded-full px-5 py-2 font-semibold text-sm hover:shadow-xl transition-shadow"
          >
            New challenge
          </button>
          <Link href="/embed/profile">
            <button className="px-4 py-2 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition text-sm">
              Profile
            </button>
          </Link>
          <Link href="/embed/leaderboard">
            <button className="px-4 py-2 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition text-sm">
              Leaderboard
            </button>
          </Link>
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
            onClick={() => router.push(`/embed/challenge/${challenge.id}`)}
            className="neon-card rounded-3xl px-6 py-6 text-left hover:-translate-y-1 hover:shadow-2xl transition-all duration-200"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <h3 className="text-xl font-semibold text-slate-900">{challenge.title}</h3>
              <span className="neon-chip rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap">
                {challenge.duration} days
              </span>
            </div>
            {challenge.description && (
              <p className="text-sm text-slate-600 leading-relaxed">{challenge.description}</p>
            )}
          </button>
        ))}
      </div>

      {challenges.length === 0 && (
        <div className="neon-card rounded-3xl p-12 text-center">
          <p className="text-slate-500 mb-4">No challenges yet. Start your first one!</p>
          <button
            onClick={() => router.push("/embed/challenges/new")}
            className="rainbow-cta rounded-full px-6 py-3 font-semibold"
          >
            Create Challenge
          </button>
        </div>
      )}
    </div>
  );
}