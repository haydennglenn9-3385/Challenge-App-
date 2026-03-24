"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { createChallenge } from "@/lib/storage";
import LoadingScreen from "@/components/LoadingScreen";
import { PRIDE_GRADIENTS } from "@/components/manage/TeamColorSelector";

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
{ value: "steps", label: "Steps", description: "Daily step count tracking" },
];

const DURATION_PRESETS = [
  { label: "2 weeks", days: 14 },
  { label: "21 days", days: 21 },
  { label: "30 days", days: 30 },
  { label: "60 days", days: 60 },
  { label: "90 days", days: 90 },
];

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

const METRIC_SCORING_TYPES = new Set(["time", "distance", "weight", "reps"]);

const DEFAULT_UNIT: Record<string, string> = {
  time:     "min",
  distance: "km",
  weight:   "lbs",
  reps:     "reps",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface TeamDraft {
  id:    string;
  name:  string;
  color: string;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewChallengePage() {
  const router = useRouter();

  // ── Session ───────────────────────────────────────────────────────────────
  const [loadingSession, setLoadingSession] = useState(true);
  const [session,        setSession]        = useState<any>(null);

  // ── Core fields ───────────────────────────────────────────────────────────
  const [durationMode, setDurationMode] = useState<"days" | "dates">("days");
  const [startDate,    setStartDate]    = useState("");
  const [endDate,      setEndDate]      = useState("");
  const [isOngoing, setIsOngoing] = useState(false);
  const [title,        setTitle]        = useState("");
  const [description,  setDescription]  = useState("");
  const [durationDays, setDurationDays] = useState(21);
  const [customDays,   setCustomDays]   = useState("");
  const [isPublic,     setIsPublic]     = useState(true);
  const [hasTeams,     setHasTeams]     = useState(false);
  const [scoringType,  setScoringType]  = useState("simple");
  const [targetUnit,       setTargetUnit]       = useState<string>("");
  const [scoringDirection, setScoringDirection] = useState<"asc" | "desc">("desc");
  const [submitting,   setSubmitting]   = useState(false);
  const [error,        setError]        = useState("");
  const [dailyTarget, setDailyTarget] = useState<string>(""); 

  // ── Team setup ────────────────────────────────────────────────────────────
  const [teamDrafts,   setTeamDrafts]   = useState<TeamDraft[]>([]);
  const [maxTeamSize,  setMaxTeamSize]  = useState("");
  const [autoAssign,   setAutoAssign]   = useState(false);

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push("/auth");
      else setSession(session);
      setLoadingSession(false);
    });
  }, [router]);

  // ── Reset unit when scoring type changes ──────────────────────────────────
  useEffect(() => {
    if (METRIC_SCORING_TYPES.has(scoringType)) {
      setTargetUnit(DEFAULT_UNIT[scoringType] ?? "");
    } else {
      setTargetUnit("");
    }
  }, [scoringType]);

  if (loadingSession) return <LoadingScreen />;

  // ── Team draft helpers ────────────────────────────────────────────────────

  function addTeamDraft() {
    const idx = teamDrafts.length % PRIDE_GRADIENTS.length;
    setTeamDrafts(p => [
      ...p,
      { id: crypto.randomUUID(), name: "", color: PRIDE_GRADIENTS[idx].gradient },
    ]);
  }

  function removeTeamDraft(id: string) {
    setTeamDrafts(p => p.filter(t => t.id !== id));
  }

  function cycleTeamColor(id: string) {
    setTeamDrafts(p =>
      p.map(t => {
        if (t.id !== id) return t;
        const curr = PRIDE_GRADIENTS.findIndex(g => g.gradient === t.color);
        const next = (curr + 1) % PRIDE_GRADIENTS.length;
        return { ...t, color: PRIDE_GRADIENTS[next].gradient };
      })
    );
  }

  function updateTeamName(id: string, name: string) {
    setTeamDrafts(p => p.map(t => (t.id === id ? { ...t, name } : t)));
  }

  /// ── Submit ────────────────────────────────────────────────────────────────

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");

      if (!title.trim()) { setError("Please enter a challenge name."); return; }
      if (!session)       { setError("You must be logged in.");         return; }

      if (METRIC_SCORING_TYPES.has(scoringType) && !targetUnit) {
        setError("Please select a unit for your scoring type.");
        return;
      }

      if (scoringType === "progressive_exercise" && !dailyTarget) {
        setError("Please enter a starting rep count.");
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
        isOngoing,                // ← ADD
        scoringType:      scoringType === "progressive_exercise" ? "progressive" : scoringType,
        scoringDirection: scoringType === "time" ? scoringDirection : undefined,
        hasTeams,
        dailyTarget: scoringType === "progressive_exercise" ? parseInt(dailyTarget, 10) : undefined,
        targetUnit:  targetUnit || undefined,
        ...(durationMode === "dates" && startDate && !isOngoing && endDate
          ? { startDate, endDate }                              // ← Guard with !isOngoing
          : durationMode === "dates" && startDate && isOngoing
          ? { startDate }
          : {}),
      });

      if (!challenge) {
        setError("Failed to create challenge. Please try again.");
        setSubmitting(false);
        return;
      }

      // ── Post-creation: teams ───────────────────────────────────────────────
      if (hasTeams) {
        const validDrafts = teamDrafts.filter(t => t.name.trim());
        if (validDrafts.length > 0) {
          const maxSize = maxTeamSize ? parseInt(maxTeamSize, 10) : null;
          await supabase.from("teams").insert(
            validDrafts.map(t => ({
              name:         t.name.trim(),
              color:        t.color,
              challenge_id: challenge.id,
              ...(maxSize ? { max_members: maxSize } : {}),
            }))
          );
        }

        if (autoAssign) {
          await supabase
            .from("challenges")
            .update({ auto_assign_teams: true })
            .eq("id", challenge.id);
        }
      }

      router.push(`/embed/challenge/${challenge.id}/manage`);
    };


  const activeDays   = customDays ? parseInt(customDays, 10) || 0 : durationDays;
  const unitOptions  = UNIT_OPTIONS[scoringType] ?? [];
  const needsUnit    = METRIC_SCORING_TYPES.has(scoringType);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen px-5 pt-6 pb-28 space-y-5 max-w-lg mx-auto">

      {/* ── Header ── */}
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

        {/* ── Challenge Details ── */}
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

        {/* ── Duration ── */}
        <div className="neon-card rounded-2xl">
          <div className="h-1 w-full rainbow-cta rounded-t-2xl" />
          <div className="p-5 space-y-3">
            <p className="font-extrabold text-slate-900">Duration</p>

            <div className="flex gap-2 p-1 rounded-2xl bg-slate-100">
              {(["days", "dates"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setDurationMode(mode);
                    if (mode === "days") setIsOngoing(false); // reset ongoing when switching
                  }}
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
                      onClick={() => {
                        setDurationDays(p.days);
                        setCustomDays("");
                      }}
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
              <div className="space-y-3">
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      style={{
                        display: "block",
                        width: "100%",
                        minWidth: 0,
                        boxSizing: "border-box" as const,
                        padding: "10px 8px",
                        borderRadius: 14,
                        border: "1.5px solid #e2e8f0",
                        background: "rgba(255,255,255,0.8)",
                        fontSize: 13,
                        fontFamily: "var(--font-inter), system-ui, sans-serif",
                        outline: "none",
                        color: "#0e0e0e",
                        WebkitAppearance: "none",
                      }}
                    />
                  </div>
                
                  <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">
                      End Date{" "}
                      {isOngoing && (
                        <span style={{ textTransform: "none", fontWeight: 400, color: "#94a3b8" }}>
                          (ongoing)
                        </span>
                      )}
                    </label>
                    <input
                      type="date"
                      disabled={isOngoing}
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      style={{
                        display: "block",
                        width: "100%",
                        minWidth: 0,
                        boxSizing: "border-box" as const,
                        padding: "10px 8px",
                        borderRadius: 14,
                        border: "1.5px solid #e2e8f0",
                        background: isOngoing ? "#f8fafc" : "rgba(255,255,255,0.8)",
                        fontSize: 13,
                        fontFamily: "var(--font-inter), system-ui, sans-serif",
                        outline: "none",
                        color: isOngoing ? "#cbd5e1" : "#0e0e0e",
                        cursor: isOngoing ? "not-allowed" : "auto",
                        WebkitAppearance: "none",
                      }}
                    />
                  </div>
                </div>

                {/* Ongoing toggle */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="ongoing"
                    checked={isOngoing}
                    onChange={(e) => setIsOngoing(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <label htmlFor="ongoing" className="text-sm text-slate-700">
                    This challenge has no end date (ongoing)
                  </label>
                </div>

                {/* Summary */}
                {isOngoing ? (
                  <p className="text-xs text-slate-400 font-semibold">
                    This challenge is ongoing.
                  </p>
                ) : (
                  startDate &&
                  endDate &&
                  new Date(endDate) > new Date(startDate) && (
                    <p className="text-xs text-slate-400 font-semibold">
                      {Math.round(
                        (new Date(endDate).getTime() -
                          new Date(startDate).getTime()) /
                          86_400_000
                      )}{" "}
                      days
                    </p>
                  )
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Visibility ── */}
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

        {/* ── Mode ── */}
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
                ? "Members will be assigned to teams. Define them below or add after creation."
                : "Members compete individually on the leaderboard."}
            </p>
          </div>
        </div>

        {/* ── Team Setup (conditional) ── */}
        {hasTeams && (
          <div className="neon-card rounded-2xl overflow-hidden">
            <div className="h-1 w-full rainbow-cta" />
            <div className="p-5 space-y-5">
              <p className="font-extrabold text-slate-900">Team Setup</p>

              {/* Auto-assign toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50">
                <div className="pr-4">
                  <p className="text-sm font-bold text-slate-800">Auto-assign members</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    New members are placed into the smallest team automatically
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoAssign(p => !p)}
                  className={`w-11 h-6 rounded-full transition-all relative flex-shrink-0 ${
                    autoAssign ? "bg-violet-500" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                      autoAssign ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              {/* Max team size */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">
                  Max members per team{" "}
                  <span className="normal-case font-normal text-slate-400">(optional)</span>
                </label>
                <input
                  type="number"
                  min={1}
                  value={maxTeamSize}
                  onChange={(e) => setMaxTeamSize(e.target.value)}
                  placeholder="e.g. 5"
                  className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>

              {/* Pre-define teams */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">
                  Define Teams{" "}
                  <span className="normal-case font-normal text-slate-400">
                    (optional — you can add after creation)
                  </span>
                </label>

                {teamDrafts.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-3">
                    No teams defined yet.
                  </p>
                ) : (
                  <div className="space-y-2 mb-3">
                    {teamDrafts.map((team, i) => (
                      <div key={team.id} className="flex items-center gap-2">
                        {/* Color dot — click to cycle */}
                        <button
                          type="button"
                          onClick={() => cycleTeamColor(team.id)}
                          title="Click to cycle color"
                          className="w-8 h-8 rounded-full flex-shrink-0 border-2 border-white shadow-sm hover:scale-110 transition-transform"
                          style={{ background: team.color }}
                        />
                        <input
                          type="text"
                          value={team.name}
                          onChange={(e) => updateTeamName(team.id, e.target.value)}
                          placeholder={`Team ${i + 1} name`}
                          className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                        />
                        <button
                          type="button"
                          onClick={() => removeTeamDraft(team.id)}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-red-400 hover:bg-red-50 transition flex-shrink-0 text-sm"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={addTeamDraft}
                  className="w-full py-2.5 rounded-xl border-2 border-dashed border-slate-300 text-xs font-bold text-slate-500 hover:border-slate-400 hover:bg-slate-50 transition"
                >
                  + Add Team
                </button>

                {teamDrafts.length > 0 && (
                  <p className="text-[11px] text-slate-400 text-center mt-2">
                    Tap a color dot to cycle through pride palette colors
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Scoring ── */}
        <div className="neon-card rounded-2xl overflow-hidden">
          <div className="h-1 w-full rainbow-cta" />
          <div className="p-5 space-y-4">
            <p className="font-extrabold text-slate-900">Scoring</p>

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

            {needsUnit && unitOptions.length > 0 && (
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">
                  Unit
                </label>
                <div className="grid grid-cols-2 gap-2 overflow-hidden">
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
                  {scoringType === "time" && (
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">
                        Ranking Direction
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { value: "asc",  label: "⚡ Fastest",  desc: "Lower time = higher rank" },
                          { value: "desc", label: "⏱️ Longest",  desc: "More time = higher rank"  },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setScoringDirection(opt.value as "asc" | "desc")}
                            className={`px-4 py-3 rounded-xl border-2 text-left transition-all ${
                              scoringDirection === opt.value
                                ? "border-slate-800 bg-slate-50 text-slate-900"
                                : "border-slate-200 text-slate-500 hover:border-slate-300"
                            }`}
                          >
                            <p className="font-bold text-sm">{opt.label}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
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

        {/* ── Progressive: Base Reps ── */}
        {scoringType === "progressive_exercise" && (
          <div className="neon-card rounded-2xl overflow-hidden">
            <div className="h-1 w-full rainbow-cta" />
            <div className="p-5 space-y-3">
              <p className="font-extrabold text-slate-900">Starting Reps</p>
              <p className="text-xs text-slate-400">
                Week 1 daily target. Increases by this amount each week (e.g. 5 → Week 2 = 10 reps/day).
              </p>
              <input
                type="number"
                min={1}
                value={dailyTarget}
                onChange={(e) => setDailyTarget(e.target.value)}
                placeholder="e.g. 5"
                className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
              {dailyTarget && (
                <div className="px-4 py-2.5 rounded-xl text-xs text-slate-500" style={{ background: "rgba(0,0,0,0.04)" }}>
                  📈 Week 1: <strong>{dailyTarget} reps/day</strong> · Week 2: <strong>{Number(dailyTarget) * 2}</strong> · Week 3: <strong>{Number(dailyTarget) * 3}</strong>…
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Submit ── */}
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