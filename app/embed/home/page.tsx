"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/utils/supabase/client";

/* ============================= */
/* Progress Ring                 */
/* ============================= */

function ProgressRing({
  progress = 65,
  size = 64,
}: {
  progress?: number;
  size?: number;
}) {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      {/* Soft rainbow glow */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-rose-400 via-orange-400 to-emerald-400 blur-md opacity-30" />

      <svg
        width={size}
        height={size}
        viewBox="0 0 36 36"
        className="-rotate-90 relative"
      >
        <defs>
          <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff3b30" />
            <stop offset="25%" stopColor="#ff9500" />
            <stop offset="50%" stopColor="#ffcc00" />
            <stop offset="75%" stopColor="#34c759" />
            <stop offset="100%" stopColor="#5ac8fa" />
          </linearGradient>
        </defs>

        {/* Track */}
        <circle
          cx="18"
          cy="18"
          r={radius}
          stroke="rgba(0,0,0,0.05)"
          strokeWidth="4.5"
          fill="none"
        />

        {/* Progress */}
        <circle
          cx="18"
          cy="18"
          r={radius}
          stroke="url(#ringGradient)"
          strokeWidth="4.5"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
    </div>
  );
}

/* ============================= */
/* Types                         */
/* ============================= */

type Challenge = {
  id: string;
  name: string;
  description: string;
  end_date: string | null;
  member_count?: number;
};

/* ============================= */
/* Page                          */
/* ============================= */

export default function HomePage() {
  const supabase = getSupabaseBrowserClient();

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const { data } = await supabase
        .from("challenges")
        .select("*")
        .order("created_at", { ascending: false });

      const active =
        data?.filter((c: Challenge) => {
          if (!c.end_date) return false;
          return new Date(c.end_date) > new Date();
        }) || [];

      setChallenges(active);
      setLoading(false);
    }

    loadData();
  }, [supabase]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-pulse text-slate-400 text-sm">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f7f9fb] font-sans pb-40">
      {/* 🌈 Ambient Rainbow Glow */}
      <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-emerald-300/30 rounded-full blur-3xl" />
      <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] bg-rose-300/30 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] bg-yellow-200/30 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-3xl mx-auto px-6 pt-24">
        {/* HERO */}
        <header className="mb-20">
          <p className="text-sm font-medium text-slate-400 mb-3">
            Invite-only fitness challenges
          </p>

          <h1 className="text-5xl font-semibold text-slate-900 leading-[1.05] tracking-tight">
            Queers and Allies
            <br />
            <span className="bg-gradient-to-r from-rose-500 via-orange-400 to-emerald-400 bg-clip-text text-transparent">
              Fitness Challenge
            </span>
          </h1>

          <p className="mt-6 text-lg text-slate-600 max-w-xl leading-relaxed">
            Spark friendly competition, track streaks, and keep your crew
            moving together. Create vibrant challenges and cheer each other on
            every day.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-4 mt-10">
            <Link
              href="/dashboard"
              className="px-6 py-3 rounded-full bg-gradient-to-r from-rose-500 to-orange-400 text-white font-medium shadow-[0_10px_30px_rgba(255,120,120,0.35)] active:scale-95 transition"
            >
              Dashboard
            </Link>

            <Link
              href="/embed/home"
              className="px-6 py-3 rounded-full bg-white/60 backdrop-blur-xl border border-white/60 text-slate-700 font-medium"
            >
              View Challenges
            </Link>

            <Link
              href="/embed/join"
              className="px-6 py-3 rounded-full bg-white/60 backdrop-blur-xl border border-white/60 text-slate-700 font-medium"
            >
              Join with code
            </Link>
          </div>
        </header>

        {/* ACTIVE CHALLENGES */}
        <section className="space-y-8">
          <h2 className="text-xl font-semibold text-slate-900">
            Active Challenges
          </h2>

          {challenges.map((challenge) => {
            const daysLeft = challenge.end_date
              ? Math.ceil(
                  (new Date(challenge.end_date).getTime() - Date.now()) /
                    86400000
                )
              : 0;

            return (
              <Link
                key={challenge.id}
                href={`/embed/challenge/${challenge.id}`}
                className="group flex items-center justify-between px-8 py-6 rounded-[28px]
                bg-white/60 backdrop-blur-xl
                shadow-[0_20px_50px_-20px_rgba(0,0,0,0.15)]
                hover:-translate-y-1
                transition-all duration-300 ease-[cubic-bezier(.4,0,.2,1)]"
              >
                <div>
                  <h3 className="text-lg font-medium text-slate-900">
                    {challenge.name}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {challenge.member_count || 0} members • {daysLeft} days left
                  </p>
                </div>

                <ProgressRing progress={65} />
              </Link>
            );
          })}
        </section>
      </div>
    </div>
  );
}