"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import LoadingScreen from "@/components/LoadingScreen";
import MemberEditModal from "@/components/manage/MemberEditModal";
import TeamColorSelector, { PRIDE_GRADIENTS } from "@/components/manage/TeamColorSelector";
import DirectAddMember from "@/components/manage/DirectAddMember";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Challenge {
  id: string;
  name: string;
  description: string | null;
  rules: string | null;
  start_date: string | null;
  end_date: string | null;
  scoring_type: string;
  has_teams: boolean;
  creator_id: string;
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

interface Team {
  id: string;
  name: string;
  color?: string;
  challenge_id?: string;
}

// ─── Scoring options ──────────────────────────────────────────────────────────

const SCORING_OPTIONS = [
  { value: "average_points",        label: "Average Points",         desc: "Fair for mixed team sizes" },
  { value: "total_points",          label: "Total Points",           desc: "Sum of all member points" },
  { value: "streak_based",          label: "Streak-Based",           desc: "Rewards daily consistency" },
  { value: "tiered_completion",     label: "Tiered Completion",      desc: "Points for partial + full completion" },
  { value: "progressive_exercise",  label: "Progressive Exercise",   desc: "Difficulty ramps weekly" },
  { value: "reps",                  label: "Reps",                   desc: "Count repetitions" },
  { value: "time",                  label: "Time",                   desc: "Track duration" },
  { value: "distance",              label: "Distance",               desc: "Track distance covered" },
  { value: "weight",                label: "Weight",                 desc: "Track weight lifted" },
];

// ─── TeamCard ─────────────────────────────────────────────────────────────────

function TeamCard({
  team,
  members,
  allMembers,
  onEditMember,
  onAddMember,
}: {
  team: Team;
  members: Member[];
  allMembers: Member[];
  onEditMember: (m: Member) => void;
  onAddMember: (teamId: string, userId: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [showAddDropdown, setShowAddDropdown] = useState(false);

  const unassigned = allMembers.filter((m) => !m.team_id || m.team_id !== team.id);

  const stripColor = team.color || PRIDE_GRADIENTS[0].gradient;

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
      {/* Color strip */}
      <div className="h-1" style={{ background: stripColor }} />

      {/* Team header */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50 transition"
      >
        <div
          className="w-8 h-8 rounded-full flex-shrink-0"
          style={{ background: stripColor }}
        />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 text-sm">{team.name}</p>
          <p className="text-xs text-slate-400">
            {members.length} member{members.length !== 1 ? "s" : ""}
          </p>
        </div>
        <span className="text-slate-400 text-sm">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-2 border-t border-slate-100 pt-3">
          {members.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-3">No members yet</p>
          ) : (
            members.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-slate-50"
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                  style={{ background: "linear-gradient(135deg,#ff6b9d,#667eea)" }}>
                  {m.name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{m.name}</p>
                  <p className="text-xs text-slate-400">
                    {m.total_points} pts · {m.streak}🔥
                  </p>
                </div>
                <button
                  onClick={() => onEditMember(m)}
                  className="text-xs font-bold px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:bg-white transition"
                >
                  Edit
                </button>
              </div>
            ))
          )}

          {/* Add Member */}
          <div className="pt-1">
            {showAddDropdown ? (
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                  Add to {team.name}
                </div>
                {unassigned.length === 0 ? (
                  <p className="text-xs text-slate-400">All members are assigned to teams.</p>
                ) : (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {unassigned.map((m) => (
                      <button
                        key={m.id}
                        disabled={addingId === m.id}
                        onClick={async () => {
                          setAddingId(m.id);
                          await onAddMember(team.id, m.id);
                          setAddingId(null);
                          setShowAddDropdown(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left hover:bg-slate-100 transition text-sm font-semibold text-slate-800 disabled:opacity-50"
                      >
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs text-white font-bold"
                          style={{ background: "linear-gradient(135deg,#ff6b9d,#667eea)" }}>
                          {m.name?.charAt(0)?.toUpperCase()}
                        </div>
                        {m.name}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => setShowAddDropdown(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 transition"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAddDropdown(true)}
                className="w-full py-2 rounded-xl border border-dashed border-slate-300 text-xs font-bold text-slate-500 hover:bg-slate-50 hover:border-slate-400 transition"
              >
                + Add Member
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ManageChallengePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const challengeId = typeof params?.id === "string" ? params.id : "";

  // Data
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  // Detail fields
  const [description, setDescription] = useState("");
  const [rules, setRules] = useState("");
  const [saving, setSaving] = useState(false);

  // Date fields
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [savingDates, setSavingDates] = useState(false);

  // Scoring
  const [scoringType, setScoringType] = useState("average_points");
  const [savingScoring, setSavingScoring] = useState(false);

  // Teams toggle
  const [hasTeams, setHasTeams] = useState(false);
  const [savingMode, setSavingMode] = useState(false);

  // New team form
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamColor, setNewTeamColor] = useState(PRIDE_GRADIENTS[0].gradient);
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [showTeamForm, setShowTeamForm] = useState(false);

  // Edit member modal
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  // ── Load ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function loadData() {
      if (!challengeId) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth"); return; }

      const { data: profile } = await supabase
        .from("users").select("role").eq("id", user.id).single();

      const { data: ch } = await supabase
        .from("challenges").select("*").eq("id", challengeId).single();

      if (!ch) { setLoading(false); return; }

      const isCreator = ch.creator_id === user.id;
      const isAdmin = profile?.role === "admin";
      const access = isCreator || isAdmin;

      setChallenge(ch);
      setHasAccess(access);
      setDescription(ch.description || "");
      setRules(ch.rules || "");
      setStartDate(ch.start_date || "");
      setEndDate(ch.end_date || "");
      setScoringType(ch.scoring_type || "average_points");
      setHasTeams(ch.has_teams ?? false);

      if (access) {
        // Load members
        const { data: membersData } = await supabase
          .from("challenge_members")
          .select(`
            user_id,
            users ( id, name, email, streak, total_points ),
            team_members ( team_id, teams ( id, name ) )
          `)
          .eq("challenge_id", challengeId);

        if (membersData) {
          setMembers(
            membersData.map((m: any) => ({
              ...m.users,
              team_id: m.team_members?.[0]?.team_id,
              team_name: m.team_members?.[0]?.teams?.name,
            }))
          );
        }

        // Load teams for this challenge
        const { data: teamsData } = await supabase
          .from("teams")
          .select("id, name, color, challenge_id")
          .eq("challenge_id", challengeId)
          .order("name");

        if (teamsData) setTeams(teamsData);
      }

      setLoading(false);
    }
    loadData();
  }, [challengeId]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  async function handleSaveDetails() {
    setSaving(true);
    const { error } = await supabase
      .from("challenges").update({ description, rules }).eq("id", challengeId);
    if (error) alert("Error: " + error.message);
    setSaving(false);
  }

  async function handleSaveDates() {
    setSavingDates(true);
    const { error } = await supabase
      .from("challenges")
      .update({ start_date: startDate || null, end_date: endDate || null })
      .eq("id", challengeId);
    if (!error) {
      setChallenge((p) => p ? { ...p, start_date: startDate, end_date: endDate } : p);
    } else {
      alert("Error: " + error.message);
    }
    setSavingDates(false);
  }

  async function handleSaveScoring() {
    setSavingScoring(true);
    const { error } = await supabase
      .from("challenges").update({ scoring_type: scoringType }).eq("id", challengeId);
    if (error) alert("Error: " + error.message);
    setSavingScoring(false);
  }

  async function handleToggleTeams(value: boolean) {
    setSavingMode(true);
    const { error } = await supabase
      .from("challenges").update({ has_teams: value }).eq("id", challengeId);
    if (!error) setHasTeams(value);
    else alert("Error: " + error.message);
    setSavingMode(false);
  }

  async function handleCreateTeam() {
    if (!newTeamName.trim()) return;
    setCreatingTeam(true);
    const { data, error } = await supabase
      .from("teams")
      .insert({ name: newTeamName.trim(), color: newTeamColor, challenge_id: challengeId })
      .select().single();
    if (!error && data) {
      setTeams((p) => [...p, data]);
      setNewTeamName("");
      setNewTeamColor(PRIDE_GRADIENTS[0].gradient);
      setShowTeamForm(false);
    } else if (error) {
      alert("Error creating team: " + error.message);
    }
    setCreatingTeam(false);
  }

  async function handleAddMemberToTeam(teamId: string, userId: string) {
    // Remove from any existing team first
    await supabase.from("team_members").delete().eq("user_id", userId);
    const { error } = await supabase
      .from("team_members").insert({ team_id: teamId, user_id: userId });
    if (!error) {
      const team = teams.find((t) => t.id === teamId);
      setMembers((p) =>
        p.map((m) =>
          m.id === userId ? { ...m, team_id: teamId, team_name: team?.name } : m
        )
      );
    }
  }

  async function handleSaveMember(data: {
    memberId: string;
    points: number;
    streak: number;
    teamId: string | null;
  }) {
    // Update points + streak
    await supabase
      .from("users")
      .update({ total_points: data.points, streak: data.streak })
      .eq("id", data.memberId);

    // Update team assignment
    await supabase.from("team_members").delete().eq("user_id", data.memberId);
    if (data.teamId) {
      await supabase.from("team_members").insert({
        team_id: data.teamId,
        user_id: data.memberId,
      });
    }

    const team = data.teamId ? teams.find((t) => t.id === data.teamId) : null;
    setMembers((p) =>
      p.map((m) =>
        m.id === data.memberId
          ? {
              ...m,
              total_points: data.points,
              streak: data.streak,
              team_id: data.teamId || undefined,
              team_name: team?.name,
            }
          : m
      )
    );
  }

  async function handleRemoveMember(memberId: string) {
    await supabase
      .from("challenge_members")
      .delete()
      .eq("challenge_id", challengeId)
      .eq("user_id", memberId);
    await supabase.from("team_members").delete().eq("user_id", memberId);
    setMembers((p) => p.filter((m) => m.id !== memberId));
  }

  async function handleDeleteChallenge() {
    if (!confirm("Permanently delete this challenge? This cannot be undone.")) return;
    await supabase.from("challenge_members").delete().eq("challenge_id", challengeId);
    await supabase.from("challenges").delete().eq("id", challengeId);
    router.push("/embed/challenges");
  }

  // ── Guards ─────────────────────────────────────────────────────────────────

  if (loading) return <LoadingScreen />;

  if (!hasAccess) return (
    <div className="min-h-screen flex items-center justify-center px-5">
      <div className="neon-card rounded-2xl p-12 text-center max-w-sm w-full">
        <p className="text-2xl mb-3">🔒</p>
        <p className="font-bold text-slate-800 text-lg mb-2">Creator Only</p>
        <p className="text-sm text-slate-500 mb-5">
          Only the challenge creator or an admin can manage this challenge.
        </p>
        <button
          onClick={() => router.back()}
          className="rainbow-cta px-6 py-3 rounded-xl font-bold text-sm w-full"
        >
          Go Back
        </button>
      </div>
    </div>
  );

  // Derive team member lists
  const getTeamMembers = (teamId: string) => members.filter((m) => m.team_id === teamId);

  const scoringLabel = SCORING_OPTIONS.find((s) => s.value === scoringType)?.label ?? scoringType;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="min-h-screen px-5 pt-6 pb-28 space-y-5 max-w-2xl mx-auto">

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
              Manage
            </p>
            <h1 className="text-2xl font-display font-extrabold text-slate-900 tracking-tight leading-tight">
              {challenge?.name}
            </h1>
          </div>
        </div>

        {/* ── Challenge Details ── */}
        <div className="neon-card rounded-2xl overflow-hidden">
          <div className="h-1 w-full rainbow-cta" />
          <div className="p-5 space-y-4">
            <p className="font-extrabold text-slate-900">Challenge Details</p>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description for your challenge"
                className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
                rows={3}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">
                Rules / Notes
              </label>
              <textarea
                value={rules}
                onChange={(e) => setRules(e.target.value)}
                placeholder="Add rules, notes, or instructions"
                className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
                rows={4}
              />
            </div>
            <button
              onClick={handleSaveDetails}
              disabled={saving}
              className="rainbow-cta w-full rounded-xl py-3 font-bold text-sm disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Details"}
            </button>
          </div>
        </div>

        {/* ── Challenge Dates ── */}
        <div className="neon-card rounded-2xl overflow-hidden">
          <div className="h-1 w-full rainbow-cta" />
          <div className="p-5 space-y-4">
            <p className="font-extrabold text-slate-900">Challenge Dates</p>
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
            </div>
            <button
              onClick={handleSaveDates}
              disabled={savingDates}
              className="rainbow-cta w-full rounded-xl py-3 font-bold text-sm disabled:opacity-50"
            >
              {savingDates ? "Saving…" : "Save Dates"}
            </button>
          </div>
        </div>

        {/* ── Scoring Type ── */}
        <div className="neon-card rounded-2xl overflow-hidden">
          <div className="h-1 w-full rainbow-cta" />
          <div className="p-5 space-y-4">
            <p className="font-extrabold text-slate-900">Scoring Type</p>
            <div>
              <select
                value={scoringType}
                onChange={(e) => setScoringType(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                {SCORING_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-2">
                {SCORING_OPTIONS.find((s) => s.value === scoringType)?.desc}
              </p>
            </div>
            <button
              onClick={handleSaveScoring}
              disabled={savingScoring}
              className="rainbow-cta w-full rounded-xl py-3 font-bold text-sm disabled:opacity-50"
            >
              {savingScoring ? "Saving…" : "Save Scoring Type"}
            </button>
          </div>
        </div>

        {/* ── Teams / Individual Toggle ── */}
        <div className="neon-card rounded-2xl overflow-hidden">
          <div className="h-1 w-full rainbow-cta" />
          <div className="p-5 space-y-4">
            <p className="font-extrabold text-slate-900">Mode</p>

            <div className="flex gap-2 p-1 rounded-2xl bg-slate-100">
              <button
                onClick={() => !savingMode && handleToggleTeams(false)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  !hasTeams
                    ? "bg-white shadow text-slate-900"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                👤 Individual
              </button>
              <button
                onClick={() => !savingMode && handleToggleTeams(true)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  hasTeams
                    ? "bg-white shadow text-slate-900"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                👥 Teams
              </button>
            </div>

            {savingMode && (
              <p className="text-xs text-slate-400 text-center">Saving…</p>
            )}
          </div>
        </div>

        {/* ── Teams Section (if Teams mode) ── */}
        {hasTeams && (
          <div className="neon-card rounded-2xl overflow-hidden">
            <div className="h-1 w-full rainbow-cta" />
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-extrabold text-slate-9ƒ00">
                  Teams ({teams.length})
                </p>
              </div>

              {teams.length === 0 && !showTeamForm && (
                <p className="text-sm text-slate-400 text-center py-4">
                  No teams yet. Create one below.
                </p>
              )}

              {/* Team cards */}
              <div className="space-y-3">
                {teams.map((team) => (
                  <TeamCard
                    key={team.id}
                    team={team}
                    members={getTeamMembers(team.id)}
                    allMembers={members}
                    onEditMember={setEditingMember}
                    onAddMember={handleAddMemberToTeam}
                  />
                ))}
              </div>

              {/* Create team form */}
              {showTeamForm ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">
                  <p className="text-sm font-bold text-slate-700">New Team</p>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">
                      Team Name
                    </label>
                    <input
                      type="text"
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      placeholder="e.g. Team Aria"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                    />
                  </div>
                  <TeamColorSelector value={newTeamColor} onChange={setNewTeamColor} />
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => setShowTeamForm(false)}
                      className="flex-1 py-3 rounded-xl border border-slate-200 font-bold text-sm text-slate-600 hover:bg-white transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateTeam}
                      disabled={creatingTeam || !newTeamName.trim()}
                      className="flex-1 rainbow-cta py-3 rounded-xl font-bold text-sm disabled:opacity-50"
                    >
                      {creatingTeam ? "Creating…" : "Create Team"}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowTeamForm(true)}
                  className="w-full py-3.5 rounded-2xl border-2 border-dashed border-slate-300 text-sm font-bold text-slate-500 hover:border-slate-400 hover:bg-slate-50 transition"
                >
                  + Create New Team
                </button>
              )}
            </div>
          </div>
        )}

        

        {/* ── Danger Zone ── */}
        <div className="neon-card rounded-2xl overflow-hidden border border-red-100">
          <div className="h-1 w-full" style={{ background: "linear-gradient(90deg,#ff3c5f,#ef4444)" }} />
          <div className="p-5">
            <p className="font-extrabold text-slate-900 mb-1">Danger Zone</p>
            <p className="text-xs text-slate-400 mb-4">
              This action is permanent and cannot be undone.
            </p>
            <button
              onClick={handleDeleteChallenge}
              className="w-full py-3 rounded-xl border border-red-200 text-sm font-bold text-red-500 hover:bg-red-50 transition"
            >
              Delete Challenge
            </button>
          </div>
        </div>
      </div>

      {/* ── Edit Member Modal ── */}
      {editingMember && (
        <MemberEditModal
          member={editingMember}
          teams={teams}
          onClose={() => setEditingMember(null)}
          onSave={handleSaveMember}
          onRemove={handleRemoveMember}
        />
      )}
    </>
  );
}