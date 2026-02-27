// components/admin/AddTeamModal.tsx
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import TeamColorSelector, { PRIDE_GRADIENTS } from "@/components/manage/TeamColorSelector";

interface Challenge {
  id: string;
  name: string;
}

interface NewTeam {
  id: string;
  name: string;
  color: string;
  challenge_id: string | null;
  challenges?: { id: string; name: string }[] | null;
  team_members?: { user_id: string }[];
}

interface Props {
  challenges: Challenge[];
  onClose: () => void;
  onCreated: (team: NewTeam) => void;
}

export default function AddTeamModal({ challenges, onClose, onCreated }: Props) {
  const [name,        setName]        = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [color,       setColor]       = useState(PRIDE_GRADIENTS[0].gradient);
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState("");

  async function handleSubmit() {
    setError("");
    if (!name.trim()) { setError("Team name is required."); return; }
    if (!challengeId)  { setError("Please select a challenge."); return; }

    setSubmitting(true);

    const { data, error: insertError } = await supabase
      .from("teams")
      .insert({ name: name.trim(), color, challenge_id: challengeId || null })
      .select()
      .single();

    if (insertError || !data) {
      setError(insertError?.message || "Failed to create team.");
      setSubmitting(false);
      return;
    }

    const challenge = challenges.find((c) => c.id === challengeId);
    const newTeam: NewTeam = {
      ...data,
      challenges:   challenge ? [{ id: challenge.id, name: challenge.name }] : null,
      team_members: [],
    };

    onCreated(newTeam);
    setSubmitting(false);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(6px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl">

        {/* Drag handle — mobile only */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        {/* Rainbow strip — desktop only (handle replaces it on mobile) */}
        <div
          className="hidden sm:block h-1 w-full"
          style={{ background: "linear-gradient(90deg,#ff3c5f,#ff8c42,#ffd166,#06d6a0,#118ab2,#7b2d8b)" }}
        />

        <div className="px-6 pt-4 pb-10 space-y-5 max-h-[85dvh] overflow-y-auto">

          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <p
                className="text-xs font-bold tracking-[0.2em] uppercase mb-0.5"
                style={{
                  background: "linear-gradient(90deg,#ff6b9d,#ff9f43,#ffdd59,#48cfad,#667eea)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Admin
              </p>
              <h2 className="text-xl font-extrabold text-slate-900 leading-tight">
                Create New Team
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition text-base mt-0.5"
            >
              ×
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
              <p className="text-sm text-red-500 font-semibold">{error}</p>
            </div>
          )}

          {/* Team name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 block">
              Team name
            </label>
            <input
              type="text"
              placeholder="e.g. Team Aria"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-200 focus:bg-white transition"
              autoFocus
            />
          </div>

          {/* Challenge */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 block">
              Challenge
            </label>
            <select
              value={challengeId}
              onChange={(e) => setChallengeId(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-200 focus:bg-white transition appearance-none"
            >
              <option value="">Select a challenge…</option>
              {challenges.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Color */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 block">
              Team color
            </label>
            <div className="flex flex-wrap gap-3 pt-1">
              {PRIDE_GRADIENTS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  title={g.label}
                  onClick={() => setColor(g.gradient)}
                  className="relative w-10 h-10 rounded-full transition-transform hover:scale-110 active:scale-95"
                  style={{ background: g.gradient }}
                >
                  {color === g.gradient && (
                    <span className="absolute inset-0 rounded-full ring-[3px] ring-offset-2 ring-slate-800" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Live preview */}
          {name.trim() && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100">
              <div
                className="w-8 h-8 rounded-full flex-shrink-0 shadow-sm"
                style={{ background: color }}
              />
              <p className="text-sm font-bold text-slate-800">{name}</p>
              {challengeId && (
                <p className="text-xs text-slate-400 ml-auto truncate">
                  {challenges.find((c) => c.id === challengeId)?.name}
                </p>
              )}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitting || !name.trim() || !challengeId}
            className="w-full py-4 rounded-2xl font-extrabold text-sm disabled:opacity-40 transition"
            style={{
              background: "linear-gradient(90deg,#ff6b9d,#ff9f43,#ffdd59,#48cfad,#667eea)",
            }}
          >
            {submitting ? "Creating…" : "Create Team"}
          </button>

        </div>
      </div>
    </div>
  );
}