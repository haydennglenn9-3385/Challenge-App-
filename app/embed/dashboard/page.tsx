"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/UserContext";
import { supabase } from "@/lib/supabase";

function DashboardContent() {
  const router = useRouter();
  const { user: wixUser, getUserParams } = useUser();
  const [profile, setProfile] = useState<any>(null);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const navigate = (path: string) => router.push(path + getUserParams());

  useEffect(() => {
    async function loadData() {
      if (!wixUser) {
        setLoading(false);
        return;
      }

      // Get user profile
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('wix_id', wixUser.userId)
        .single();

      if (userData) {
        setProfile(userData);

        // Get user's challenges
        const { data: challengeData } = await supabase
          .from('challenge_members')
          .select(`
            challenge_id,
            challenges (*)
          `)
          .eq('user_id', userData.id);

        if (challengeData) {
          setChallenges(challengeData.map((c: any) => c.challenges));
        }
      }

      setLoading(false);
    }

    loadData();
  }, [wixUser]);

  if (!wixUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="neon-card rounded-3xl p-12 text-center max-w-md">
          <h2 className="text-2xl font-display mb-4">Dashboard</h2>
          <p className="text-slate-600 mb-6">Log in to see your dashboard</p>
          <a href="https://www.queersandalliesfitness.com/account/member">
            <button className="rainbow-cta px-6 py-3 rounded-full font-semibold">
              Log in / Sign up
            </button>
          </a>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-10 text-center">
        <p className="text-slate-500">Loading your dashboard…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Nav */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <button onClick={() => router.push("/")}
          className="px-4 py-2 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition text-sm">
          ← Home
        </button>
        <div className="flex gap-3">
          <button onClick={() => navigate("/embed/challenges")}
            className="px-4 py-2 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition text-sm">
            All Challenges
          </button>
          <button onClick={() => navigate("/embed/leaderboard")}
            className="px-4 py-2 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition text-sm">
            Leaderboard
          </button>
        </div>
      </div>

      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500 mb-2">DASHBOARD</p>
        <h2 className="text-4xl font-display">Welcome back, {profile?.name || 'friend'}!</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Stats */}
        <div className="neon-card rounded-3xl p-6">
          <h3 className="text-xl font-semibold mb-4">Your Stats</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Streak</span>
              <span className="text-2xl font-bold">🔥 {profile?.streak || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Total Points</span>
              <span className="text-2xl font-bold">⭐ {profile?.total_points || 0}</span>
            </div>
          </div>
        </div>

        {/* Account */}
        <div className="neon-card rounded-3xl p-6">
          <h3 className="text-xl font-semibold mb-4">Account</h3>
          <div className="space-y-2 text-sm">
            <p className="text-slate-700"><strong>Name:</strong> {profile?.name}</p>
            <p className="text-slate-700"><strong>Email:</strong> {profile?.email}</p>
          </div>
          <a href="https://www.queersandalliesfitness.com/account/member" className="mt-4 block">
            <button className="px-4 py-2 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition text-sm">
              Manage Account →
            </button>
          </a>
        </div>
      </div>

      {/* Current Challenges */}
      <div className="neon-card rounded-3xl p-6">
        <h3 className="text-xl font-semibold mb-4">Your Challenges</h3>
        {challenges.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-500 mb-4">You haven't joined any challenges yet!</p>
            <button onClick={() => navigate("/embed/challenges")}
              className="rainbow-cta px-6 py-3 rounded-full font-semibold">
              Browse Challenges
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {challenges.map((challenge: any) => (
              <button
                key={challenge.id}
                onClick={() => navigate(`/embed/challenge/${challenge.id}`)}
                className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-200 bg-white/80 hover:shadow-md transition text-left"
              >
                <div>
                  <p className="font-semibold">{challenge.name}</p>
                  <p className="text-sm text-slate-500">Code: {challenge.join_code}</p>
                </div>
                <span className="text-sm font-semibold text-slate-600">View →</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading dashboard…</div>}>
      <DashboardContent />
    </Suspense>
  );
}