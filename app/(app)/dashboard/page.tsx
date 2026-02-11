"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ensureSeedData, getChallenges, getStreak, Challenge } from "@/lib/storage";

function ProgressRing({ progress }: { progress: number }) {
  const radius = 32;
  const stroke = 6;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const clamped = Math.max(0, Math.min(1, progress));
  const strokeDashoffset = circumference - clamped * circumference;

  return (
    <svg height={radius * 2} width={radius * 2}>
      <circle
        stroke="#e5e5e5"
        fill="transparent"
        strokeWidth={stroke}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
      />
      <circle
        stroke="#22c55e"
        fill="transparent"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${circumference} ${circumference}`}
        style={{ strokeDashoffset, transition: "stroke-dashoffset 0.4s ease" }}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
      />
    </svg>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [challenges, setChallenges] = useState<Challenge[]>([]);

  // TEMPORARY — allow access without auth
  useEffect(() => {
    setLoading(false);
  }, []);

  // Load challenge data from local storage
  useEffect(() => {
    ensureSeedData();
    setChallenges(getChallenges());
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
            Dashboard
          </p>
          <h2 className="text-3xl font-display">Your Challenges</h2>
        </div>
        <button
          onClick={() => router.push("/challenges/new")}
          className="px-4 py-2 rounded-full font-semibold rainbow-cta"
        >
          Create a challenge
        </button>
      </div>

      {challenges.length === 0 && (
        <div className="neon-card rounded-2xl p-6">
          <p className="text-slate-600">
            You haven't joined or created any challenges yet.
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {challenges.map((challenge) => {
          const streak = getStreak(challenge.id);
          const progress =
            challenge.duration > 0 ? streak / challenge.duration : 0;

          return (
            <button
              key={challenge.id}
              onClick={() => router.push(`/challenge/${challenge.id}`)}
              className="neon-card w-full flex items-center justify-between rounded-2xl px-5 py-5 text-left hover:-translate-y-0.5 transition"
            >
              <div>
                <p className="text-lg font-semibold">{challenge.title}</p>
                <p className="text-sm text-slate-500">
                  {Math.round(progress * 100)}% complete • {streak}-day streak
                </p>
                {challenge.description && (
                  <p className="text-xs text-slate-400 mt-1">
                    {challenge.description}
                  </p>
                )}
              </div>

              <ProgressRing progress={progress} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
