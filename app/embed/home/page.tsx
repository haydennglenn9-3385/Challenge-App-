"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/utils/supabase/client";

/* ============================= */
/* Progress Ring Component       */
/* ============================= */
function ProgressRing({
  progress = 65,
  size = 60,
}: {
  progress?: number;
  size?: number;
}) {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      {/* Soft glow */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-rose-400 to-emerald-400 blur-md opacity-30" />

      <svg
        width={size}
        height={size}
        viewBox="0 0 36 36"
        className="transform -rotate-90 relative"
      >
        <defs>
          <linearGradient
            id="rainbowGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#FF3B30" />
            <stop offset="25%" stopColor="#FF9500" />
            <stop offset="50%" stopColor="#FFCC00" />
            <stop offset="75%" stopColor="#4CD964" />
            <stop offset="100%" stopColor="#5AC8FA" />
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
          stroke="url(#rainbowGradient)"
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
/* Page Component                */
/* ============================= */

type Challenge = {
  id: string;
  name: string;
  description: string;
  end_date: string | null;
  member_count?: number;
};

export default function HomeLandingPage() {
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
    <div className="relative min-h-screen bg-[#f5f7fa] overflow-hidden font-sans pb-40">
      {/* Ambient Glow */}
      <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-emerald-200/40 rounded-full blur-3xl" />
      <div className="absolute top-1/3 -left-32 w-[400px] h-[400px] bg-rose-200/40 rounded-full blur-3xl" />

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 pt-10 max-w-xl mx-auto">
        <Link
          href="/"
          className="text-sm font-medium text-slate-400 hover:text-slate-900 transition"
        >
          ← Back
        </Link>

        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-rose-400 to-orange-400 shadow-md" />
      </nav>

      {/* Hero */}
      <header className="relative z-10 px-6 mt-10 mb-14 max-w-xl mx-auto">
        <p className="text-xs font-medium text-slate-400 mb-2">
          Community Progress
        </p>

        <h1 className="text-4xl font-bold text-slate-900 leading-tight tracking-tight">
          Building{" "}
          <span className="bg-gradient-to-r from-rose-500 via-orange-400 to-emerald-400 bg-clip-text text-transparent drop-shadow-[0_6px_20px_rgba(255,120,120,0.25)]">
            community strength.
          </span>
        </h1>
      </header>

      {/* Challenges */}
      <section className="relative z-10 px-6 space-y-6 max-w-xl mx-auto">
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
              className="block rounded-[32px] bg-white/60 backdrop-blur-xl p-7 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.12)] border border-white/50 active:scale-[0.97] transition-all duration-300 ease-[cubic-bezier(.4,0,.2,1)]"
            >
              <div className="flex justify-between items-start gap-5 mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">
                    {challenge.name}
                  </h3>
                  <p className="text-sm text-slate-500 line-clamp-2">
                    {challenge.description}
                  </p>
                </div>

                <ProgressRing progress={65} size={60} />
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-slate-500">
                  {challenge.member_count || 0} strong 💪
                </span>

                <span className="text-xs font-medium text-rose-500">
                  {daysLeft} days left ✨
                </span>
              </div>
            </Link>
          );
        })}
      </section>

      {/* Floating CTA */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full px-6 max-w-md">
        <Link
          href="/embed/new"
          className="flex items-center justify-center gap-2 py-5 rounded-[32px] bg-gradient-to-r from-rose-500 to-orange-400 text-white text-sm font-semibold shadow-[0_20px_40px_rgba(255,120,120,0.35)] active:scale-95 transition"
        >
          + Create Challenge
        </Link>
      </div>
    </div>
  );
}