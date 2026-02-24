"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getChallenges, Challenge } from "@/lib/storage";
import { useUser } from "@/lib/UserContext";

export default function ChallengesPage() {
  const router = useRouter();
  const { user, getUserParams } = useUser();
  const [challenges, setChallenges] = useState<Challenge[]>([]);

  useEffect(() => {
    async function loadChallenges() {
      const data = await getChallenges();
      setChallenges(data);
    }
    loadChallenges();
  }, []);

  const getDuration = (challenge: Challenge) => {
    const start = new Date(challenge.start_date);
    const end = new Date(challenge.end_date);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getDaysLeft = (challenge: Challenge) => {
    return Math.max(
      0,
      Math.ceil(
        (new Date(challenge.end_date).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );
  };

  const getProgress = (challenge: Challenge) => {
    const total = getDuration(challenge);
    const daysLeft = getDaysLeft(challenge);
    const elapsed = total - daysLeft;
    return Math.min(100, Math.round((elapsed / total) * 100));
  };

  const navigate = (path: string) => router.push(path + getUserParams());

  return (
    <div className="min-h-screen px-5 pt-6 pb-28 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold tracking-[0.2em] uppercase mb-1"
            style={{ background: "linear-gradient(90deg, #ff6b9d, #ff9f43, #ffdd59, #48cfad, #4fc3f7, #667eea)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Queers & Allies Fitness
          </p>
          <h1 className="text-3xl font-display font-extrabold text-slate-900 tracking-tight">
            Challenges
          </h1>
        </div>
        <button
          onClick={() => navigate("/embed/challenges/new")}
          className="w-10 h-10 rounded-full neon-card flex items-center justify-center text-xl font-bold text-slate-700 hover:scale-105 transition-transform"
        >
          +
        </button>
      </div>

      {/* Active challenges */}
      {challenges.length > 0 ? (
        <div className="space-y-4">
          <p className="text-xs font-bold tracking-[0.15em] uppercase text-slate-400">
            Active Challenges
          </p>

          {challenges.map((challenge) => {
            const progress = getProgress(challenge);
            const daysLeft = getDaysLeft(challenge);
            const duration = getDuration(challenge);

            return (
              <button
                key={challenge.id}
                onClick={() => navigate(`/embed/challenge/${challenge.id}`)}
                className="w-full neon-card rounded-2xl overflow-hidden text-left hover:-translate-y-0.5 hover:shadow-2xl transition-all duration-200"
              >
                {/* Rainbow top bar */}
                <div className="h-1 w-full rainbow-cta" />

                <div className="px-5 py-4">
                  {/* Title row */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        {challenge.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5 font-medium">
                        {duration}-day challenge · Day {duration - daysLeft} of {duration}
                      </p>
                    </div>
                    <span className="neon-chip rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap flex-shrink-0">
                      {daysLeft > 0 ? "Active" : "Ended"}
                    </span>
                  </div>

                  {/* Description */}
                  {challenge.description && (
                    <p className="text-sm text-slate-600 mb-3 leading-relaxed">
                      {challenge.description.substring(0, 80)}
                      {challenge.description.length > 80 ? "..." : ""}
                    </p>
                  )}

                  {/* Progress bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs font-bold text-slate-400 mb-1.5">
                      <span>Progress</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full rainbow-cta transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Footer meta */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <span className="text-xs font-semibold text-slate-500">
                      👥 {challenge.member_count || 0} members
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      {daysLeft} days left
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        /* Empty state */
        <div className="neon-card rounded-2xl p-10 text-center space-y-3">
          <p className="text-2xl">⚡</p>
          <p className="font-bold text-slate-800 text-base">No challenges yet</p>
          <p className="text-sm text-slate-500">
            Start your first one and invite your crew.
          </p>
          <button
            onClick={() => navigate("/embed/challenges/new")}
            className="rainbow-cta rounded-xl px-6 py-3 font-bold text-sm mt-2 hover:shadow-xl transition-shadow"
          >
            Create Challenge
          </button>
        </div>
      )}

      {/* Quick Actions */}
      <div className="neon-card rounded-2xl p-5 space-y-3">
        <p className="text-base font-extrabold text-slate-900">Quick Actions</p>
        <button
          onClick={() => navigate("/embed/challenges/new")}
          className="rainbow-cta w-full rounded-xl py-4 font-bold text-sm hover:shadow-xl transition-shadow"
        >
          Create Challenge
        </button>
        <button
          onClick={() => navigate("/embed/join")}
          className="w-full rounded-xl py-3.5 font-bold text-sm border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Become a Member
        </button>
        <button
          onClick={() => navigate("/embed/leaderboard")}
          className="w-full rounded-xl py-3.5 font-bold text-sm border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
        >
          View Leaderboard
        </button>
      </div>

    </div>
  );
}