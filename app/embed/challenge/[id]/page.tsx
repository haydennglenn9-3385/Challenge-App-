"use client";

// app/embed/challenge/[id]/manage/page.tsx

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Team {
  id: string;
  name: string;
  color: string;
  challenge_id: string | null;
  members: TeamMember[];
}

interface TeamMember {
  user_id: string;
  name: string;
}

interface ChallengeUser {
  user_id: string;
  name: string;
}

// ─── Color options ────────────────────────────────────────────────────────────

const TEAM_COLORS = [
  { label: "Indigo",  value: "#6366f1" },
  { label: "Rose",    value: "#f43f5e" },
  { label: "Emerald", value: "#10b981" },
  { label: "Amber",   value: "#f59e0b" },
  { label: "Sky",     value: "#0ea5e9" },
  { label: "Violet",  value: "#8b5cf6" },
  { label: "Pink",    value: "#ec4899" },
  { label: "Teal",    value: "#14b8a6" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ManageTeamsPage() {
  const params      = useParams<{ id: string }>();
  const router      = useRouter();
  const challengeId = typeof params?.id === "string" ? params.id : "";

  const [challenge,       setChallenge]       = useState<any>(null);
  const [teams,           setTeams]           = useState<Team[]>([]);
  const [challengeUsers,  setChallengeUsers]  = useState<ChallengeUser[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [isCreator,       setIsCreator]       = useState(false);

  // ── Create team form ──
  const [newTeamName,  setNewTeamName]  = useState("");
  const [newTeamColor, setNewTeamColor] = useState("#6366f1");
  const [creating,     setCreating]     = useState(false);

  // ── Rename state ──
  const [renamingId,   setRenamingId]   = useState<string | null>(null);
  const [renameValue,  setRenameValue]  = useState("");
  const [renameColor,  setRenameColor]  = useState("#6366f1");
  const [saving,       setSaving]       = useState(false);

  // ── Add member modal ──
  const [addingToTeam, setAddingToTeam] = useState<string | null>(null);

  // ─── Load ──────────────────────────────────────────────────────────────────

  async function load() {
    setLoading(true);

    // Challenge
    const { data: ch } = await supabase
      .from("challenges").select("*").eq("id", challengeId).single();
    if (!ch) { setLoading(false); return; }
    setChallenge(ch);

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id !== ch.creator_id) {
      router.replace(`/embed/challenge/${challengeId}`);
      return;
    }
    setIsCreator(true);

    // Teams for this challenge
    const { data: teamsData } = await supabase
      .from("teams")
      .select("id, name, color, challenge_id")
      .eq("challenge_id", challengeId)
      .order("name");

    // Members for each team
    const teamList: Team[] = [];
    for (const t of teamsData || []) {
      const { data: membersData } = await supabase
        .from("team_members")
        .select("user_id, users(name)")
        .eq("team_id", t.id);

      teamList.push({
        ...t,
        members: (membersData || []).map((m: any) => ({
          user_id: m.user_id,
          name: m.users?.name || "Unknown",
        })),
      });
    }
    setTeams(teamList);

    // All challenge members (for adding to teams)
    const { data: mems } = await supabase
      .from("challenge_members")
      .select("user_id, users(name)")
      .eq("challenge_id", challengeId);
    setChallengeUsers(
      (mems || []).map((m: any) => ({ user_id: m.user_id, name: m.users?.name || "Unknown" }))
    );

    setLoading(false);
  }

  useEffect(() => {
    if (challengeId) load();
  }, [challengeId]);

  // ─── Create team ───────────────────────────────────────────────────────────

  async function handleCreateTeam() {
    if (!newTeamName.trim() || creating) return;
    setCreating(true);
    const { error } = await supabase.from("teams").insert({
      name:         newTeamName.trim(),
      color:        newTeamColor,
      challenge_id: challengeId,
    });
    if (!error) {
      setNewTeamName("");
      setNewTeamColor("#6366f1");
      await load();
    }
    setCreating(false);
  }

  // ─── Rename team ───────────────────────────────────────────────────────────

  function startRename(team: Team) {
    setRenamingId(team.id);
    setRenameValue(team.name);
    setRenameColor(team.color || "#6366f1");
  }

  async function handleSaveRename(teamId: string) {
    if (!renameValue.trim()) return;
    setSaving(true);
    await supabase.from("teams").update({
      name:  renameValue.trim(),
      color: renameColor,
    }).eq("id", teamId);
    setRenamingId(null);
    setSaving(false);
    await load();
  }

  // ─── Delete team ───────────────────────────────────────────────────────────

  async function handleDeleteTeam(teamId: string, teamName: string) {
    if (!confirm(`Delete "${teamName}"? All members will be removed from this team.`)) return;
    await supabase.from("team_members").delete().eq("team_id", teamId);
    await supabase.from("teams").delete().eq("id", teamId);
    await load();
  }

  // ─── Remove member ─────────────────────────────────────────────────────────

  async function handleRemoveMember(teamId: string, userId: string) {
    await supabase.from("team_members").delete()
      .eq("team_id", teamId).eq("user_id", userId);
    await load();
  }

  // ─── Add member ────────────────────────────────────────────────────────────

  async function handleAddMember(teamId: string, userId: string) {
    // Remove from any existing team in this challenge first
    const teamIds = teams.map(t => t.id);
    for (const tid of teamIds) {
      await supabase.from("team_members").delete()
        .eq("team_id", tid).eq("user_id", userId);
    }
    await supabase.from("team_members").insert({ team_id: teamId, user_id: userId });
    setAddingToTeam(null);
    await load();
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  // Users already on any team in this challenge
  const assignedUserIds = new Set(teams.flatMap(t => t.members.map(m => m.user_id)));
  const unassignedUsers = challengeUsers.filter(u => !assignedUserIds.has(u.user_id));

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f7]">
        <p className="text-slate-500 text-sm animate-pulse">Loading…</p>
      </div>
    );
  }

  if (!isCreator) return null;

  return (
    <div className="min-h-screen bg-[#f5f5f7] pb-20">

      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-100 px-5 py-4">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <button
            onClick={() => router.push(`/embed/challenge/${challengeId}`)}
            className="text-slate-400 hover:text-slate-700 transition text-xl leading-none"
          >
            ←
          </button>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Manage Teams
            </p>
            <h1 className="text-base font-bold text-slate-900 leading-tight">
              {challenge?.name}
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 pt-6 space-y-5">

        {/* ── Create new team ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 pt-5 pb-4">
            <h2 className="text-sm font-bold text-slate-900 mb-4">Create New Team</h2>
            <div className="space-y-3">
              <input
                type="text"
                value={newTeamName}
                onChange={e => setNewTeamName(e.target.value)}
                placeholder="Team name…"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 bg-slate-50"
                onKeyDown={e => { if (e.key === "Enter") handleCreateTeam(); }}
              />
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2">Team Color</p>
                <div className="flex gap-2 flex-wrap">
                  {TEAM_COLORS.map(c => (
                    <button
                      key={c.value}
                      onClick={() => setNewTeamColor(c.value)}
                      className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                      style={{
                        background: c.value,
                        outline: newTeamColor === c.value ? `3px solid ${c.value}` : "none",
                        outlineOffset: 2,
                      }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>
              <button
                onClick={handleCreateTeam}
                disabled={creating || !newTeamName.trim()}
                className="w-full rounded-xl py-2.5 text-sm font-semibold text-white transition disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #ff6b9d, #667eea, #06b6d4)" }}
              >
                {creating ? "Creating…" : "＋ Create Team"}
              </button>
            </div>
          </div>
        </div>

        {/* ── Teams list ── */}
        {teams.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-5 py-10 text-center">
            <p className="text-slate-400 text-sm">No teams yet. Create one above.</p>
          </div>
        ) : (
          teams.map(team => (
            <div key={team.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              {/* Team color bar */}
              <div className="h-1" style={{ background: team.color || "#6366f1" }} />

              <div className="px-5 py-4">

                {/* Team header */}
                {renamingId === team.id ? (
                  <div className="space-y-3 mb-4">
                    <input
                      type="text"
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-slate-300"
                      autoFocus
                    />
                    <div className="flex gap-2 flex-wrap">
                      {TEAM_COLORS.map(c => (
                        <button
                          key={c.value}
                          onClick={() => setRenameColor(c.value)}
                          className="w-6 h-6 rounded-full transition-transform hover:scale-110"
                          style={{
                            background: c.value,
                            outline: renameColor === c.value ? `3px solid ${c.value}` : "none",
                            outlineOffset: 2,
                          }}
                        />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveRename(team.id)}
                        disabled={saving}
                        className="flex-1 rounded-xl py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 transition"
                      >
                        {saving ? "Saving…" : "Save"}
                      </button>
                      <button
                        onClick={() => setRenamingId(null)}
                        className="flex-1 rounded-xl py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ background: team.color || "#6366f1" }}
                      />
                      <h3 className="font-bold text-slate-900 text-base">{team.name}</h3>
                      <span className="text-xs text-slate-400 font-medium">
                        {team.members.length} {team.members.length === 1 ? "member" : "members"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startRename(team)}
                        className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded-lg hover:bg-slate-100 transition"
                      >
                        Rename
                      </button>
                      <button
                        onClick={() => handleDeleteTeam(team.id, team.name)}
                        className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}

                {/* Members list */}
                <div className="space-y-2">
                  {team.members.length === 0 && (
                    <p className="text-xs text-slate-400 italic py-1">No members yet</p>
                  )}
                  {team.members.map(member => (
                    <div
                      key={member.user_id}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ background: team.color || "#6366f1" }}
                        >
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-slate-700">{member.name}</span>
                      </div>
                      <button
                        onClick={() => handleRemoveMember(team.id, member.user_id)}
                        className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add member */}
                {addingToTeam === team.id ? (
                  <div className="mt-3 space-y-2">
                    {challengeUsers.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No other members in this challenge</p>
                    ) : (
                      <>
                        <p className="text-xs font-semibold text-slate-500">
                          Move a member to this team:
                        </p>
                        {challengeUsers
                          .filter(u => !team.members.find(m => m.user_id === u.user_id))
                          .map(u => (
                            <button
                              key={u.user_id}
                              onClick={() => handleAddMember(team.id, u.user_id)}
                              className="w-full text-left rounded-xl border border-slate-100 bg-white hover:bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition"
                            >
                              {u.name}
                              {assignedUserIds.has(u.user_id) && (
                                <span className="ml-2 text-xs text-slate-400">(currently on another team)</span>
                              )}
                            </button>
                          ))}
                      </>
                    )}
                    <button
                      onClick={() => setAddingToTeam(null)}
                      className="text-xs text-slate-400 hover:text-slate-600 transition"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingToTeam(team.id)}
                    className="mt-3 w-full rounded-xl border border-dashed border-slate-200 py-2 text-xs font-semibold text-slate-400 hover:border-slate-400 hover:text-slate-600 transition"
                  >
                    + Add / Move Member
                  </button>
                )}

              </div>
            </div>
          ))
        )}

        {/* ── Unassigned members ── */}
        {unassignedUsers.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-amber-100 overflow-hidden">
            <div className="h-1 bg-amber-300" />
            <div className="px-5 py-4">
              <h3 className="text-sm font-bold text-slate-700 mb-3">
                ⚠️ Unassigned Members ({unassignedUsers.length})
              </h3>
              <p className="text-xs text-slate-500 mb-3">
                These challenge members aren&apos;t on any team yet.
              </p>
              <div className="space-y-2">
                {unassignedUsers.map(u => (
                  <div
                    key={u.user_id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                  >
                    <span className="text-sm font-medium text-slate-700">{u.name}</span>
                    <div className="flex gap-1">
                      {teams.map(t => (
                        <button
                          key={t.id}
                          onClick={() => handleAddMember(t.id, u.user_id)}
                          className="text-xs px-2 py-1 rounded-lg text-white font-semibold transition hover:opacity-80"
                          style={{ background: t.color || "#6366f1" }}
                        >
                          {t.name.replace("Team ", "")}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}