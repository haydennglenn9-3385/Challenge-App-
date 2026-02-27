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
      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl">

        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-0">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        {/* Rainbow strip */}
        <div
          className="h-1 w-full mt-3"
          style={{ background: "linear-gradient(90deg,#ff3c5f,#ff8c42,#ffd166,#06d6a0,#118ab2,#7b2d8b)" }}
        />

        <div className="p-6 pb-10 space-y-4 max-h-[85dvh] overflow-y-auto">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-extrabold text-slate-900 text-lg">Create New Team</p>
              <p className="text-xs text-slate-400 mt-0.5">Teams are scoped to a specific challenge</p>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition text-lg"
            >
              ×
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-sm text-red-600 font-semibold">{error}</p>
            </div>
          )}

          {/* Team name */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">
              Team Name
            </label>
            <input
              type="text"
              placeholder="e.g. Team Aria"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              autoFocus
            />
          </div>

          {/* Challenge */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">
              Challenge <span className="normal-case font-normal text-slate-400">(required)</span>
            </label>
            <select
              value={challengeId}
              onChange={(e) => setChallengeId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              <option value="">Select a challenge…</option>
              {challenges.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Color — using the component directly */}
          <TeamColorSelector value={color} onChange={setColor} />

          {/* Live preview */}
          {name.trim() && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 border border-slate-100">
              <div
                className="w-8 h-8 rounded-full flex-shrink-0"
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
            className="w-full py-4 rounded-xl font-extrabold text-sm text-white disabled:opacity-40"
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