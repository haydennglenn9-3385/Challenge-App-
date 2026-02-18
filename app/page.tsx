"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function HomePage() {
  const [popularChallenges, setPopularChallenges] = useState<any[]>([]);

  useEffect(() => {
    async function loadChallenges() {
      // Get public challenges with member counts
      const { data: challenges } = await supabase
        .from('challenges')
        .select(`
          id,
          name,
          join_code,
          start_date,
          end_date,
          is_public,
          challenge_members(count)
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(3);

      if (challenges) {
        setPopularChallenges(challenges);
      }
    }
    loadChallenges();
  }, []);

  const getDaysLeft = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16">
      <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 gap-16 items-center">

        {/* LEFT SIDE */}
        <div className="space-y-6">
          <span
            className="neon-chip px-4 py-1 rounded-full text-sm font-semibold inline-block"
            style={{ background: "white", color: "var(--neon-ink)" }}
          >
            Invite-only fitness challenges
          </span>

          <h1 className="text-5xl font-display leading-tight">
            Queers and Allies Fitness Challenge
          </h1>

          <p className="text-lg text-slate-700 max-w-md">
            Spark friendly competition, track streaks, and keep your gym crew moving together.
            Create vibrant challenges and cheer each other on every day.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Link href="/embed/dashboard">
              <button className="rainbow-cta px-6 py-3 rounded-full font-semibold text-base">
                Dashboard
              </button>
            </Link>

            <Link href="/embed/challenges">
              <button className="px-6 py-3 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition">
                View Challenges
              </button>
            </Link>

            <Link href="/embed/join">
              <button className="px-6 py-3 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition">
                Join with code
              </button>
            </Link>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="neon-card rounded-3xl p-8 space-y-6">
          <div className="flex items-center gap-2">
            <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-semibold">Popular</span>
            <h2 className="font-semibold text-lg">Active Challenges</h2>
          </div>

          <div className="space-y-4">
            {popularChallenges.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-500 text-sm">No public challenges yet. Be the first to create one!</p>
              </div>
            ) : (
              popularChallenges.map((challenge) => {
                const memberCount = challenge.challenge_members?.[0]?.count || 0;
                const daysLeft = getDaysLeft(challenge.end_date);
                
                return (
                  <div key={challenge.id} className="bg-white rounded-2xl p-4 shadow hover:shadow-md transition">
                    <p className="font-semibold">{challenge.name}</p>
                    <p className="text-sm text-slate-600">
                      {memberCount} member{memberCount !== 1 ? 's' : ''} • {daysLeft} days left
                    </p>
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-2 border-t border-slate-200">
            <Link href="/embed/challenges">
              <button className="w-full px-4 py-2 rounded-full font-semibold border border-slate-300 bg-white hover:bg-slate-50 transition text-sm">
                Browse all challenges →
              </button>
            </Link>
          </div>
        </div>

      </div>
    </main>
  );
}