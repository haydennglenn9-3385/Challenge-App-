// components/manage/MemberEditModal.tsx
"use client";

import { useState } from "react";

interface Team {
  id: string;
  name: string;
  color?: string;
}

interface Member {
  id: string;
  name: string;
  email?: string;
  total_points: number;
  streak: number;
  team_id?: string;
  team_name?: string;
}

interface Props {
  member: Member;
  teams: Team[];
  onClose: () => void;
  onSave: (data: {
    memberId: string;
    points: number;
    streak: number;
    teamId: string | null;
  }) => Promise<void>;
  onRemove: (memberId: string) => Promise<void>;
}

export default function MemberEditModal({
  member,
  teams,
  onClose,
  onSave,
  onRemove,
}: Props) {
  const [points, setPoints] = useState(member.total_points);
  const [streak, setStreak] = useState(member.streak);
  const [teamId, setTeamId] = useState<string>(member.team_id || "");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave({ memberId: member.id, points, streak, teamId: teamId || null });
    setSaving(false);
    onClose();
  }

  async function handleRemove() {
    if (!confirm(`Remove ${member.name} from this challenge?`)) return;
    setRemoving(true);
    await onRemove(member.id);
    setRemoving(false);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl">
        {/* Rainbow strip */}
        <div
          style={{
            height: 4,
            background: "linear-gradient(90deg,#ff3c5f,#ff8c42,#ffd166,#06d6a0,#118ab2,#7b2d8b)",
          }}
        />

        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-extrabold text-slate-900 text-lg leading-tight">
                {member.name}
              </p>
              {member.email && (
                <p className="text-xs text-slate-400 mt-0.5">{member.email}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition text-lg"
            >
              ×
            </button>
          </div>

          {/* Points */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">
              Points
            </label>
            <input
              type="number"
              min={0}
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>

          {/* Streak */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">
              Streak (days)
            </label>
            <input
              type="number"
              min={0}
              value={streak}
              onChange={(e) => setStreak(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>

          {/* Team assignment */}
          {teams.length > 0 && (
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">
                Team Assignment
              </label>
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="">No team</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-3 rounded-xl font-bold text-sm text-white disabled:opacity-50"
              style={{
                background: "linear-gradient(90deg,#ff6b9d,#ff9f43,#ffdd59,#48cfad,#667eea)",
              }}
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>

          {/* Remove */}
          <button
            onClick={handleRemove}
            disabled={removing}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 transition border border-red-100 disabled:opacity-50"
          >
            {removing ? "Removing…" : "Remove from Challenge"}
          </button>
        </div>
      </div>
    </div>
  );
}