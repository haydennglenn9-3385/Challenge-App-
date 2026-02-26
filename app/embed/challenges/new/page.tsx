"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type ChallengeMode = "individual" | "compete" | "teams";
type ScoringType =
  | "total_points"
  | "average_points"
  | "tiered"
  | "streak"
  | "progressive";

const MODES: { value: ChallengeMode; label: string; icon: string; desc: string }[] = [
  {
    value: "individual",
    label: "You vs You",
    icon: "🧘",
    desc: "Personal progress only. No leaderboard.",
  },
  {
    value: "compete",
    label: "Individuals Compete",
    icon: "⚡",
    desc: "Everyone on a shared leaderboard. No teams.",
  },
  {
    value: "teams",
    label: "Teams Compete",
    icon: "🏳️‍🌈",
    desc: "Team leaderboard with individual standings inside each team.",
  },
];

const SCORING: { value: ScoringType; label: string; desc: string }[] = [
  { value: "total_points",   label: "Total Points",    desc: "Sum of all points earned" },
  { value: "average_points", label: "Average Points",  desc: "Points ÷ members — fair for different team sizes" },
  { value: "tiered",         label: "Tiered",          desc: "Different points for 50% vs 100% completion" },
  { value: "streak",         label: "Streak-Based",    desc: "Bonus points for daily consistency" },
  { value: "progressive",    label: "Progressive",     desc: "Difficulty increases weekly" },
];

const DURATION_UNITS = [
  { value: "days",   label: "Days"   },
  { value: "weeks",  label: "Weeks"  },
  { value: "months", label: "Months" },
];

export default function NewChallengePage() {
  const router = useRouter();

  const [userId, setUserId]           = useState<string | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [title, setTitle]               = useState("");
  const [description, setDescription]   = useState("");
  const [mode, setMode]                 = useState<ChallengeMode>("compete");
  const [scoringType, setScoringType]   = useState<ScoringType>("average_points");
  const [durationValue, setDurationValue] = useState(21);
  const [durationUnit, setDurationUnit]   = useState("days");
  const [isPublic, setIsPublic]         = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push("/auth"); return; }
      setUserId(session.user.id);
      setLoadingAuth(false);
    });
  }, [router]);

  const toDays = () => {
    const map: Record<string, number> = { days: 1, weeks: 7, months: 30 };
    return Math.ceil(durationValue * (map[durationUnit] ?? 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) { setError("Challenge name is required."); return; }
    if (!userId) { setError("You must be logged in."); return; }

    setSubmitting(true);

    const days      = toDays();
    const startDate = new Date().toISOString().split("T")[0];
    const endDate   = new Date(Date.now() + days * 86400000).toISOString().split("T")[0];
    const joinCode  = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Only create a team row when mode = teams
    let teamId: string | null = null;
    if (mode === "teams") {
      const { data: team, error: teamErr } = await supabase
        .from("teams")
        .insert({ name: `${title.trim()} Team` })
        .select("id")
        .single();

      if (teamErr || !team) {
        setError(`Failed to create team: ${teamErr?.message ?? "unknown error"}`);
        setSubmitting(false);
        return;
      }
      teamId = team.id;
    }

    const { data: challenge, error: challengeErr } = await supabase
      .from("challenges")
      .insert({
        name:                    title.trim(),
        description:             description.trim() || null,
        join_code:               joinCode,
        creator_id:              userId,
        team_id:                 teamId,
        start_date:              startDate,
        end_date:                endDate,
        is_public:               isPublic,
        scoring_type:            scoringType,
        mode:                    mode,
        local_points_per_checkin: 10,
      })
      .select("id")
      .single();

    if (challengeErr || !challenge) {
      setError(`Failed to create challenge: ${challengeErr?.message ?? "unknown error"}`);
      setSubmitting(false);
      return;
    }

    // Auto-join creator
    await supabase.from("challenge_members").insert({
      challenge_id: challenge.id,
      user_id: userId,
    });

    if (teamId) {
      await supabase.from("team_members").insert({
        team_id: teamId,
        user_id: userId,
      });
    }

    router.push(`/embed/challenge/${challenge.id}`);
  };

  if (loadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-400 font-semibold">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-5 pt-6 pb-28 space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/embed/challenges")}
          className="w-9 h-9 rounded-full neon-card flex items-center justify-center text-slate-600 hover:bg-white transition flex-shrink-0"
        >
          ←
        </button>
        <div>
          <p className="text-xs font-bold tracking-[0.2em] uppercase" style={{
            background: "linear-gradient(90deg,#ff6b9d,#ff9f43,#ffdd59,#48cfad,#667eea)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            New Challenge
          </p>
          <h1 className="text-2xl font-display font-extrabold text-slate-900 tracking-tight">
            Create a Challenge
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
            <p className="text-sm text-red-600 font-medium">{error}</p>
          </div>
        )}

        {/* Name */}
        <div className="neon-card rounded-2xl p-5 space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
            Challenge Name
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Summer Shred, 75 Hard, Daily Steps"
            className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
        </div>

        {/* Description */}
        <div className="neon-card rounded-2xl p-5 space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
            Description <span className="normal-case font-normal">(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's this challenge about?"
            rows={3}
            className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none"
          />
        </div>

        {/* Mode picker */}
        <div className="neon-card rounded-2xl p-5 space-y-3">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block">
            Challenge Type
          </label>
          <div className="space-y-2">
            {MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMode(m.value)}
                className="w-full flex items-center gap-4 rounded-xl border-2 px-4 py-3 text-left transition-all"
                style={{
                  borderColor: mode === m.value ? "#a855f7" : "transparent",
                  background: mode === m.value
                    ? "linear-gradient(135deg, rgba(168,85,247,0.08), rgba(102,126,234,0.08))"
                    : "rgba(0,0,0,0.03)",
                }}
              >
                <span className="text-2xl">{m.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900">{m.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{m.desc}</p>
                </div>
                <div
                  className="w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all"
                  style={{
                    borderColor: mode === m.value ? "#a855f7" : "#cbd5e1",
                    background: mode === m.value ? "#a855f7" : "transparent",
                  }}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Scoring */}
        <div className="neon-card rounded-2xl p-5 space-y-3">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block">
            Scoring System
          </label>
          <div className="space-y-2">
            {SCORING.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setScoringType(s.value)}
                className="w-full flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all"
                style={{
                  borderColor: scoringType === s.value ? "#667eea" : "transparent",
                  background: scoringType === s.value
                    ? "rgba(102,126,234,0.08)"
                    : "rgba(0,0,0,0.03)",
                }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900">{s.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{s.desc}</p>
                </div>
                <div
                  className="w-4 h-4 rounded-full border-2 flex-shrink-0"
                  style={{
                    borderColor: scoringType === s.value ? "#667eea" : "#cbd5e1",
                    background: scoringType === s.value ? "#667eea" : "transparent",
                  }}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div className="neon-card rounded-2xl p-5 space-y-3">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block">
            Duration
          </label>
          <div className="flex gap-3">
            <input
              type="number"
              min={1}
              max={365}
              value={durationValue}
              onChange={(e) => setDurationValue(Number(e.target.value))}
              className="w-24 rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm font-semibold text-center focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
            <div className="flex gap-2 flex-1">
              {DURATION_UNITS.map((u) => (
                <button
                  key={u.value}
                  type="button"
                  onClick={() => setDurationUnit(u.value)}
                  className="flex-1 rounded-xl border-2 py-3 text-sm font-bold transition-all"
                  style={{
                    borderColor: durationUnit === u.value ? "#a855f7" : "#e2e8f0",
                    background: durationUnit === u.value ? "rgba(168,85,247,0.08)" : "white",
                    color: durationUnit === u.value ? "#7c3aed" : "#64748b",
                  }}
                >
                  {u.label}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-slate-400">
            Ends {new Date(Date.now() + toDays() * 86400000).toLocaleDateString("en-US", {
              month: "long", day: "numeric", year: "numeric",
            })}
          </p>
        </div>

        {/* Visibility */}
        <div className="neon-card rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-900">
                {isPublic ? "🌍 Public" : "🔒 Private"}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {isPublic
                  ? "Anyone can see and join this challenge"
                  : "Only people with the join code can join"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsPublic(!isPublic)}
              className="w-12 h-6 rounded-full transition-all flex-shrink-0"
              style={{
                background: isPublic
                  ? "linear-gradient(90deg,#ff6b9d,#667eea)"
                  : "#e2e8f0",
              }}
            >
              <div
                className="w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5"
                style={{ transform: isPublic ? "translateX(24px)" : "translateX(0)" }}
              />
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || !title.trim()}
          className="w-full rainbow-cta rounded-2xl py-4 font-bold text-base disabled:opacity-50 transition-all"
        >
          {submitting ? "Creating…" : "Create Challenge"}
        </button>

      </form>
    </div>
  );
}