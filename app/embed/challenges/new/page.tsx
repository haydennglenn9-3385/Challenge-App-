"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createChallenge } from "@/lib/storage";
import { useUser } from "@/lib/UserContext";

const DURATION_UNITS = [
  { value: 'minutes', label: 'Minutes' },
  { value: 'hours', label: 'Hours' },
  { value: 'days', label: 'Days' },
  { value: 'weeks', label: 'Weeks' },
  { value: 'months', label: 'Months' },
  { value: 'years', label: 'Years' },
];

const SCORING_SYSTEMS = [
  {
    value: 'total_points',
    label: 'Total Accumulated Points',
    description: 'Team score = sum of all member points'
  },
  {
    value: 'average_points',
    label: 'Average Score Per Member',
    description: 'Team score = average of member points (fair for different team sizes)'
  },
  {
    value: 'tiered',
    label: 'Tiered Completion (0%, 50%, 100%)',
    description: 'Points based on completion tier - simple and predictable'
  },
  {
    value: 'streak',
    label: 'Streak-Based Scoring',
    description: 'Points for daily streaks - encourages consistency'
  },
  {
    value: 'task_completion',
    label: 'Task Completion',
    description: 'Points for completing specific tasks'
  },
  {
    value: 'ny_challenge',
    label: 'New Year\'s Style',
    description: 'Daily exercises, 50% = 1pt, 100% = 2pts, progressive reps'
  },
];

export default function NewChallengePage() {
  const router = useRouter();
  const { user, getUserParams } = useUser();
  const [title, setTitle] = useState("");
  const [durationValue, setDurationValue] = useState(21);
  const [durationUnit, setDurationUnit] = useState('days');
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [scoringType, setScoringType] = useState('average_points');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const convertToDays = () => {
    const conversions: Record<string, number> = {
      minutes: 1 / (24 * 60),
      hours: 1 / 24,
      days: 1,
      weeks: 7,
      months: 30,
      years: 365,
    };
    return Math.ceil(durationValue * conversions[durationUnit]);
  };

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

    const durationInDays = convertToDays();

    const challenge = await createChallenge({
      name: title,
      duration: durationInDays,
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
            <h2 className="text-4xl font-display mb-2">Create a New Challenge</h2>
            <p className="text-slate-600">Start a fresh streak and invite your crew.</p>
          </div>

          <form onSubmit={handleSubmit} className="neon-card rounded-3xl p-8 space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Challenge Name</label>
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
              <label className="text-sm font-semibold text-slate-700">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Simple description about the challenge"
                className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Duration</label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  min={1}
                  value={durationValue}
                  onChange={(e) => setDurationValue(Number(e.target.value))}
                  className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  required
                />
                <select
                  value={durationUnit}
                  onChange={(e) => setDurationUnit(e.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-300"
                >
                  {DURATION_UNITS.map(unit => (
                    <option key={unit.value} value={unit.value}>{unit.label}</option>
                  ))}
                </select>
              </div>
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
                  <p className="text-xs text-slate-600">Anyone can join</p>
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

            {/* Scoring System */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Scoring System</label>
              <select
                value={scoringType}
                onChange={(e) => setScoringType(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                {SCORING_SYSTEMS.map(system => (
                  <option key={system.value} value={system.value}>
                    {system.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-2">
                {SCORING_SYSTEMS.find(s => s.value === scoringType)?.description}
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rainbow-cta rounded-full px-6 py-3 font-semibold hover:shadow-xl transition-shadow disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Create Challenge"}
            </button>
          </form>
        </div>

        {/* Right: Tips */}
        <div className="space-y-6">
          <div className="neon-card rounded-3xl p-8">
            <h3 className="text-xl font-semibold mb-4">💡 Scoring Systems Explained</h3>
            <div className="space-y-4 text-sm">
              <div>
                <p className="font-semibold text-slate-900">Total Points</p>
                <p className="text-slate-600">All member points added together</p>
              </div>
              <div>
                <p className="font-semibold text-slate-900">Average Points</p>
                <p className="text-slate-600">Fair for teams of different sizes</p>
              </div>
              <div>
                <p className="font-semibold text-slate-900">Tiered Completion</p>
                <p className="text-slate-600">0%, 50%, 100% completion levels</p>
              </div>
              <div>
                <p className="font-semibold text-slate-900">Streak-Based</p>
                <p className="text-slate-600">Rewards daily consistency</p>
              </div>
            </div>
          </div>

          <div className="neon-card rounded-3xl p-8">
            <h3 className="text-xl font-semibold mb-4">✨ After You Create</h3>
            <div className="space-y-3 text-slate-700">
              <div className="flex gap-3">
                <span className="text-2xl">1️⃣</span>
                <div>
                  <p className="font-semibold">Share your code</p>
                  <p className="text-sm text-slate-600">Invite friends to join</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="text-2xl">2️⃣</span>
                <div>
                  <p className="font-semibold">Check in daily</p>
                  <p className="text-sm text-slate-600">Build your streak</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="text-2xl">3️⃣</span>
                <div>
                  <p className="font-semibold">Use the chat</p>
                  <p className="text-sm text-slate-600">Encourage each other</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}