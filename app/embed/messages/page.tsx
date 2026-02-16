"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getChallenges, Challenge } from "@/lib/storage";

export default function MessagesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);

  useEffect(() => {
    async function loadChallenges() {
      const data = await getChallenges();
      setChallenges(data);
    }
    loadChallenges();
  }, []);

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
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500 mb-2">MESSAGES</p>
        <h2 className="text-4xl font-display">Your Conversations</h2>
      </div>

      {/* Challenge List */}
      <div className="space-y-4">
        {challenges.map((challenge) => (
          <Link key={challenge.id} href={`/embed/challenge/${challenge.id}`}>
            <div className="neon-card rounded-3xl p-6 hover:-translate-y-1 hover:shadow-2xl transition-all duration-200 cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold mb-1">{challenge.name}</h3>
                  <p className="text-sm text-slate-600">View messages in this challenge</p>
                </div>
                <button className="px-4 py-2 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition text-sm">
                  Open →
                </button>
              </div>
            </div>
          </Link>
        ))}

        {challenges.length === 0 && (
          <div className="neon-card rounded-3xl p-12 text-center">
            <p className="text-slate-500 mb-4">No challenges yet. Messages will appear here once you join or create a challenge!</p>
            <Link href="/embed/challenges">
              <button className="rainbow-cta rounded-full px-6 py-3 font-semibold">
                View Challenges
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}