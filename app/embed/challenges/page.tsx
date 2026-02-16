"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ensureSeedData, getChallenges, Challenge } from "@/lib/storage";
import Link from "next/link";

function ChallengesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [wixUser, setWixUser] = useState<{ userId?: string; email?: string; name?: string } | null>(null);

  // Get Wix user data from URL params
  useEffect(() => {
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');
    const name = searchParams.get('name');

    if (userId && email) {
      setWixUser({ userId, email, name: name || 'Member' });
      
      // Sync user to Supabase
      fetch('/api/user/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wixId: userId,
          email: email,
          name: name || 'Member',
        }),
      }).catch(err => console.error('Failed to sync user:', err));
    }
  }, [searchParams]);

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

      {/* Debug: Show if user is logged in */}
      {wixUser && (
        <div className="neon-card rounded-2xl p-4 bg-green-50 border border-green-200">
          <p className="text-sm text-green-800">
            ✅ Logged in as: {wixUser.name} ({wixUser.email})
          </p>
        </div>
      )}

      {/* Page Header */}
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500 mb-2">CHALLENGES</p>
        <h2 className="text-4xl font-display">All Challenges</h2>
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

export default function ChallengesPage() {
  return (
    <Suspense fallback={
      <div className="space-y-8">
        <div className="flex items-center justify-center p-12">
          <p className="text-slate-500">Loading challenges...</p>
        </div>
      </div>
    }>
      <ChallengesContent />
    </Suspense>
  );
}