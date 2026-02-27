"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

interface Challenge {
  id: string;
  name: string;
  has_teams: boolean;
}

interface Team {
  id: string;
  name: string;
  color?: string;
  challenges?: { id: string }[] | null;
}

interface NewMember {
  id: string;
  name: string;
  email: string;
  total_points: number;
  streak: number;
}

interface Props {
  challenges: Challenge[];
  teams: Team[];
  onClose: () => void;
  onCreated: (member: NewMember) => void;
}

export default function AddMemberModal({ challenges, teams, onClose, onCreated }: Props) {
  const [name,        setName]        = useState("");
  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [teamId,      setTeamId]      = useState("");
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState("");

  const selectedChallenge = challenges.find((c) => c.id === challengeId);
  const availableTeams    = challengeId
    ? teams.filter((t) => t.challenges?.[0]?.id === challengeId)
    : [];

  async function handleSubmit() {
    setError("");
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Name, email, and password are all required.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);

    const res = await fetch("/api/admin/create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), email: email.trim(), password: password.trim() }),
    });

    const json = await res.json();
    if (!res.ok || !json.user) {
      setError(json.error || "Failed to create user.");
      setSubmitting(false);
      return;
    }

    const newUser = json.user;

    if (challengeId) {
      await supabase
        .from("challenge_members")
        .insert({ challenge_id: challengeId, user_id: newUser.id });

      if (teamId) {
        await supabase
          .from("team_members")
          .insert({ team_id: teamId, user_id: newUser.id });
      }
    }

    onCreated(newUser);
    setSubmitting(false);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full sm:w-[460px] sm:max-w-[460px] bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl">

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
              <p className="font-extrabold text-slate-900 text-lg">Add New Member</p>
              <p className="text-xs text-slate-400 mt-0.5">Creates an account and optionally enrolls them</p>
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

          {/* Account fields */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Account</p>
            <input
              type="text"
              placeholder="Display name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
            <div>
              <input
                type="password"
                placeholder="Temporary password (8+ characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
              <p className="text-xs text-slate-400 mt-1.5">
                They can reset this after logging in.
              </p>
            </div>
          </div>

          {/* Challenge assignment */}
          <div className="space-y-3 pt-1 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Enroll in Challenge <span className="normal-case font-normal text-slate-400">(optional)</span>
            </p>
            <select
              value={challengeId}
              onChange={(e) => { setChallengeId(e.target.value); setTeamId(""); }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              <option value="">No challenge</option>
              {challenges.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            {challengeId && selectedChallenge?.has_teams && availableTeams.length > 0 && (
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="">No team assignment</option>
                {availableTeams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-4 rounded-xl font-extrabold text-sm text-white disabled:opacity-50"
            style={{ background: "linear-gradient(90deg,#ff6b9d,#ff9f43,#ffdd59,#48cfad,#667eea)" }}
          >
            {submitting ? "Creating…" : "Create Member"}
          </button>

        </div>
      </div>
    </div>
  );
}