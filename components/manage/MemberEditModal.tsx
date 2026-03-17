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
  isAdmin?: boolean; // gates name/email editing + hard delete
  onClose: () => void;
  onSave: (data: {
    memberId: string;
    points: number;
    streak: number;
    teamId: string | null;
    name?: string;
    email?: string;
  }) => Promise<void>;
  onRemove: (memberId: string) => Promise<void>;
  onDelete?: (memberId: string) => Promise<void>; // hard delete from app
}

export default function MemberEditModal({
  member,
  teams,
  isAdmin = false,
  onClose,
  onSave,
  onRemove,
  onDelete,
}: Props) {
  const [name, setName]     = useState(member.name);
  const [email, setEmail]   = useState(member.email || "");
  const [points, setPoints] = useState(member.total_points);
  const [streak, setStreak] = useState(member.streak);
  const [teamId, setTeamId] = useState<string>(member.team_id || "");
  const [saving, setSaving]   = useState(false);
  const [removing, setRemoving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleSave() {
    setError("");
    setSaving(true);
    await onSave({
      memberId: member.id,
      points,
      streak,
      teamId: teamId || null,
      ...(isAdmin ? { name: name.trim(), email: email.trim() } : {}),
    });
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

  async function handleDelete() {
    if (!onDelete) return;
    setError("");
    setDeleting(true);
    try {
      await onDelete(member.id);
      onClose();
    } catch (e: any) {
      setError(e.message || "Failed to delete user.");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl">
        {/* Rainbow strip */}
        <div style={{ height: 4, background: "linear-gradient(90deg,#ff3c5f,#ff8c42,#ffd166,#06d6a0,#118ab2,#7b2d8b)" }} />

        <div className="p-6 space-y-5 max-h-[85dvh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-extrabold text-slate-900 text-lg leading-tight">{member.name}</p>
              {member.email && <p className="text-xs text-slate-400 mt-0.5">{member.email}</p>}
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition text-lg"
            >
              ×
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-sm text-red-600 font-semibold">{error}</p>
            </div>
          )}

          {/* ── Admin-only: Name + Email ── */}
          {isAdmin && (
            <div className="space-y-3 pb-1">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Profile</p>
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Display Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Changing email updates their login immediately — no confirmation email sent.
                </p>
              </div>
            </div>
          )}

          {/* Points */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Points</label>
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
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Streak (days)</label>
            <input
              type="number"
              min={0}
              value={streak}
              onChange={(e) => setStreak(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>

          {/* Team Assignment */}
          {teams.length > 0 && (
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Team Assignment</label>
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-slate-300 appearance-none"
              >
                <option value="">No team</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3.5 rounded-2xl text-sm font-bold text-white disabled:opacity-60"
            style={{ background: "linear-gradient(90deg,#ff3c5f,#ff8c42,#ffd166,#06d6a0,#118ab2,#7b2d8b)" }}
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>

          {/* Remove from challenge */}
          <button
            onClick={handleRemove}
            disabled={removing}
            className="w-full py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-500 hover:bg-slate-50 transition disabled:opacity-50"
          >
            {removing ? "Removing…" : "Remove from Challenge"}
          </button>

          {/* ── Admin-only: Hard delete ── */}
          {isAdmin && onDelete && (
            <div className="pt-1 border-t border-slate-100">
              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="w-full py-2.5 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 transition border border-transparent hover:border-red-100"
                >
                  Delete Account Permanently
                </button>
              ) : (
                <div className="space-y-2 bg-red-50 border border-red-200 rounded-2xl p-4">
                  <p className="text-sm font-bold text-red-700 text-center">
                    ⚠️ This permanently deletes {member.name}&apos;s account, all their data, and removes them from every challenge. This cannot be undone.
                  </p>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-white transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition disabled:opacity-50"
                    >
                      {deleting ? "Deleting…" : "Yes, Delete"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}