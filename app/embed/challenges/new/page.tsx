"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { createChallenge } from "@/lib/storage";
import LoadingScreen from "@/components/LoadingScreen";

// ─── Constants ────────────────────────────────────────────────────────────────
const SCORING_SYSTEMS = [
  { value: "simple",               label: "Simple Check-in",   description: "Members check in when they complete the task" },
  { value: "average_points",       label: "Average Points",    description: "Team score = average of member points (fair for different team sizes)" },
  { value: "total_points",         label: "Total Points",      description: "Team score = sum of all member points" },
  { value: "streak_based",         label: "Streak-Based",      description: "Rewards daily consistency with bonus points" },
  { value: "tiered_completion",    label: "Tiered Completion", description: "Different points for 0%, 50%, or 100% completion" },
  { value: "progressive_exercise", label: "Progressive",       description: "Difficulty increases weekly — great for fitness" },
  { value: "reps",                 label: "Reps",              description: "Count repetitions" },
  { value: "time",                 label: "Time",              description: "Track duration" },
  { value: "distance",             label: "Distance",          description: "Track distance covered" },
  { value: "weight",               label: "Weight",            description: "Track weight lifted" },
];

const DURATION_PRESETS = [
  { label: "2 weeks", days: 14 },
  { label: "21 days", days: 21 },
  { label: "30 days", days: 30 },
  { label: "60 days", days: 60 },
  { label: "90 days", days: 90 },
];

// ─── Unit options per metric scoring type ─────────────────────────────────────
const UNIT_OPTIONS: Record<string, { value: string; label: string }[]> = {
  time: [
    { value: "sec", label: "Seconds" },
    { value: "min", label: "Minutes" },
    { value: "hr",  label: "Hours"   },
  ],
  distance: [
    { value: "m",   label: "Meters"     },
    { value: "km",  label: "Kilometers" },
    { value: "mi",  label: "Miles"      },
    { value: "yd",  label: "Yards"      },
  ],
  weight: [
    { value: "lbs", label: "Pounds (lbs)" },
    { value: "kg",  label: "Kilograms (kg)" },
  ],
  reps: [
    { value: "reps", label: "Reps" },
    { value: "sets", label: "Sets" },
  ],
};

// Scoring types that require a unit selection
const METRIC_SCORING_TYPES = new Set(["time", "distance", "weight", "reps"]);

// Default unit per scoring type
const DEFAULT_UNIT: Record<string, string> = {
  time:     "min",
  distance: "km",
  weight:   "lbs",
  reps:     "reps",
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function NewChallengePage() {
  const router = useRouter();

  const [loadingSession, setLoadingSession] = useState(true);
  const [session,        setSession]        = useState<any>(null);
  const [durationMode,   setDurationMode]   = useState<"days" | "dates">("days");
  const [startDate,      setStartDate]      = useState("");
  const [endDate,        setEndDate]        = useState("");
  const [title,          setTitle]          = useState("");
  const [description,    setDescription]    = useState("");
  const [durationDays,   setDurationDays]   = useState(21);
  const [customDays,     setCustomDays]     = useState("");
  const [isPublic,       setIsPublic]       = useState(true);
  const [hasTeams,       setHasTeams]       = useState(false);
  const [scoringType,    setScoringType]    = useState("simple");
  const [targetUnit,     setTargetUnit]     = useState<string>("");
  const [submitting,     setSubmitting]     = useState(false);
  const [error,          setError]          = useState("");

  // ── Auth ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push("/auth");
      else setSession(session);
      setLoadingSession(false);
    });
  }, [router]);

  // ── Reset unit when scoring type changes ───────────────────────────────────
  useEffect(() => {
    if (METRIC_SCORING_TYPES.has(scoringType)) {
      setTargetUnit(DEFAULT_UNIT[scoringType] ?? "");
    } else {
      setTargetUnit("");
    }
  }, [scoringType]);

  if (loadingSession) return <LoadingScreen />;

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) { setError("Please enter a challenge name."); return; }
    if (!session)       { setError("You must be logged in.");         return; }

    // Require a unit if the scoring type needs one
    if (METRIC_SCORING_TYPES.has(scoringType) && !targetUnit) {
      setError("Please select a unit for your scoring type.");
      return;
    }

    setSubmitting(true);

    const days =
      durationMode === "dates" && startDate && endDate
        ? Math.round(
            (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86_400_000
          )
        : customDays
        ? parseInt(customDays, 10)
        : durationDays;

    const challenge = await createChallenge({
      name:        title.trim(),
      duration:    days,
      description: description.trim() || undefined,
      creatorId:   session.user.id,
      isPublic,
      scoringType,
      hasTeams,
      targetUnit:  targetUnit || undefined,
      ...(durationMode === "dates" && startDate && endDate
        ? { startDate, endDate }
        : {}),
    });

    if (challenge) {
      router.push(`/embed/challenge/${challenge.id}/manage`);
    } else {
      setError("Failed to create challenge. Please try again.");
      setSubmitting(false);
    }
  };

  const activeDays = customDays ? parseInt(customDays, 10) || 0 : durationDays;
  const unitOptions = UNIT_OPTIONS[scoringType] ?? [];
  const needsUnit   = METRIC_SCORING_TYPES.has(scoringType);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen px-5 pt-6 pb-28 space-y-5 max-w-lg mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full neon-card flex items-center justify-center text-slate-600 hover:bg-white transition flex-shrink-0"
        >
          ←
        </button>
        <div>
          <p
            className="text-xs font-bold tracking-[0.2em] uppercase"
            style={{
              background: "linear-gradient(90deg,#ff6b9d,#ff9f43,#ffdd59,#48cfad,#667eea)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            New
          </p>
          <h1 className="text-2xl font-display font-extrabold text-slate-900 tracking-tight leading-tight">
            Create Challenge
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
            <p className="text-sm text-red-600 font-semibold">{error}</p>
          </div>
        )}

        {/* ── Challenge Details ──────────────────────────────────────────────── */}
        <div className="neon-card rounded-2xl overflow-hidden">
          <div className="h-1 w-full rainbow-cta" />
          <div className="p-5 space-y-4">
            <p className="font-extrabold text-slate-900">Challenge Details</p>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">
                Name
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. 30-Day Push-Up Challenge"
                className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">
                Description{" "}
                <span className="normal-case font-normal text-slate-400">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this challenge about?"
                rows={3}
                className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
              />
            </div>
          </div>
        </div>

        {/* ── Duration ──────────────────────────────────────────────────────── */}
        <div className="neon-card rounded-2xl overflow-hidden">
          <div className="h-1 w-full rainbow-cta" />
          <div className="p-5 space-y-3">
            <p className="font-extrabold text-slate-900">Duration</p>

            <div className="flex gap-2 p-1 rounded-2xl bg-slate-100">
              {(["days", "dates"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setDurationMode(mode)}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                    durationMode === mode
                      ? "bg-white shadow text-slate-900"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {mode === "days" ? "By Days" : "By Dates"}
                </button>
              ))}
            </div>

            {durationMode === "days" ? (
              <>
                <div className="flex flex-wrap gap-2">
                  {DURATION_PRESETS.map((p) => (
                    <button
                      key={p.days}
                      type="button"
                      onClick={() => { setDurationDays(p.days); setCustomDays(""); }}
                      className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition ${
                        !customDays && durationDays === p.days
                          ? "border-slate-800 bg-slate-50 text-slate-900"
                          : "border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">
                    Custom (days)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={customDays}
                    onChange={(e) => setCustomDays(e.target.value)}
                    placeholder="e.g. 45"
                    className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </div>
                {activeDays > 0 && (
                  <p className="text-xs text-slate-400 font-semibold">
                    Challenge runs for{" "}
                    <span className="text-slate-700">{activeDays} days</span>
                  </p>
                )}
              </>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </div>
                {startDate && endDate && new Date(endDate) > new Date(startDate) && (
                  <p className="text-xs text-slate-400 font-semibold col-span-2">
                    {Math.round(
                      (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86_400_000
                    )}{" "}
                    days
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Visibility ────────────────────────────────────────────────────── */}
        <div className="neon-card rounded-2xl overflow-hidden">
          <div className="h-1 w-full rainbow-cta" />
          <div className="p-5 space-y-3">
            <p className="font-extrabold text-slate-900">Visibility</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsPublic(true)}
                className={`flex-1 px-4 py-3 rounded-xl border-2 text-left transition ${
                  isPublic
                    ? "border-slate-800 bg-slate-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <p className="font-bold text-sm">🌍 Public</p>
                <p className="text-xs text-slate-500 mt-0.5">Anyone can join</p>
              </button>
              <button
                type="button"
                onClick={() => setIsPublic(false)}
                className={`flex-1 px-4 py-3 rounded-xl border-2 text-left transition ${
                  !isPublic
                    ? "border-slate-800 bg-slate-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <p className="font-bold text-sm">🔒 Private</p>
                <p className="text-xs text-slate-500 mt-0.5">Invite-only via code</p>
              </button>
            </div>
          </div>
        </div>

        {/* ── Mode ──────────────────────────────────────────────────────────── */}
        <div className="neon-card rounded-2xl overflow-hidden">
          <div className="h-1 w-full rainbow-cta" />
          <div className="p-5 space-y-3">
            <p className="font-extrabold text-slate-900">Mode</p>
            <div className="flex gap-2 p-1 rounded-2xl bg-slate-100">
              <button
                type="button"
                onClick={() => setHasTeams(false)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  !hasTeams
                    ? "bg-white shadow text-slate-900"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                👤 Individual
              </button>
              <button
                type="button"
                onClick={() => setHasTeams(true)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  hasTeams
                    ? "bg-white shadow text-slate-900"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                👥 Teams
              </button>
            </div>
            <p className="text-xs text-slate-400">
              {hasTeams
                ? "Members will be assigned to teams. You can create teams after."
                : "Members compete individually on the leaderboard."}
            </p>
          </div>
        </div>

        {/* ── Scoring ───────────────────────────────────────────────────────── */}
        <div className="neon-card rounded-2xl overflow-hidden">
          <div className="h-1 w-full rainbow-cta" />
          <div className="p-5 space-y-4">
            <p className="font-extrabold text-slate-900">Scoring</p>

            {/* Scoring type dropdown */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">
                Scoring Type
              </label>
              <select
                value={scoringType}
                onChange={(e) => setScoringType(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                {SCORING_SYSTEMS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-400 mt-2">
                {SCORING_SYSTEMS.find((s) => s.value === scoringType)?.description}
              </p>
            </div>

            {/* Unit picker — only shown for metric scoring types */}
            {needsUnit && unitOptions.length > 0 && (
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">
                  Unit
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {unitOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setTargetUnit(opt.value)}
                      className={`px-4 py-3 rounded-xl border-2 text-left transition-all ${
                        targetUnit === opt.value
                          ? "border-slate-800 bg-slate-50 text-slate-900"
                          : "border-slate-200 text-slate-500 hover:border-slate-300"
                      }`}
                    >
                      <p className="font-bold text-sm">{opt.label}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                        {opt.value}
                      </p>
                    </button>
                  ))}
                </div>

                {/* Preview of how logs will appear */}
                {targetUnit && (
                  <div
                    className="mt-3 px-4 py-2.5 rounded-xl flex items-center gap-2"
                    style={{ background: "rgba(0,0,0,0.04)" }}
                  >
                    <span className="text-sm">👁</span>
                    <p className="text-xs text-slate-500">
                      Members will log their{" "}
                      <span className="font-bold text-slate-700">
                        {SCORING_SYSTEMS.find((s) => s.value === scoringType)?.label.toLowerCase()}
                      </span>{" "}
                      in{" "}
                      <span className="font-bold text-slate-700">
                        {unitOptions.find((u) => u.value === targetUnit)?.label.toLowerCase()}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || !title.trim()}
          className="rainbow-cta w-full rounded-2xl py-4 font-extrabold text-sm disabled:opacity-50"
        >
          {submitting ? "Creating…" : "Create Challenge →"}
        </button>

      </form>
    </div>
  );
}