"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getChallenges, Challenge } from "@/lib/storage";
import { useUser } from "@/lib/UserContext";

export default function MessagesPage() {
  const router = useRouter();
  const { getUserParams } = useUser();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  const navigate = (path: string) => {
    router.push(path + getUserParams());
  };

  useEffect(() => {
    async function loadChallenges() {
      const data = await getChallenges();
      setChallenges(data);
      setLoading(false);
    }
    loadChallenges();
  }, []);

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
            Challenges
          </button>
          <button
            onClick={() => navigate("/embed/profile")}
            className="px-4 py-2 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition text-sm"
          >
            Profile
          </button>
        </div>
      </div>

      {/* Page Header */}
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500 mb-2">MESSAGES</p>
        <h2 className="text-4xl font-display">Your Chats</h2>
        <p className="text-sm text-slate-600 mt-1">Chat lives inside each challenge</p>
      </div>

      {loading ? (
        <div className="neon-card rounded-3xl p-12 text-center">
          <p className="text-slate-500">Loading...</p>
        </div>
      ) : challenges.length === 0 ? (
        <div className="neon-card rounded-3xl p-12 text-center">
          <p className="text-slate-500 mb-4">No challenges yet - join or create one to start chatting!</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate("/embed/challenges/new")}
              className="rainbow-cta rounded-full px-6 py-3 font-semibold"
            >
              Create Challenge
            </button>
            <button
              onClick={() => navigate("/embed/join")}
              className="px-6 py-3 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition"
            >
              Join with Code
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {challenges.map((challenge) => (
            <button
              key={challenge.id}
              onClick={() => navigate(`/embed/challenge/${challenge.id}`)}
              className="w-full neon-card rounded-3xl px-6 py-5 text-left hover:-translate-y-1 hover:shadow-2xl transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-1">{challenge.name}</h3>
                  <p className="text-sm text-slate-500">Tap to open chat →</p>
                </div>
                <span className="neon-chip rounded-full px-3 py-1 text-xs font-semibold">
                  💬 Chat
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}