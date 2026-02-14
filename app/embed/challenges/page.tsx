"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ensureSeedData, getChallenges, Challenge } from "@/lib/storage";

export default function ChallengesPage() {
  const router = useRouter();
  const [challenges, setChallenges] = useState<Challenge[]>([]);

  useEffect(() => {
    ensureSeedData();
    setChallenges(getChallenges());
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Challenges</p>
          <h2 className="text-3xl font-display">All Challenges</h2>
        </div>
        <button
          onClick={() => router.push("/embed/challenges/new")}
          className="rounded-full px-4 py-2 font-semibold rainbow-cta"
        >
          New challenge
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {challenges.map((challenge) => (
          <button
            key={challenge.id}
            onClick={() => router.push(`/embed/challenge/${challenge.id}`)}
            className="neon-card rounded-2xl px-5 py-5 text-left hover:-translate-y-0.5 transition"
          >
            <p className="text-lg font-semibold">{challenge.title}</p>
            <p className="text-sm text-slate-500">{challenge.duration} days</p>
            {challenge.description && (
              <p className="text-xs text-slate-400 mt-2">{challenge.description}</p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}