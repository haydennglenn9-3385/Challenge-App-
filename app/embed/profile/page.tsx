"use client";

import { useRouter } from "next/navigation";
import { useUser } from "@/lib/UserContext";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface UserStats {
  streak: number;
  total_points: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, getUserParams } = useUser();
  const [stats, setStats] = useState<UserStats | null>(null);

  const navigate = (path: string) => {
    router.push(path + getUserParams());
  };

  useEffect(() => {
    async function loadStats() {
      if (!user) return;
      const { data } = await supabase
        .from('users')
        .select('streak, total_points')
        .eq('wix_id', user.userId)
        .single();
      if (data) setStats(data);
    }
    loadStats();
  }, [user]);

  if (!user) {
    return (
      <div className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <button
            onClick={() => navigate("/embed/challenges")}
            className="px-4 py-2 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition text-sm"
          >
            ← Back to Challenges
          </button>
        </div>
        <div className="neon-card rounded-3xl p-8 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500 mb-2">PROFILE</p>
          <h2 className="text-3xl font-display mb-4">Your Profile</h2>
          <p className="text-slate-600 mb-2">You need to be logged in to view your profile.</p>
          <p className="text-sm text-slate-500 mb-6">
            When viewing this page through your Wix site while logged in, your profile information will appear here.
          </p>
          <a href="https://www.queersandalliesfitness.com/account/member">
            <button className="rainbow-cta rounded-full px-6 py-3 font-semibold">
              Log in / Sign up
            </button>
          </a>
        </div>
      </div>
    );
  }

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
            onClick={() => navigate("/embed/leaderboard")}
            className="px-4 py-2 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition text-sm"
          >
            Leaderboard
          </button>
        </div>
      </div>

      {/* Profile Header */}
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500 mb-2">PROFILE</p>
        <h2 className="text-4xl font-display">Your Profile</h2>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="neon-card rounded-3xl p-6 text-center">
          <p className="text-4xl font-bold mb-1">🔥 {stats?.streak || 0}</p>
          <p className="text-sm text-slate-500 uppercase tracking-wider">Day Streak</p>
        </div>
        <div className="neon-card rounded-3xl p-6 text-center">
          <p className="text-4xl font-bold mb-1">⭐ {stats?.total_points || 0}</p>
          <p className="text-sm text-slate-500 uppercase tracking-wider">Total Points</p>
        </div>
      </div>

      {/* Profile Info */}
      <div className="neon-card rounded-3xl p-8 space-y-5">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Name</p>
          <p className="text-lg font-semibold">{user.name}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Email</p>
          <p className="text-lg font-semibold">{user.email}</p>
        </div>

        <div className="pt-4 border-t border-slate-200">
          <p className="text-sm text-slate-500 mb-4">
            Your account is managed through Wix Members. To update your name, email, or password, visit your member profile.
          </p>
          <a href="https://www.queersandalliesfitness.com/account/member">
            <button className="px-5 py-2 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition text-sm">
              Manage Account →
            </button>
          </a>
        </div>
      </div>
    </div>
  );
}