"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/utils/supabase/client";

// Decorative 75% progress ring with rainbow gradient
function ProgressRing() {
  return (
    <svg width="28" height="28" viewBox="0 0 36 36">
      <defs>
        <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF6EC7" />
          <stop offset="25%" stopColor="#FF8A00" />
          <stop offset="50%" stopColor="#A3FF00" />
          <stop offset="75%" stopColor="#00CFFF" />
          <stop offset="100%" stopColor="#9B5CFF" />
        </linearGradient>
      </defs>

      <circle
        cx="18"
        cy="18"
        r="16"
        stroke="#ffffff40"
        strokeWidth="4"
        fill="none"
      />

      <circle
        cx="18"
        cy="18"
        r="16"
        stroke="url(#ringGradient)"
        strokeWidth="4"
        fill="none"
        strokeDasharray="100"
        strokeDashoffset="25"
        strokeLinecap="round"
        className="animate-[fill_1.4s_ease-out_forwards]"
      />
    </svg>
  );
}

export default function HomeLandingPage() {
  const supabase = getSupabaseBrowserClient();

  const [challenges, setChallenges] = useState<any[]>([]);
  const [streakFeed, setStreakFeed] = useState<any[]>([]);

  useEffect(() => {
    fetchActiveChallenges();
    fetchStreakFeed();
  }, []);

  async function fetchActiveChallenges() {
    const { data } = await supabase
      .from("challenges")
      .select("*")
      .order("created_at", { ascending: false });

    const active =
      data?.filter((c: any) => {
        if (!c.end_date) return false;
        return new Date(c.end_date) > new Date();
      }) || [];

    setChallenges(active);
  }

  async function fetchStreakFeed() {
    const { data } = await supabase
      .from("streak_events")
      .select("id, user_name, streak_count")
      .order("created_at", { ascending: false })
      .limit(10);

    setStreakFeed(data || []);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-lime-200 via-pink-200 to-purple-200 pb-24">

      {/* Top Navigation */}
      <div className="flex items-center justify-between px-4 pt-5 mb-6">
        <Link href="/" className="text-sm font-medium text-slate-700">
          ← Back
        </Link>
        <h1 className="text-base font-semibold text-slate-700">Home</h1>
        <div className="hidden md:block">
          <Link
            href="/embed/new"
            className="px-4 py-2 rounded-full bg-white/70 backdrop-blur-xl shadow-md text-sm font-medium"
          >
            + New Challenge
          </Link>
        </div>
      </div>

      {/* Hero Section */}
      <div className="px-4 mb-8">
        <p className="text-xs tracking-widest text-slate-600 uppercase mb-1">
          Challenges
        </p>
        <h2 className="text-3xl font-bold text-slate-800 leading-tight">
          Building community strength
        </h2>
      </div>

      {/* Streak Feed */}
      {streakFeed.length > 0 && (
        <div className="px-4 mb-10">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">
            Recent streaks
          </h3>

          <div className="flex gap-3 overflow-x-auto pb-2">
            {streakFeed.map((event) => (
              <div
                key={event.id}
                className="shrink-0 px-4 py-3 rounded-2xl bg-white/60 backdrop-blur-xl shadow text-sm"
              >
                🔥 <strong>{event.user_name}</strong> hit a{" "}
                {event.streak_count}-day streak
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Challenges */}
      <div className="space-y-5 px-4">
        {challenges.map((challenge) => {
          const end = challenge.end_date
            ? new Date(challenge.end_date)
            : null;

          const daysLeft = end
            ? Math.ceil(
                (end.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
              )
            : 0;

          return (
            <Link
              key={challenge.id}
              href={`/embed/challenge/${challenge.id}`}
              className="block p-5 pt-7 rounded-3xl bg-white/75 backdrop-blur-xl shadow relative"
            >
              {/* Progress Ring */}
              <div className="absolute -top-3 right-3">
                <ProgressRing />
              </div>

              <h3 className="text-lg font-semibold text-slate-800 mb-1 pr-14">
                {challenge.name}
              </h3>

              <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                {challenge.description}
              </p>

              <div className="flex items-center justify-between text-sm text-slate-700">
                <span>👥 {challenge.member_count || 0} members</span>
                <span>⏳ {daysLeft} days left</span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Floating CTA (Mobile) */}
      <Link
        href="/embed/new"
        className="md:hidden fixed bottom-6 right-6 w-14 h-14 rounded-full bg-white/80 backdrop-blur-xl shadow-xl flex items-center justify-center text-3xl font-bold"
      >
        +
      </Link>
    </div>
  );
}
