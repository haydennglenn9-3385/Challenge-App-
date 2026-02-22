"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/utils/supabase/client";

/**
 * 1. REFINED PROGRESS RING
 * Moved the gradient and added a "Glass" container for the Apple vibe.
 */
function ProgressRing({ progress = 75, size = 44 }: { progress?: number; size?: number }) {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center bg-white/40 backdrop-blur-md rounded-full p-1.5 shadow-inner border border-white/40">
      <svg width={size} height={size} viewBox="0 0 36 36" className="transform -rotate-90">
        <defs>
          <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#C6FF5E" />
            <stop offset="100%" stopColor="#FF5E5E" />
          </linearGradient>
        </defs>
        <circle
          cx="18"
          cy="18"
          r={radius}
          stroke="rgba(0,0,0,0.05)"
          strokeWidth="3.5"
          fill="none"
        />
        <circle
          cx="18"
          cy="18"
          r={radius}
          stroke="url(#ringGradient)"
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
  const [streakFeed, setStreakFeed] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        await Promise.all([fetchActiveChallenges(), fetchStreakFeed()]);
      } catch (err) {
        console.error("Data fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  async function fetchActiveChallenges() {
    const { data } = await supabase
      .from("challenges")
      .select("*")
      .order("created_at", { ascending: false });

    const active = data?.filter((c: any) => {
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

  // Prevents the "Application Error" crash while waiting for data
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-lime-100 to-purple-100">
        <div className="animate-pulse text-slate-500 font-bold tracking-tighter">PREPARING CHALLENGES...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_var(--tw-gradient-stops))] from-lime-200 via-pink-200 to-purple-200 pb-32 font-sans selection:bg-pink-300">
      
      {/* 2. REFINED TOP NAV */}
      <nav className="flex items-center justify-between px-6 pt-8 mb-8">
        <Link href="/" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500/80 hover:text-slate-900 transition-colors">
          ← Back
        </Link>
        <div className="hidden md:flex gap-3">
          <Link href="/embed/new" className="px-5 py-2 rounded-full bg-white/60 backdrop-blur-xl border border-white/40 shadow-sm text-xs font-bold text-slate-800">
            + New Challenge
          </Link>
          <Link href="/leaderboard" className="px-5 py-2 rounded-full bg-slate-900 text-white text-xs font-bold shadow-lg">
            Leaderboard
          </Link>
        </div>
      </nav>

      {/* 3. HERO SECTION */}
      <header className="px-6 mb-10">
        <p className="text-[10px] font-black tracking-[0.3em] text-slate-500/70 uppercase mb-2">
          Queers & Allies Fitness
        </p>
        <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 leading-[1.1] tracking-tight">
          Building community <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500">
            strength.
          </span>
        </h2>
      </header>

      {/* 4. SOCIAL FEED (SCROLLABLE BUBBLES) */}
      {streakFeed.length > 0 && (
        <section className="mb-12">
          <div className="flex gap-4 overflow-x-auto px-6 pb-4 no-scrollbar">
            {streakFeed.map((event) => (
              <div key={event.id} className="shrink-0 px-6 py-4 rounded-[30px] bg-white/40 backdrop-blur-2xl border border-white/50 shadow-sm transition-transform active:scale-95">
                <span className="text-sm font-medium text-slate-800">
                  🔥 <span className="font-bold">{event.user_name}</span> 
                  <span className="opacity-60 ml-1">is on a {event.streak_count} day streak!</span>
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. CHALLENGES GRID */}
      <section className="px-6 space-y-6 max-w-2xl mx-auto">
        {challenges.map((challenge, index) => {
          const daysLeft = challenge.end_date ? Math.ceil((new Date(challenge.end_date).getTime() - Date.now()) / 86400000) : 0;
          const isFeatured = index === 0;

          return (
            <Link
              key={challenge.id}
              href={`/embed/challenge/${challenge.id}`}
              className={`group relative block rounded-[38px] transition-all duration-500 active:scale-[0.97] 
                ${isFeatured 
                  ? 'bg-white/80 p-8 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.1)] ring-1 ring-white/60' 
                  : 'bg-white/50 p-7 shadow-lg border border-white/40 opacity-90 hover:opacity-100'}`}
            >
              {/* Correct Ring Placement: Integrated into flow */}
              <div className="flex justify-between items-start mb-6">
                <div className="max-w-[75%]">
                  <h3 className={`font-black text-slate-900 tracking-tight leading-tight mb-2 ${isFeatured ? 'text-2xl' : 'text-xl'}`}>
                    {challenge.name}
                  </h3>
                  <p className="text-sm font-medium text-slate-500 leading-relaxed line-clamp-2">
                    {challenge.description}
                  </p>
                </div>
                <div className="shrink-0">
                  <ProgressRing size={isFeatured ? 52 : 44} progress={75} />
                </div>
              </div>

              {/* Functional Footer */}
              <div className="flex items-center justify-between pt-5 border-t border-slate-900/5">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                     <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-400 to-pink-400 border-2 border-white shadow-sm" />
                     <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-lime-300 to-emerald-400 border-2 border-white shadow-sm" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {challenge.member_count || 0} Members
                  </span>
                </div>
                <div className="bg-rose-50 px-3 py-1.5 rounded-2xl border border-rose-100">
                  <span className="text-[10px] font-black uppercase tracking-widest text-rose-500">
                    {daysLeft}d left
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </section>

      {/* 6. MOBILE FLOATING NAV (PILL SHAPE) */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full px-6 max-w-md md:hidden">
        <Link 
          href="/embed/new" 
          className="flex items-center justify-center gap-3 w-full py-5 rounded-[24px] bg-slate-900 text-white font-black shadow-2xl transition-transform active:scale-95 text-sm tracking-widest uppercase"
        >
          <span className="text-xl">+</span> New Challenge
        </Link>
      </div>
    </div>
  );
}