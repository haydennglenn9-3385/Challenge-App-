"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createChallenge } from "@/lib/storage";
import { useUser } from "@/lib/UserContext";

export default function NewChallengePage() {
  const router = useRouter();
  const { user, getUserParams } = useUser();
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(21);
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [scoringType, setScoringType] = useState<'simple' | 'ny_challenge'>('simple');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!user) {
      setError("You must be logged in to create a challenge");
      return;
    }

    setSubmitting(true);
    setError("");

    const userResponse = await fetch(`/api/user/get?wixId=${user.userId}`);
    const userData = await userResponse.json();

    if (!userData || !userData.id) {
      setError("Could not find your user account. Please try refreshing the page.");
      setSubmitting(false);
      return;
    }

    const challenge = await createChallenge({
      name: title,
      duration: duration,
      description: description,
      creatorId: userData.id,
      isPublic: isPublic,
      scoringType: scoringType,
    });

    if (challenge) {
      router.push(`/embed/challenge/${challenge.id}${getUserParams()}`);
    } else {
      setError("Failed to create challenge. Please try again.");
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <button
            onClick={() => router.push(`/embed/challenges${getUserParams()}`)}
            className="rainbow-cta rounded-full px-5 py-2 font-semibold text-sm"
          >
            ← Back to Challenges
          </button>
        </div>
        <div className="neon-card rounded-3xl p-8 text-center">
          <p className="text-slate-600 mb-2 font-semibold">You need to be logged in to create a challenge.</p>
          <p className="text-sm text-slate-500 mb-6">Please log in through the Wix member portal first.</p>
          <a href="https://www.queersandalliesfitness.com/account/member">
            <button className="rainbow-cta rounded-full px-6 py-3 font-semibold">
              Log in / Sign up
            </button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <button
          onClick={() => router.push(`/embed/challenges${getUserParams()}`)}
          className="rainbow-cta rounded-full px-5 py-2 font-semibold text-sm hover:shadow-xl transition-shadow"
        >
          ← Back to Challenges
        </button>

        <div className="flex gap-3">
          <button
            onClick={() => router.push(`/${getUserParams()}`)}
            className="px-4 py-2 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition text-sm"
          >
            Home
          </button>
          <button
            onClick={() => router.push(`/embed/dashboard${getUserParams()}`)}
            className="rainbow-cta rounded-full px-5 py-2 font-semibold text-sm hover:shadow-xl transition-shadow"
          >
            Dashboard
          </button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2 items-start">
        {/* Left: Form */}
        <div className="space-y-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500 mb-2">CREATE</p>
            <h2 className="text-4xl font-display mb-2">Launch a Challenge</h2>
            <p className="text-slate-600">Start a fresh streak and invite your crew.</p>
          </div>

          <form onSubmit={handleSubmit} className="neon-card rounded-3xl p-8 space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Challenge name</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Morning Mobility"
                className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-300"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Duration (days)</label>
              <input
                type="number"
                min={7}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-300"
                required
              />
            </div>

            {/* Visibility */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Visibility</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsPublic(true)}
                  className={`flex-1 px-4 py-3 rounded-2xl border-2 transition ${
                    isPublic
                      ? 'border-slate-700 bg-slate-50'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <p className="font-semibold">🌍 Public</p>
                  <p className="text-xs text-slate-600">Anyone can join with code</p>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPublic(false)}
                  className={`flex-1 px-4 py-3 rounded-2xl border-2 transition ${
                    !isPublic
                      ? 'border-slate-700 bg-slate-50'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <p className="font-semibold">🔒 Private</p>
                  <p className="text-xs text-slate-600">Invite-only</p>
                </button>
              </div>
            </div>

            {/* Scoring Type */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Scoring System</label>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => setScoringType('simple')}
                  className={`px-4 py-3 rounded-2xl border-2 transition text-left ${
                    scoringType === 'simple'
                      ? 'border-slate-700 bg-slate-50'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <p className="font-semibold">✅ Simple (1 point per day)</p>
                  <p className="text-xs text-slate-600">One check-in button, 1 point per day</p>
                </button>
                <button
                  type="button"
                  onClick={() => setScoringType('ny_challenge')}
                  className={`px-4 py-3 rounded-2xl border-2 transition text-left ${
                    scoringType === 'ny_challenge'
                      ? 'border-slate-700 bg-slate-50'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <p className="font-semibold">🏋️ New Year's Style (1-2 points)</p>
                  <p className="text-xs text-slate-600">Daily exercises, 50% = 1pt, 100% = 2pts</p>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Description (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the daily win you want to track."
                className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rainbow-cta rounded-full px-6 py-3 font-semibold hover:shadow-xl transition-shadow disabled:opacity-50"
            >
              {submitting ? "Launching..." : "Launch Challenge"}
            </button>
          </form>
        </div>

        {/* Right: Tips */}
        <div className="space-y-6">
          <div className="neon-card rounded-3xl p-8">
            <h3 className="text-xl font-semibold mb-4">💡 Scoring Systems</h3>
            <div className="space-y-4 text-slate-700">
              <div>
                <p className="font-semibold mb-1">Simple Scoring</p>
                <p className="text-sm leading-relaxed">
                  Perfect for habit tracking. Just one "Check in" button per day = 1 point. Great for meditation, journaling, or any daily practice.
                </p>
              </div>
              <div>
                <p className="font-semibold mb-1">New Year's Style</p>
                <p className="text-sm leading-relaxed">
                  Progressive exercise challenge with daily exercises (Lunges, Squats, etc.). 50% completion = 1pt, 100% = 2pts. Reps increase weekly!
                </p>
              </div>
            </div>
          </div>

          <div className="neon-card rounded-3xl p-8">
            <h3 className="text-xl font-semibold mb-4">🔒 Public vs Private</h3>
            <div className="space-y-3 text-slate-700">
              <p className="text-sm leading-relaxed">
                <strong>Public:</strong> Your join code will be visible to everyone. Great for open community challenges!
              </p>
              <p className="text-sm leading-relaxed">
                <strong>Private:</strong> Join code only visible to members. Perfect for close friend groups or team challenges.
              </p>
            </div>
          </div>

          <div className="neon-card rounded-3xl p-8 space-y-4">
            <h3 className="text-xl font-semibold mb-2">✨ After you launch</h3>
            <div className="space-y-3 text-slate-700">
              <div className="flex gap-3">
                <span className="text-2xl">1️⃣</span>
                <div>
                  <p className="font-semibold">Share your code</p>
                  <p className="text-sm text-slate-600">Invite friends to join your challenge</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="text-2xl">2️⃣</span>
                <div>
                  <p className="font-semibold">Check in daily</p>
                  <p className="text-sm text-slate-600">Build your streak one day at a time</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="text-2xl">3️⃣</span>
                <div>
                  <p className="font-semibold">Use the chat</p>
                  <p className="text-sm text-slate-600">Encourage each other and celebrate wins</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}