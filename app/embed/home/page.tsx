"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/utils/supabase/client";

/* ============================= */
/* REFINED RAINBOW PROGRESS RING */
/* ============================= */
function ProgressRing({ progress = 70, size = 56 }: { progress?: number; size?: number }) {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center bg-white/50 backdrop-blur-xl rounded-full p-1.5 shadow-sm border border-white/60">
      <svg width={size} height={size} viewBox="0 0 36 36" className="transform -rotate-90">
        <defs>
          <linearGradient id="appleRainbow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF3B30" /> {/* Red */}
            <stop offset="20%" stopColor="#FF9500" /> {/* Orange */}
            <stop offset="40%" stopColor="#FFCC00" /> {/* Yellow */}
            <stop offset="60%" stopColor="#4CD964" /> {/* Green */}
            <stop offset="80%" stopColor="#007AFF" /> {/* Blue */}
            <stop offset="100%" stopColor="#5856D6" /> {/* Purple */}
          </linearGradient>
        </defs>
        <circle cx="18" cy="18" r={radius} stroke="rgba(0,0,0,0.05)" strokeWidth="3.5" fill="none" />
        <circle
          cx="18"
          cy="18"
          r={radius}
          stroke="url(#appleRainbow)"
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

/* ============================= */
/* UPDATED LAYOUT PAGE           */
/* ============================= */
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
  }, [supabase]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white/50 backdrop-blur-3xl">
      <div className="animate-pulse text-slate-400 font-bold tracking-widest text-[10px] uppercase">Loading...</div>
    </div>
  );

  return (
    // FULL WIDTH GRADIENT BACKGROUND (Matches Screenshot)
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#E2FFC6_0%,_#FFD6E8_40%,_#E5D9FF_100%)] pb-32">
      
      {/* 1. MINIMAL NAV */}
      <nav className="flex items-center justify-between px-6 pt-10 mb-12 max-w-2xl mx-auto">
        <Link href="/" className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500/80">
          ← Back
        </Link>
        <div className="flex gap-2">
           <Link href="/leaderboard" className="px-5 py-2 rounded-full bg-white/40 backdrop-blur-md text-[10px] font-black uppercase tracking-widest text-slate-700 border border-white/50 shadow-sm">
            Leaderboard
          </Link>
        </div>
      </nav>

      {/* 2. HERO HEADER (Matches "Building community strength" pic) */}
      <header className="px-8 mb-16 max-w-2xl mx-auto">
        <p className="text-[10px] font-black tracking-[0.4em] text-slate-500 uppercase mb-3">
          Queers & Allies Fitness
        </p>
        <h1 className="text-5xl font-black text-slate-900 leading-[1.05] tracking-tighter">
          Building <br/>community <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF3B30] via-[#AF52DE] to-[#007AFF]">
            strength.
          </span>
        </h1>
      </header>

      {/* 3. CHALLENGE CARDS (Refined Layout) */}
      <section className="px-6 space-y-8 max-w-2xl mx-auto">
        {challenges.map((challenge) => {
          const daysLeft = challenge.end_date ? Math.ceil((new Date(challenge.end_date).getTime() - Date.now()) / 86400000) : 0;

          return (
            <Link
              key={challenge.id}
              href={`/embed/challenge/${challenge.id}`}
              className="group relative block rounded-[44px] bg-white/70 backdrop-blur-2xl p-8 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.08)] border border-white/60 active:scale-[0.97] transition-all duration-500"
            >
              {/* Internal Content Flow: No more floating rings */}
              <div className="flex justify-between items-start gap-6">
                <div className="flex-1">
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-tight mb-3">
                    {challenge.name}
                  </h3>
                  <p className="text-sm font-medium text-slate-500/90 leading-relaxed line-clamp-2">
                    {challenge.description}
                  </p>
                </div>
                
                {/* Properly Aligned Ring */}
                <div className="shrink-0 mt-1">
                  <ProgressRing progress={65} size={60} />
                </div>
              </div>

              {/* Functional Social Footer (Clean & Premium) */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-900/5">
                <div className="flex items-center gap-3">
                  {/* Multi-color Avatar Pill */}
                  <div className="flex -space-x-2">
                     <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-rose-400 to-orange-300 border-2 border-white" />
                     <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-400 to-emerald-300 border-2 border-white" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                    {challenge.member_count || 0} Grinding
                  </span>
                </div>

                <div className="px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/5">
                   <span className="text-[10px] font-black uppercase tracking-widest text-rose-500">
                    {daysLeft}D Left
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </section>

      {/* 4. MOBILE-FIRST FLOATING ACTION BUTTON */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full px-6 max-w-md">
        <Link 
          href="/embed/new" 
          className="flex items-center justify-center w-full py-5 rounded-[28px] bg-slate-900 text-white font-black shadow-2xl active:scale-95 transition-all text-[11px] tracking-[0.25em] uppercase"
        >
          + Create Challenge
        </Link>
      </div>
    </div>
  );
}