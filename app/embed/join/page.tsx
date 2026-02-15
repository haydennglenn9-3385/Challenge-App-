"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const LGBTQ_FITNESS_FACTS = [
  "🏳️‍🌈 The first gay softball league was founded in 1977 in San Francisco - now there are over 40 leagues across North America!",
  "💪 Studies show LGBTQ+ folks who participate in community sports report 50% higher life satisfaction than those who don't.",
  "🏃 The first openly gay Olympic athlete was Tom Waddell, who founded the Gay Games in 1982. Now it's the world's largest sports event!",
  "⚽ Lesbian soccer teams have been organizing since the 1970s - before Title IX even existed!",
  "🎾 Billie Jean King came out in 1981 and became one of the first major athletes to champion LGBTQ+ rights in sports.",
  "🏋️ Research shows that LGBTQ-inclusive gyms see 30% higher member retention - community matters!",
  "🌟 The Gay Games attract over 10,000 athletes from 70+ countries - making it one of the largest sporting events in the world!",
  "💃 Queer folks invented voguing in the 1960s ballroom scene - a full-body workout disguised as fabulous performance art!",
];

export default function JoinWithCodePage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [randomFact, setRandomFact] = useState("");

  // Set random fact only on client side to avoid hydration mismatch
  useEffect(() => {
    setRandomFact(LGBTQ_FITNESS_FACTS[Math.floor(Math.random() * LGBTQ_FITNESS_FACTS.length)]);
  }, []);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code.trim()) {
      setError("Please enter a challenge code");
      return;
    }

    // TODO: Validate code and join challenge
    // For now, just redirect to challenges
    router.push("/embed/challenges");
  };

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
          <Link href="/embed/challenges">
            <button className="px-4 py-2 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition text-sm">
              All Challenges
            </button>
          </Link>
          <Link href="/embed/profile">
            <button className="px-4 py-2 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition text-sm">
              Profile
            </button>
          </Link>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2 items-start">
        {/* Left: Join Form */}
        <div className="space-y-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500 mb-2">JOIN</p>
            <h2 className="text-4xl font-display mb-2">Enter Your Code</h2>
            <p className="text-slate-600">Got an invite from a friend? Join their challenge here!</p>
          </div>

          <form onSubmit={handleJoin} className="neon-card rounded-3xl p-8 space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-700">Challenge Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setError("");
                }}
                placeholder="ABC123"
                className="w-full rounded-2xl border border-slate-200 bg-white/80 px-6 py-4 text-lg font-semibold text-center tracking-wider focus:outline-none focus:ring-2 focus:ring-slate-300 uppercase"
                maxLength={10}
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>

            <button
              type="submit"
              className="w-full rainbow-cta rounded-full px-6 py-3 font-semibold hover:shadow-xl transition-shadow"
            >
              Join Challenge
            </button>

            <div className="pt-4 border-t border-slate-200 text-center">
              <p className="text-sm text-slate-600 mb-3">Don't have a code?</p>
              <Link href="/embed/challenges">
                <button className="text-sm font-semibold text-slate-700 hover:text-slate-900 underline">
                  Browse public challenges
                </button>
              </Link>
            </div>
          </form>
        </div>

        {/* Right: Fun Facts */}
        <div className="space-y-6">
          <div className="neon-card rounded-3xl p-8">
            <h3 className="text-xl font-semibold mb-4">💡 Did you know?</h3>
            {randomFact ? (
              <p className="text-lg text-slate-700 leading-relaxed">{randomFact}</p>
            ) : (
              <p className="text-lg text-slate-700 leading-relaxed">Loading fun fact...</p>
            )}
          </div>

          <div className="neon-card rounded-3xl p-8 space-y-4">
            <h3 className="text-xl font-semibold mb-4">✨ What happens next?</h3>
            <div className="space-y-3 text-slate-700">
              <div className="flex gap-3">
                <span className="text-2xl">1️⃣</span>
                <div>
                  <p className="font-semibold">Join the crew</p>
                  <p className="text-sm text-slate-600">You'll instantly become part of the challenge team</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="text-2xl">2️⃣</span>
                <div>
                  <p className="font-semibold">Start your streak</p>
                  <p className="text-sm text-slate-600">Check in daily to build momentum</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="text-2xl">3️⃣</span>
                <div>
                  <p className="font-semibold">Cheer each other on</p>
                  <p className="text-sm text-slate-600">Use the chat to hype up your teammates</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}