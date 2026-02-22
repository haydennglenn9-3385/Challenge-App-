"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/utils/supabase/client";

/**
 * PREMIUM RAINBOW PROGRESS RING
 * Fixed positioning and high-end rainbow gradient
 */
function ProgressRing({ progress = 75, size = 52 }: { progress?: number; size?: number }) {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center bg-white/40 backdrop-blur-xl rounded-full p-2 shadow-sm border border-white/60">
      <svg width={size} height={size} viewBox="0 0 36 36" className="transform -rotate-90">
        <defs>
          <linearGradient id="rainbowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF3B30" /> {/* Apple Red */}
            <stop offset="25%" stopColor="#FF9500" /> {/* Apple Orange */}
            <stop offset="50%" stopColor="#FFCC00" /> {/* Apple Yellow */}
            <stop offset="75%" stopColor="#4CD964" /> {/* Apple Green */}
            <stop offset="100%" stopColor="#5AC8FA" /> {/* Apple Blue */}
          </linearGradient>
        </defs>
        {/* Subtle Track */}
        <circle cx="18" cy="18" r={radius} stroke="rgba(0,0,0,0.04)" strokeWidth="3.5" fill="none" />
        {/* Rainbow Progress */}
        <circle
          cx="18"
          cy="18"
          r={radius}
          stroke="url(#rainbowGradient)"
          strokeWidth="3.5"
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

export default function HomeLandingPage() {
  const supabase = getSupabaseBrowserClient();
  const [challenges, setChallenges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const { data } = await supabase
        .from("challenges")
        .select("*")
        .order("created_at", { ascending: false });

      const active = data?.filter((c: any) => {
        if (!c.end_date) return false;
        return new Date(c.end_date) > new Date();
      }) || [];
      
      setChallenges(active);
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="animate-pulse text-slate-400 font-bold tracking-tighter uppercase text-xs">Loading...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_#fdfcfb_0%,_#e2d1c3_100%)] pb-32 font-sans">
      
      {/* 1. CLEAN NAVIGATION */}
      <nav className="flex items-center justify-between px-6 pt-10 mb-12 max-w-xl mx-auto">
        <Link href="/" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-900 transition-all">
          ← Back
        </Link>
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-orange-400 to-rose-400 shadow-lg border-2 border-white" />
      </nav>

      {/* 2. HERO HEADER */}
      <header className="px-8 mb-12 max-w-xl mx-auto text-center md:text-left">
        <p className="text-[10px] font-black tracking-[0.4em] text-slate-400 uppercase mb-3">
          Community Progress
        </p>
        <h2 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight tracking-tighter">
          Building <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-purple-500 to-blue-500">
            community strength.
          </span>
        </h2>
      </header>

      {/* 3. CHALLENGE LIST */}
      <section className="px-6 space-y-8 max-w-xl mx-auto">
        {challenges.map((challenge) => {
          const daysLeft = challenge.end_date ? Math.ceil((new Date(challenge.end_date).getTime() - Date.now()) / 86400000) : 0;

          return (
            <Link
              key={challenge.id}
              href={`/embed/challenge/${challenge.id}`}
              className="group relative block rounded-[40px] bg-white/70 backdrop-blur-2xl p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.06)] border border-white/60 active:scale-[0.98] transition-all duration-300"
            >
              {/* Top Row: Title + Ring */}
              <div className="flex justify-between items-start gap-4 mb-8">
                <div className="flex-1">
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-tight mb-3">
                    {challenge.name}
                  </h3>
                  <p className="text-sm font-medium text-slate-500 leading-relaxed line-clamp-2">
                    {challenge.description}
                  </p>
                </div>
                <div className="shrink-0">
                  <ProgressRing progress={65} size={56} />
                </div>
              </div>

              {/* Bottom Row: Social Stats */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-900/[0.03] rounded-2xl border border-black/5">
                  <div className="flex -space-x-1.5">
                     <div className="w-5 h-5 rounded-full bg-blue-400 border border-white" />
                     <div className="w-5 h-5 rounded-full bg-rose-400 border border-white" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    {challenge.member_count || 0} Members
                  </span>
                </div>

                <div className="flex items-center gap-1.5 px-4 py-2 bg-rose-500/10 rounded-2xl border border-rose-500/10">
                  <span className="text-[10px] font-black uppercase tracking-widest text-rose-600">
                    {daysLeft}d Remaining
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </section>

      {/* 4. APPLE-STYLE FLOATING CTA */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full px-6 max-w-md">
        <Link 
          href="/embed/new" 
          className="flex items-center justify-center gap-3 w-full py-5 rounded-[28px] bg-slate-900 text-white font-black shadow-2xl active:scale-95 transition-all text-xs tracking-[0.2em] uppercase"
        >
          <span className="text-lg">+</span> Create Challenge
        </Link>
      </div>
    </div>
  );
}