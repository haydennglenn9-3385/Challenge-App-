"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { createChallenge } from "@/lib/storage";

// ─── Constants ────────────────────────────────────────────────────────────────

const DURATION_UNITS = [
  { value: "days",   label: "Days"   },
  { value: "weeks",  label: "Weeks"  },
  { value: "months", label: "Months" },
];

const SCORING_SYSTEMS = [
  {
    value: "total_points",
    label: "Total Points",
    description: "Team score = sum of all member points",
    needsTarget: false,
  },
  {
    value: "average_points",
    label: "Average Points Per Member",
    description: "Fair for teams of different sizes — divides total by member count",
    needsTarget: false,
  },
  {
    value: "tiered",
    label: "Tiered Completion",
    description: "50%+ of target = 1 pt · 100%+ of target = 2 pts",
    needsTarget: true,
  },
  {
    value: "streak",
    label: "Streak-Based",
    description: "Points for showing up consistently — one tap check-in",
    needsTarget: false,
  },
  {
    value: "task_completion",
    label: "Task Completion",
    description: "Members check in when they complete the task",
    needsTarget: false,
  },
  {
    value: "progressive",
    label: "Progressive Challenge",
    description: "Target escalates each period — week 2 = 2×, week 3 = 3×, etc.",
    needsTarget: true,
  },
];

const TARGET_UNITS = [
  "reps", "minutes", "hours", "miles", "km",
  "kg", "lbs", "pages", "steps", "calories", "sessions",
];

const PROGRESSION_TYPES = [
  { value: "daily",          label: "Every day" },
  { value: "every_other_day",label: "Every other day" },
  { value: "weekdays_only",  label: "Weekdays only (Mon–Fri)" },
  { value: "weekly",         label: "Once per week" },
  { value: "monthly",        label: "Once per month" },
  { value: "every_x_days",   label: "Every X days" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewChallengePage() {
  const router = useRouter();

  const [session,        setSession]        = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  // Core fields
  const [title,         setTitle]         = useState("");
  const [durationValue, setDurationValue] = useState(21);
  const [durationUnit,  setDurationUnit]  = useState("days");
  const [description,   setDescription]   = useState("");
  const [isPublic,      setIsPublic]      = useState(true);
  const [scoringType,   setScoringType]   = useState("average_points");

  // Target fields
  const [dailyTarget,      setDailyTarget]      = useState<number | "">("");
  const [targetUnit,       setTargetUnit]       = useState("reps");
  const [progressionType,  setProgressionType]  = useState("daily");
  const [everyXDaysValue,  setEveryXDaysValue]  = useState<number | "">(2);

  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/auth"); return; }
      setSession(session);
      setLoadingSession(false);
    }
    load();
  }, [router]);

  function convertToDays() {
    const map: Record<string, number> = { days: 1, weeks: 7, months: 30 };
    return Math.ceil(durationValue * (map[durationUnit] ?? 1));
  }

  const selectedScoring = SCORING_SYSTEMS.find(s => s.value === scoringType);
  const targetRequired  = selectedScoring?.needsTarget ?? false;
  const showTarget      = scoringType !== "streak";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!title.trim()) { setError("Please enter a challenge name."); return; }
    if (targetRequired && !dailyTarget) {
      setError("A daily target is required for this scoring type.");
      return;
    }
    if (progressionType === "every_x_days" && (!everyXDaysValue || Number(everyXDaysValue) < 2)) {
      setError("Please enter a valid number of days (2 or more).");
      return;
    }

    setSubmitting(true);
    const challenge = await createChallenge({
      name:             title.trim(),
      duration:         convertToDays(),
      description:      description.trim() || undefined,
      creatorId:        session.user.id,
      isPublic,
      scoringType,
      dailyTarget:      dailyTarget !== "" ? Number(dailyTarget) : null,
      targetUnit:       dailyTarget !== "" ? targetUnit : null,
      progressionType,
      everyXDaysValue:  progressionType === "every_x_days" && everyXDaysValue !== ""
                          ? Number(everyXDaysValue)
                          : null,
    });

    if (challenge) {
      router.push(`/embed/challenge/${challenge.id}`);
    } else {
      setError("Failed to create challenge. Please try again.");
      setSubmitting(false);
    }
  }

  if (loadingSession) return (
    <div className="page-padding">
      <p className="text-center text-slate-600">Loading…</p>
    </div>
  );

  return (
    <div className="page-padding space-y-8">

      {/* Nav */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <button
          onClick={() => router.push("/embed/challenges")}
          className="rainbow-cta rounded-full px-5 py-2 font-semibold text-sm hover:shadow-xl transition-shadow"
        >
          ← Back to Challenges
        </button>
        <div className="flex gap-3">
          <button
            onClick={() => router.push("/embed/home")}
            className="px-4 py-2 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition text-sm"
          >
            Home
          </button>
          <button
            onClick={() => router.push("/embed/dashboard")}
            className="rainbow-cta rounded-full px-5 py-2 font-semibold text-sm hover:shadow-xl transition-shadow"
          >
            Dashboard
          </button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2 items-start">

        {/* ── Left: Form ─────────────────────────────────────────────── */}
        <div className="space-y-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500 mb-2">CREATE</p>
            <h2 className="text-4xl font-display mb-2">New Challenge</h2>
            <p className="text-slate-600">Start a fresh streak and invite your crew.</p>
          </div>

          <form onSubmit={handleSubmit} className="neon-card rounded-3xl p-8 space-y-6">

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Name */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Challenge Name</label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. 30-Day Push-up Challenge"
                className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">
                Description <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What's this challenge about?"
                rows={3}
                className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Duration</label>
              <div className="flex gap-3">
                <input
                  type="number"
                  min={1}
                  required
                  value={durationValue}
                  onChange={e => setDurationValue(Number(e.target.value))}
                  className="w-24 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
                <select
                  value={durationUnit}
                  onChange={e => setDurationUnit(e.target.value)}
                  className="flex-1 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-300"
                >
                  {DURATION_UNITS.map(u => (
                    <option key={u.value} value={u.value}>{u.label}</option>
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
                  className={`flex-1 px-4 py-3 rounded-2xl border-2 transition text-left ${
                    isPublic ? "border-slate-700 bg-slate-50" : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <p className="font-semibold">🌍 Public</p>
                  <p className="text-xs text-slate-600">Anyone can join</p>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPublic(false)}
                  className={`flex-1 px-4 py-3 rounded-2xl border-2 transition text-left ${
                    !isPublic ? "border-slate-700 bg-slate-50" : "border-slate-200 bg-white hover:bg-slate-50"
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
              <div className="grid grid-cols-1 gap-2">
                {SCORING_SYSTEMS.map(s => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setScoringType(s.value)}
                    className={`text-left px-4 py-3 rounded-2xl border-2 transition ${
                      scoringType === s.value
                        ? "border-slate-700 bg-slate-50"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <p className="font-semibold text-sm">{s.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{s.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Target block (hidden for streak) ─────────────────── */}
            {showTarget && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">
                <p className="text-sm font-semibold text-slate-700">
                  Daily Target
                  {targetRequired
                    ? <span className="text-red-500 ml-1">*</span>
                    : <span className="text-slate-400 font-normal ml-1">(optional)</span>
                  }
                </p>

                {/* Amount + unit */}
                <div className="flex gap-3">
                  <input
                    type="number"
                    min={1}
                    value={dailyTarget}
                    onChange={e => setDailyTarget(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder={scoringType === "progressive" ? "e.g. 5" : "e.g. 30"}
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  />
                  <select
                    value={targetUnit}
                    onChange={e => setTargetUnit(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-300"
                  >
                    {TARGET_UNITS.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>

                {/* Progression type */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Check-in Frequency
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {PROGRESSION_TYPES.map(p => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setProgressionType(p.value)}
                        className={`text-left px-3 py-2 rounded-xl border-2 transition text-xs font-semibold ${
                          progressionType === p.value
                            ? "border-slate-700 bg-white"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Every X days value */}
                {progressionType === "every_x_days" && (
                  <div className="flex items-center gap-3">
                    <p className="text-sm text-slate-600">Every</p>
                    <input
                      type="number"
                      min={2}
                      value={everyXDaysValue}
                      onChange={e => setEveryXDaysValue(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-20 rounded-xl border border-slate-200 bg-white px-3 py-2 text-center focus:outline-none focus:ring-2 focus:ring-slate-300"
                    />
                    <p className="text-sm text-slate-600">days</p>
                  </div>
                )}

                {/* Contextual hint */}
                <p className="text-xs text-slate-500">
                  {scoringType === "progressive"
                    ? `Target increases each period. Week 1 = ${dailyTarget || "?"} ${targetUnit}, Week 2 = ${dailyTarget ? Number(dailyTarget) * 2 : "?"} ${targetUnit}, etc.`
                    : scoringType === "tiered"
                    ? `50%+ = 1 pt · 100%+ = 2 pts`
                    : dailyTarget
                    ? `Members enter how much they completed. Points are proportional to target.`
                    : `No target set — check-in will be a single tap.`
                  }
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rainbow-cta rounded-full px-6 py-3 font-semibold hover:shadow-xl transition-shadow disabled:opacity-50"
            >
              {submitting ? "Creating…" : "Create Challenge"}
            </button>

          </form>
        </div>

        {/* ── Right: Tips ─────────────────────────────────────────────── */}
        <div className="space-y-6">
          <div className="neon-card rounded-3xl p-8">
            <h3 className="text-xl font-semibold mb-4">💡 Scoring Guide</h3>
            <div className="space-y-4 text-sm">
              <div>
                <p className="font-semibold text-slate-900">Total / Average Points</p>
                <p className="text-slate-600">Simple check-in — one tap earns the set points. Great for mindfulness, habits, anything without a number.</p>
              </div>
              <div>
                <p className="font-semibold text-slate-900">Tiered Completion</p>
                <p className="text-slate-600">Members enter how much they did. 50%+ of target = 1 pt, 100%+ = 2 pts. Good for workouts with a rep or time target.</p>
              </div>
              <div>
                <p className="font-semibold text-slate-900">Progressive</p>
                <p className="text-slate-600">Target escalates every period. Week 1 = base, Week 2 = 2×, Week 3 = 3×. Great for fitness challenges that build over time.</p>
              </div>
              <div>
                <p className="font-semibold text-slate-900">Streak-Based</p>
                <p className="text-slate-600">No numeric target — just show up. Points for consistency.</p>
              </div>
            </div>
          </div>

          <div className="neon-card rounded-3xl p-8">
            <h3 className="text-xl font-semibold mb-4">✨ After You Create</h3>
            <div className="space-y-3 text-slate-700">
              {[
                { n: "1️⃣", title: "Share your code",    sub: "Invite friends to join"     },
                { n: "2️⃣", title: "Check in regularly", sub: "Build your streak"           },
                { n: "3️⃣", title: "Use the chat",       sub: "Encourage each other"       },
              ].map(item => (
                <div key={item.n} className="flex gap-3">
                  <span className="text-2xl">{item.n}</span>
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-sm text-slate-600">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      <style>{`
        .page-padding {
          padding-left: 16px;
          padding-right: 16px;
          padding-top: 24px;
        }
        @media (min-width: 768px) {
          .page-padding {
            padding-left: 24px;
            padding-right: 24px;
            padding-top: 32px;
          }
        }
      `}</style>
    </div>
  );
}