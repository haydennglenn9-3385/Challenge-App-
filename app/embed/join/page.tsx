"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { joinChallenge } from "@/lib/storage";
import { useUser } from "@/lib/UserContext";

const LGBTQ_FITNESS_FACTS = [
  "🏳️‍🌈 The first gay softball league was founded in 1977 in San Francisco - now there are over 40 leagues across North America!",
  "💪 Studies show LGBTQ+ folks who participate in community sports report 50% higher life satisfaction than those who don't.",
  "🏃 Tom Waddell founded the Gay Games in 1982. Now it attracts over 10,000 athletes from 70+ countries!",
  "⚽ Lesbian soccer teams have been organizing since the 1970s - before Title IX even existed!",
  "🎾 Billie Jean King came out in 1981 and became one of the first major athletes to champion LGBTQ+ rights in sports.",
  "🏋️ Research shows that LGBTQ-inclusive gyms see 30% higher member retention - community matters!",
  "💃 Queer folks invented voguing in the 1960s ballroom scene - a full-body workout disguised as fabulous performance art!",
];

export default function JoinWithCodePage() {
  const router = useRouter();
  const { user, getUserParams } = useUser();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);
  const [randomFact, setRandomFact] = useState("");

  useEffect(() => {
    setRandomFact(LGBTQ_FITNESS_FACTS[Math.floor(Math.random() * LGBTQ_FITNESS_FACTS.length)]);
  }, []);

  const navigate = (path: string) => {
    router.push(path + getUserParams());
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code.trim()) {
      setError("Please enter a challenge code");
      return;
    }

    if (!user) {
      setError("You need to be logged in to join a challenge");
      return;
    }

    setJoining(true);
    setError("");

    // Get user's Supabase ID
    const userResponse = await fetch(`/api/user/get?wixId=${user.userId}`);
    const userData = await userResponse.json();

    if (!userData || !userData.id) {
      setError("Could not find your account. Please try refreshing.");
      setJoining(false);
      return;
    }

    const success = await joinChallenge(code.trim().toUpperCase(), userData.id);

    if (success) {
      // Redirect to challenges page with success
      navigate("/embed/challenges");
    } else {
      setError("Invalid code or you're already in this challenge. Please check and try again.");
      setJoining(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <button
          onClick={() => router.push("/")}
          className="px-4 py-2 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition text-sm"
        >
          ← Home
        </button>
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/embed/challenges")}
            className="px-4 py-2 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition text-sm"
          >
            All Challenges
          </button>
          <button
            onClick={() => navigate("/embed/profile")}
            className="px-4 py-2 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition text-sm"
          >
            Profile
          </button>
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
            {!user && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <p className="text-sm text-amber-700 font-semibold mb-2">You need to be logged in to join</p>
                <a href="https://www.queersandalliesfitness.com/account/member">
                  <button type="button" className="rainbow-cta rounded-full px-4 py-2 text-sm font-semibold">
                    Log in / Sign up
                  </button>
                </a>
              </div>
            )}

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
              disabled={joining || !user}
              className="w-full rainbow-cta rounded-full px-6 py-3 font-semibold hover:shadow-xl transition-shadow disabled:opacity-50"
            >
              {joining ? "Joining..." : "Join Challenge"}
            </button>

            <div className="pt-2 border-t border-slate-200 text-center">
              <p className="text-sm text-slate-600 mb-3">Don't have a code?</p>
              <button
                type="button"
                onClick={() => navigate("/embed/challenges")}
                className="text-sm font-semibold text-slate-700 hover:text-slate-900 underline"
              >
                Browse public challenges
              </button>
            </div>
          </form>
        </div>

        {/* Right: Fun Facts + Steps */}
        <div className="space-y-6">
          <div className="neon-card rounded-3xl p-8">
            <h3 className="text-xl font-semibold mb-4">💡 Did you know?</h3>
            {randomFact ? (
              <p className="text-slate-700 leading-relaxed">{randomFact}</p>
            ) : (
              <p className="text-slate-400">Loading fun fact...</p>
            )}
          </div>

          <div className="neon-card rounded-3xl p-8 space-y-4">
            <h3 className="text-xl font-semibold mb-2">✨ What happens next?</h3>
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