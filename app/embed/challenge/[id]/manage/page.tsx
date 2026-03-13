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
  auto_assign_teams: boolean;
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

// ─── Constants ────────────────────────────────────────────────────────────────

const SCORING_OPTIONS = [
  { value: "average_points", label: "Average Points", desc: "Fair for mixed team sizes" },
  { value: "total_points", label: "Total Points", desc: "Sum of all member points" },
  { value: "streak_based", label: "Streak-Based", desc: "Rewards daily consistency" },
  { value: "tiered_completion", label: "Tiered Completion", desc: "Points for partial + full completion" },
  { value: "progressive_exercise", label: "Progressive Exercise", desc: "Difficulty ramps weekly" },
  { value: "reps", label: "Reps", desc: "Count repetitions" },
  { value: "time", label: "Time", desc: "Track duration" },
  { value: "distance", label: "Distance", desc: "Track distance covered" },
  { value: "weight", label: "Weight", desc: "Track weight lifted" },
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
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const [pendingAssignments, setPendingAssignments] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // IMPROVED: Show members NOT on this team (includes unassigned AND members from other teams)
  const availableMembers = allMembers.filter(m => m.team_id !== team.id);
  const membersFromOtherTeams = availableMembers.filter(m => m.team_id != null);
  const unassignedMembers = availableMembers.filter(m => !m.team_id);

  const stripColor = team.color || PRIDE_GRADIENTS[0].gradient;

  const toggleMemberSelection = (memberId: string) => {
    setPendingAssignments(prev => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  };

  const handleBulkAssign = async () => {
    if (pendingAssignments.size === 0) return;
    
    setSaving(true);
    for (const userId of Array.from(pendingAssignments)) {
      await onAddMember(team.id, userId);
    }
    setSaving(false);
    setPendingAssignments(new Set());
    setShowAddDropdown(false);
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
      <div className="h-1" style={{ background: stripColor }} />
      
      {/* Header */}
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50 transition"
      >
        <div className="w-8 h-8 rounded-full flex-shrink-0" style={{ background: stripColor }} />
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
            members.map(m => (
              <div key={m.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-slate-50">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                  style={{ background: "linear-gradient(135deg,#ff6b9d,#667eea)" }}
                >
                  {m.name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{m.name}</p>
                  <p className="text-xs text-slate-400">{m.total_points} pts · {m.streak}🔥</p>
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

          {/* IMPROVED: Add member section */}
          <div className="pt-1">
            {showAddDropdown ? (
              <div className="space-y-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Assign to {team.name}
                  </p>
                  <span className="text-xs font-bold text-slate-500">
                    {pendingAssignments.size} selected
                  </span>
                </div>

                {availableMembers.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-2">
                    ✓ All members are on {team.name}
                  </p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {/* Show unassigned members first */}
                    {unassignedMembers.length > 0 && (
                      <>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide sticky top-0 bg-slate-50 py-1">
                          Unassigned
                        </p>
                        {unassignedMembers.map(m => (
                          <button
                            key={m.id}
                            onClick={() => toggleMemberSelection(m.id)}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm font-semibold transition"
                            style={{
                              background: pendingAssignments.has(m.id)
                                ? "linear-gradient(135deg,rgba(255,107,157,0.15),rgba(102,126,234,0.15))"
                                : "#fff",
                              border: pendingAssignments.has(m.id)
                                ? "1.5px solid rgba(102,126,234,0.4)"
                                : "1.5px solid #e5e7eb",
                            }}
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div
                                className="w-6 h-6 rounded-full flex items-center justify-center text-xs text-white font-bold flex-shrink-0"
                                style={{ background: "linear-gradient(135deg,#ff6b9d,#667eea)" }}
                              >
                                {m.name?.charAt(0)?.toUpperCase()}
                              </div>
                              <span className="truncate text-slate-800">{m.name}</span>
                            </div>
                            {pendingAssignments.has(m.id) && (
                              <span className="text-violet-600 font-bold text-sm">✓</span>
                            )}
                          </button>
                        ))}
                      </>
                    )}

                    {/* Show members from other teams */}
                    {membersFromOtherTeams.length > 0 && (
                      <>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide sticky top-0 bg-slate-50 py-1 mt-2">
                          Move from Other Teams
                        </p>
                        {membersFromOtherTeams.map(m => (
                          <button
                            key={m.id}
                            onClick={() => toggleMemberSelection(m.id)}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm font-semibold transition"
                            style={{
                              background: pendingAssignments.has(m.id)
                                ? "linear-gradient(135deg,rgba(255,107,157,0.15),rgba(102,126,234,0.15))"
                                : "#fff",
                              border: pendingAssignments.has(m.id)
                                ? "1.5px solid rgba(102,126,234,0.4)"
                                : "1.5px solid #e5e7eb",
                            }}
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div
                                className="w-6 h-6 rounded-full flex items-center justify-center text-xs text-white font-bold flex-shrink-0"
                                style={{ background: "linear-gradient(135deg,#ff6b9d,#667eea)" }}
                              >
                                {m.name?.charAt(0)?.toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="truncate text-slate-800">{m.name}</p>
                                <p className="text-xs text-slate-400 truncate">from {m.team_name}</p>
                              </div>
                            </div>
                            {pendingAssignments.has(m.id) && (
                              <span className="text-violet-600 font-bold text-sm">✓</span>
                            )}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => {
                      setShowAddDropdown(false);
                      setPendingAssignments(new Set());
                    }}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-white transition"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={pendingAssignments.size === 0 || saving}
                    onClick={handleBulkAssign}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition disabled:opacity-40"
                    style={{ background: "linear-gradient(90deg,#ff6b9d,#667eea)" }}
                  >
                    {saving ? "Saving..." : `Assign ${pendingAssignments.size > 0 ? `(${pendingAssignments.size})` : ""}`}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddDropdown(true)}
                className="w-full py-2.5 rounded-xl border border-dashed border-slate-300 text-xs font-bold text-slate-500 hover:bg-slate-50 hover:border-slate-400 transition"
              >
                + Add / Move Members
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({
  value,
  onChange,
  disabled,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!value)}
      className={`w-11 h-6 rounded-full transition-all relative flex-shrink-0 ${
        value ? "bg-violet-500" : "bg-slate-300"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
          value ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

// ─── UnassignedRow ────────────────────────────────────────────────────────────

function UnassignedRow({
  member,
  teams,
  onAssign,
  onEdit,
}: {
  member: Member;
  teams: Team[];
  onAssign: (teamId: string, userId: string) => Promise<void>;
  onEdit: (m: Member) => void;
}) {
  const [pendingTeamId, setPendingTeamId] = useState("");
  const [saving, setSaving] = useState(false);

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
        style={{ background: "linear-gradient(135deg,#ff6b9d,#667eea)" }}
      >
        {member.name?.charAt(0)?.toUpperCase() || "?"}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 truncate">{member.name}</p>
        <p className="text-xs text-slate-400">
          {member.total_points ?? 0} pts · {member.streak ?? 0}🔥
        </p>
      </div>

      {teams.length > 0 ? (
        <div className="flex items-center gap-2 flex-shrink-0">
          <select
            value={pendingTeamId}
            onChange={e => setPendingTeamId(e.target.value)}
            className="text-xs rounded-lg border border-slate-200 px-2 py-1.5 bg-white font-semibold text-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-300"
          >
            <option value="">Assign →</option>
            {teams.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <button
            disabled={!pendingTeamId || saving}
            onClick={async () => {
              if (!pendingTeamId) return;
              setSaving(true);
              await onAssign(pendingTeamId, member.id);
              setSaving(false);
              setPendingTeamId("");
            }}
            className="text-xs font-bold px-3 py-1.5 rounded-full text-white disabled:opacity-40 transition"
            style={{
              background: pendingTeamId ? "linear-gradient(90deg,#ff6b9d,#667eea)" : undefined,
              backgroundColor: !pendingTeamId ? "#e2e8f0" : undefined
            }}
          >
            {saving ? "..." : "Save"}
          </button>
        </div>
      ) : (
        <button
          onClick={() => onEdit(member)}
          className="text-xs font-bold px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:bg-white transition"
        >
          Edit
        </button>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ManageChallengePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const challengeId = typeof params?.id === "string" ? params.id : "";

  // ── State
  const [loading, setLoading] = useState(true);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  // ── Challenge details
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rules, setRules] = useState("");
  const [saving, setSaving] = useState(false);

  // ── Dates
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [savingDates, setSavingDates] = useState(false);

  // ── Scoring
  const [scoringType, setScoringType] = useState("reps");
  const [savingScoring, setSavingScoring] = useState(false);

  // ── Mode
  const [hasTeams, setHasTeams] = useState(false);
  const [autoAssign, setAutoAssign] = useState(false);
  const [savingMode, setSavingMode] = useState(false);
  const [savingAutoAssign, setSavingAutoAssign] = useState(false);

  // ── Team creation
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamColor, setNewTeamColor] = useState(PRIDE_GRADIENTS[0].gradient);
  const [creatingTeam, setCreatingTeam] = useState(false);

  // ── Computed
  const unassignedMembers = members.filter(m => !m.team_id);
  const sortedMembers = [...members].sort((a, b) => (b.total_points ?? 0) - (a.total_points ?? 0));

  function getTeamMembers(teamId: string): Member[] {
    return members.filter(m => m.team_id === teamId);
  }

  // ── Load data
  useEffect(() => {
    if (!challengeId) return;
    (async () => {
      setLoading(true);

      const { data: ch } = await supabase
        .from("challenges")
        .select("*")
        .eq("id", challengeId)
        .single();

      if (!ch) {
        router.push("/embed/dashboard");
        return;
      }

      setChallenge(ch);
      setName(ch.name || "");
      setDescription(ch.description || "");
      setRules(ch.rules || "");
      setStartDate(ch.start_date || "");
      setEndDate(ch.end_date || "");
      setScoringType(ch.scoring_type || "reps");
      setHasTeams(ch.has_teams ?? false);
      setAutoAssign(ch.auto_assign_teams ?? false);

      // Load members
      const { data: mData } = await supabase
        .from("challenge_members")
        .select(`
          user_id,
          team_id,
          total_points,
          streak,
          users!inner(id, name, email)
        `)
        .eq("challenge_id", challengeId);

      if (mData) {
        console.log("Raw member data:", mData);
        const mapped: Member[] = mData.map((row: any) => ({
          id: row.users.id,
          name: row.users.name,
          email: row.users.email,
          total_points: row.total_points ?? 0,
          streak: row.streak ?? 0,
          team_id: row.team_id,
        }));
        console.log("Mapped members:", mapped);
        setMembers(mapped);
      }

      // Load teams if enabled
      if (ch.has_teams) {
        const { data: tData } = await supabase
          .from("teams")
          .select("*")
          .eq("challenge_id", challengeId);
        if (tData) {
          console.log("Loaded teams:", tData);
          setTeams(tData);
          // Attach team names to members
          setMembers(prev => {
            const updated = prev.map(m => {
              const team = tData.find(t => t.id === m.team_id);
              return { ...m, team_name: team?.name };
            });
            console.log("Members with team names:", updated);
            return updated;
          });
        }
      }

      setLoading(false);
    })();
  }, [challengeId, router]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleSaveDetails() {
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from("challenges")
      .update({ name: name.trim(), description, rules })
      .eq("id", challengeId);
    if (!error) {
      setChallenge(p => p ? { ...p, name: name.trim() } : p);
    } else {
      alert("Error: " + error.message);
    }
    setSaving(false);
  }

  async function handleSaveDates() {
    setSavingDates(true);
    const { error } = await supabase
      .from("challenges")
      .update({ start_date: startDate || null, end_date: endDate || null })
      .eq("id", challengeId);
    if (!error) {
      setChallenge(p => p ? { ...p, start_date: startDate, end_date: endDate } : p);
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

  async function handleToggleAutoAssign(value: boolean) {
    setSavingAutoAssign(true);
    const { error } = await supabase
      .from("challenges").update({ auto_assign_teams: value }).eq("id", challengeId);
    if (!error) setAutoAssign(value);
    else alert("Error: " + error.message);
    setSavingAutoAssign(false);
  }

  async function handleCreateTeam() {
    if (!newTeamName.trim()) return;
    setCreatingTeam(true);
    const { data, error } = await supabase
      .from("teams")
      .insert({ name: newTeamName.trim(), color: newTeamColor, challenge_id: challengeId })
      .select().single();

    if (!error && data) {
      setTeams(p => [...p, data]);
      setNewTeamName("");
      setNewTeamColor(PRIDE_GRADIENTS[0].gradient);
      setShowTeamForm(false);
    } else if (error) {
      alert("Error creating team: " + error.message);
    }
    setCreatingTeam(false);
  }

  async function handleAddMemberToTeam(teamId: string, userId: string) {
    const { data: updateData, error } = await supabase
      .from("challenge_members")
      .update({ team_id: teamId })
      .eq("challenge_id", challengeId)
      .eq("user_id", userId)
      .select();

    console.log("Team assignment update:", { teamId, userId, updateData, error });

    if (error) {
      alert("Error assigning member: " + error.message);
      return;
    }

    if (!updateData || updateData.length === 0) {
      alert("No member record found to update. Member may not be in this challenge.");
      return;
    }

    // Reload members to ensure data is fresh
    const { data: mData } = await supabase
      .from("challenge_members")
      .select(`
        user_id,
        team_id,
        total_points,
        streak,
        users!inner(id, name, email)
      `)
      .eq("challenge_id", challengeId);

    if (mData) {
      const mapped: Member[] = mData.map((row: any) => ({
        id: row.users.id,
        name: row.users.name,
        email: row.users.email,
        total_points: row.total_points ?? 0,
        streak: row.streak ?? 0,
        team_id: row.team_id,
        team_name: teams.find(t => t.id === row.team_id)?.name,
      }));
      console.log("Reloaded members after assignment:", mapped);
      setMembers(mapped);
    }
  }

  async function handleSaveMember(data: {
    memberId: string;
    points: number;
    streak: number;
    teamId: string | null;
  }) {
    await supabase
      .from("challenge_members")
      .update({ total_points: data.points, streak: data.streak, team_id: data.teamId ?? null })
      .eq("challenge_id", challengeId)
      .eq("user_id", data.memberId);

    const team = teams.find(t => t.id === data.teamId);
    setMembers(p =>
      p.map(m => m.id === data.memberId
        ? { ...m, total_points: data.points, streak: data.streak, team_id: data.teamId ?? undefined, team_name: team?.name }
        : m
      )
    );
    setEditingMember(null);
  }

  async function handleRemoveMember(memberId: string) {
    if (!confirm("Remove this member from the challenge?")) return;
    const { error } = await supabase
      .from("challenge_members")
      .delete()
      .eq("challenge_id", challengeId)
      .eq("user_id", memberId);
    if (!error) {
      setMembers(p => p.filter(m => m.id !== memberId));
      setEditingMember(null);
    }
  }

  async function handleDeleteChallenge() {
    if (!confirm("Delete this challenge? This cannot be undone.")) return;
    const { error } = await supabase.from("challenges").delete().eq("id", challengeId);
    if (!error) router.push("/embed/dashboard");
    else alert("Error: " + error.message);
  }

  if (loading) return <LoadingScreen />;
  if (!challenge) return null;

  return (
    <>
      <div className="min-h-screen bg-slate-50 pb-20">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(`/embed/challenge/${challengeId}`)}
              className="text-sm font-bold text-slate-600 hover:text-slate-900 transition"
            >
              ← Back
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="font-extrabold text-slate-900 text-lg truncate">Manage Challenge</h1>
              <p className="text-xs text-slate-400 truncate">{challenge.name}</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="text-xs font-bold px-3 py-2 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
              title="Refresh data"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-5 py-6 space-y-5">
          {/* DEBUG INFO - Remove this later */}
          <div className="neon-card rounded-2xl overflow-hidden border-2 border-blue-200">
            <div className="h-1 w-full bg-blue-500" />
            <div className="p-4 space-y-2">
              <p className="text-xs font-bold text-blue-900 uppercase">Debug Info (Open browser console for details)</p>
              <div className="text-xs text-slate-600 space-y-1">
                <p>Total members loaded: <strong>{members.length}</strong></p>
                <p>Members with teams: <strong>{members.filter(m => m.team_id).length}</strong></p>
                <p>Unassigned members: <strong>{unassignedMembers.length}</strong></p>
                <details className="text-xs">
                  <summary className="cursor-pointer font-semibold text-blue-700">View all members</summary>
                  <pre className="mt-2 p-2 bg-slate-50 rounded overflow-auto text-xs">
                    {JSON.stringify(members.map(m => ({ 
                      name: m.name, 
                      team_id: m.team_id, 
                      team_name: m.team_name 
                    })), null, 2)}
                  </pre>
                </details>
              </div>
            </div>
          </div>

          {/* Direct member add */}
          <DirectAddMember 
            challengeId={challengeId} 
            onMemberAdded={() => window.location.reload()} 
            existingMemberIds={new Set(members.map(m => m.id))}
            teams={teams}
            hasTeams={hasTeams}
          />

          {/* ── Details ── */}
          <div className="neon-card rounded-2xl overflow-hidden">
            <div className="h-1 w-full rainbow-cta" />
            <div className="p-5 space-y-4">
              <p className="font-extrabold text-slate-900">Challenge Details</p>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Name</label>
                <input
                  type="text" value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Description</label>
                <textarea
                  value={description} onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Rules</label>
                <textarea
                  value={rules} onChange={(e) => setRules(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
                />
              </div>
              <button onClick={handleSaveDetails} disabled={saving || !name.trim()}
                className="rainbow-cta w-full rounded-xl py-3 font-bold text-sm disabled:opacity-50">
                {saving ? "Saving..." : "Save Details"}
              </button>
            </div>
          </div>

          {/* ── Dates ── */}
          <div className="neon-card rounded-2xl overflow-hidden">
            <div className="h-1 w-full rainbow-cta" />
            <div className="p-5 space-y-4">
              <p className="font-extrabold text-slate-900">Challenge Duration</p>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Start Date</label>
                <input
                  type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">End Date (optional)</label>
                <input
                  type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
                <p className="text-xs text-slate-400 mt-1.5">Leave blank for ongoing challenges</p>
              </div>
              <button onClick={handleSaveDates} disabled={savingDates}
                className="rainbow-cta w-full rounded-xl py-3 font-bold text-sm disabled:opacity-50">
                {savingDates ? "Saving..." : "Save Dates"}
              </button>
            </div>
          </div>

          {/* ── Scoring Type ── */}
          <div className="neon-card rounded-2xl overflow-hidden">
            <div className="h-1 w-full rainbow-cta" />
            <div className="p-5 space-y-4">
              <p className="font-extrabold text-slate-900">Scoring Type</p>
              <div>
                <select value={scoringType} onChange={(e) => setScoringType(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300">
                  {SCORING_OPTIONS.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-2">
                  {SCORING_OPTIONS.find(s => s.value === scoringType)?.desc}
                </p>
              </div>
              <button onClick={handleSaveScoring} disabled={savingScoring}
                className="rainbow-cta w-full rounded-xl py-3 font-bold text-sm disabled:opacity-50">
                {savingScoring ? "Saving..." : "Save Scoring Type"}
              </button>
            </div>
          </div>

          {/* ── Mode ── */}
          <div className="neon-card rounded-2xl overflow-hidden">
            <div className="h-1 w-full rainbow-cta" />
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-extrabold text-slate-900">Mode</p>
                {members.length > 0 && (
                  <span className="text-xs text-slate-400 font-semibold">
                    {members.length} member{members.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <div className="flex gap-2 p-1 rounded-2xl bg-slate-100">
                <button
                  onClick={() => !savingMode && handleToggleTeams(false)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    !hasTeams ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  👤 Individual
                </button>
                <button
                  onClick={() => !savingMode && handleToggleTeams(true)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    hasTeams ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  👥 Teams
                </button>
              </div>
              {savingMode && <p className="text-xs text-slate-400 text-center">Saving...</p>}

              {hasTeams && (
                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50">
                  <div className="pr-4">
                    <p className="text-sm font-bold text-slate-800">Auto-assign members</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      New members are placed into the smallest team automatically
                    </p>
                  </div>
                  <Toggle value={autoAssign} onChange={handleToggleAutoAssign} disabled={savingAutoAssign} />
                </div>
              )}
            </div>
          </div>

          {/* ── Teams Section ── */}
          {hasTeams && (
            <div className="neon-card rounded-2xl overflow-hidden">
              <div className="h-1 w-full rainbow-cta" />
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-extrabold text-slate-900">Teams ({teams.length})</p>
                  {unassignedMembers.length > 0 && (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                      {unassignedMembers.length} unassigned
                    </span>
                  )}
                </div>

                {teams.length === 0 && !showTeamForm && (
                  <p className="text-sm text-slate-400 text-center py-4">No teams yet. Create one below.</p>
                )}

                <div className="space-y-3">
                  {teams.map(team => (
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

                {showTeamForm ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">
                    <p className="text-sm font-bold text-slate-700">New Team</p>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Team Name</label>
                      <input
                        type="text" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)}
                        placeholder="e.g. Team Aria"
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                      />
                    </div>
                    <TeamColorSelector value={newTeamColor} onChange={setNewTeamColor} />
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => setShowTeamForm(false)}
                        className="flex-1 py-3 rounded-xl border border-slate-200 font-bold text-sm text-slate-600 hover:bg-white transition">
                        Cancel
                      </button>
                      <button onClick={handleCreateTeam} disabled={creatingTeam || !newTeamName.trim()}
                        className="flex-1 rainbow-cta py-3 rounded-xl font-bold text-sm disabled:opacity-50">
                        {creatingTeam ? "Creating..." : "Create Team"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowTeamForm(true)}
                    className="w-full py-3.5 rounded-2xl border-2 border-dashed border-slate-300 text-sm font-bold text-slate-500 hover:border-slate-400 hover:bg-slate-50 transition">
                    + Create New Team
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Unassigned Members ── */}
          {hasTeams && unassignedMembers.length > 0 && (
            <div className="neon-card rounded-2xl overflow-hidden">
              <div className="h-1 w-full" style={{ background: "linear-gradient(90deg,#fbbf24,#f59e0b)" }} />
              <div className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <p className="font-extrabold text-slate-900">Unassigned Members</p>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                    {unassignedMembers.length}
                  </span>
                </div>
                <p className="text-xs text-slate-400">These members haven&apos;t been placed on a team yet.</p>
                <div className="space-y-2">
                  {unassignedMembers.map(member => (
                    <UnassignedRow
                      key={member.id}
                      member={member}
                      teams={teams}
                      onAssign={handleAddMemberToTeam}
                      onEdit={setEditingMember}
                    />
                  ))}
                </div>
                {teams.length === 0 && (
                  <p className="text-xs text-slate-400 text-center pt-1">Create teams above to assign members.</p>
                )}
              </div>
            </div>
          )}

          {/* ── Members List (Individual mode) ── */}
          {!hasTeams && members.length > 0 && (
            <div className="neon-card rounded-2xl overflow-hidden">
              <div className="h-1 w-full rainbow-cta" />
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-extrabold text-slate-900">Members ({members.length})</p>
                </div>
                <div className="space-y-2">
                  {sortedMembers.map((member, i) => (
                    <div key={member.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50">
                      <span className="text-sm font-black w-5 text-center text-slate-400 flex-shrink-0">
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                      </span>
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                        style={{ background: "linear-gradient(135deg,#ff6b9d,#667eea)" }}
                      >
                        {member.name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{member.name}</p>
                        <p className="text-xs text-slate-400">{member.total_points ?? 0} pts · {member.streak ?? 0}🔥</p>
                      </div>
                      <button onClick={() => setEditingMember(member)}
                        className="text-xs font-bold px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:bg-white transition">
                        Edit
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Danger Zone ── */}
          <div className="neon-card rounded-2xl overflow-hidden border border-red-100">
            <div className="h-1 w-full" style={{ background: "linear-gradient(90deg,#ff3c5f,#ef4444)" }} />
            <div className="p-5">
              <p className="font-extrabold text-slate-900 mb-1">Danger Zone</p>
              <p className="text-xs text-slate-400 mb-4">This action is permanent and cannot be undone.</p>
              <button onClick={handleDeleteChallenge}
                className="w-full py-3 rounded-xl border border-red-200 text-sm font-bold text-red-500 hover:bg-red-50 transition">
                Delete Challenge
              </button>
            </div>
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