// app/embed/challenge/[id]/manage/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function ManageChallengePage() {
  const params      = useParams<{ id: string }>();
  const router      = useRouter();
  const challengeId = typeof params?.id === "string" ? params.id : "";

  const [challenge,    setChallenge]    = useState<any>(null);
  const [members,      setMembers]      = useState<any[]>([]);
  const [teams,        setTeams]        = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [hasAccess,    setHasAccess]    = useState(false);

  // Challenge detail fields
  const [description,  setDescription]  = useState("");
  const [rules,        setRules]        = useState("");

  // Date fields
  const [startDate,    setStartDate]    = useState("");
  const [endDate,      setEndDate]      = useState("");
  const [savingDates,  setSavingDates]  = useState(false);

  // Add member
  const [memberQuery,       setMemberQuery]       = useState("");
  const [memberResults,     setMemberResults]     = useState<any[]>([]);
  const [searchingMembers,  setSearchingMembers]  = useState(false);
  const [addingMember,      setAddingMember]      = useState<string | null>(null);

  // Create team
  const [newTeamName,   setNewTeamName]   = useState("");
  const [creatingTeam,  setCreatingTeam]  = useState(false);

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function loadData() {
      if (!challengeId) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth"); return; }

      // Fetch user role for admin bypass
      const { data: profile } = await supabase
        .from("users").select("role").eq("id", user.id).single();

      const { data: challengeData } = await supabase
        .from("challenges").select("*").eq("id", challengeId).single();
      if (!challengeData) { setLoading(false); return; }

      const isCreator = challengeData.creator_id === user.id;
      const isAdmin   = profile?.role === "admin";
      const access    = isCreator || isAdmin;

      setChallenge(challengeData);
      setHasAccess(access);
      setDescription(challengeData.description || "");
      setRules(challengeData.rules || "");
      setStartDate(challengeData.start_date || "");
      setEndDate(challengeData.end_date || "");

      if (access) {
        const { data: membersData } = await supabase
          .from("challenge_members")
          .select(`
            user_id,
            users ( id, name, email, streak, total_points ),
            team_members ( team_id, teams ( id, name ) )
          `)
          .eq("challenge_id", challengeId);

        if (membersData) {
          setMembers(membersData.map((m: any) => ({
            ...m.users,
            team_id:   m.team_members?.[0]?.team_id,
            team_name: m.team_members?.[0]?.teams?.name,
          })));
        }

        // Load ALL teams from DB
        const { data: teamsData } = await supabase
          .from("teams").select("id, name, color").order("name");
        if (teamsData) setTeams(teamsData);
      }

      setLoading(false);
    }
    loadData();
  }, [challengeId]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSaveDetails = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("challenges").update({ description, rules }).eq("id", challengeId);
    if (!error) alert("Details updated!");
    else alert("Error: " + error.message);
    setSaving(false);
  };

  const handleSaveDates = async () => {
    setSavingDates(true);
    const { error } = await supabase
      .from("challenges")
      .update({ start_date: startDate || null, end_date: endDate || null })
      .eq("id", challengeId);
    if (!error) {
      setChallenge((prev: any) => ({ ...prev, start_date: startDate, end_date: endDate }));
      alert("Dates updated!");
    } else {
      alert("Error: " + error.message);
    }
    setSavingDates(false);
  };

  const handleSearchMembers = async () => {
    if (!memberQuery.trim()) return;
    setSearchingMembers(true);
    const currentIds = new Set(members.map((m) => m.id));
    const { data } = await supabase
      .from("users")
      .select("id, name, email")
      .or(`name.ilike.%${memberQuery.trim()}%,email.ilike.%${memberQuery.trim()}%`)
      .limit(8);
    setMemberResults((data || []).filter((u: any) => !currentIds.has(u.id)));
    setSearchingMembers(false);
  };

  const handleAddMember = async (userId: string) => {
    setAddingMember(userId);
    const { error } = await supabase
      .from("challenge_members")
      .insert({ challenge_id: challengeId, user_id: userId });
    if (!error) {
      const added = memberResults.find((u) => u.id === userId);
      if (added) {
        setMembers((prev) => [
          ...prev,
          { id: userId, name: added.name, email: added.email, total_points: 0, streak: 0 },
        ]);
      }
      setMemberResults((prev) => prev.filter((u) => u.id !== userId));
    } else {
      alert("Error adding member: " + error.message);
    }
    setAddingMember(null);
  };

  const handleUpdateMemberPoints = async (memberId: string, newPoints: number) => {
    const { error } = await supabase
      .from("users").update({ total_points: newPoints }).eq("id", memberId);
    if (!error) setMembers((prev) =>
      prev.map((m) => m.id === memberId ? { ...m, total_points: newPoints } : m)
    );
  };

  const handleUpdateMemberStreak = async (memberId: string, newStreak: number) => {
    const { error } = await supabase
      .from("users").update({ streak: newStreak }).eq("id", memberId);
    if (!error) setMembers((prev) =>
      prev.map((m) => m.id === memberId ? { ...m, streak: newStreak } : m)
    );
  };

  const handleMoveTeam = async (memberId: string, newTeamId: string) => {
    await supabase.from("team_members").delete().eq("user_id", memberId);
    const { error } = await supabase
      .from("team_members").insert({ team_id: newTeamId, user_id: memberId });
    if (!error) {
      const newTeam = teams.find((t) => t.id === newTeamId);
      setMembers((prev) =>
        prev.map((m) =>
          m.id === memberId ? { ...m, team_id: newTeamId, team_name: newTeam?.name } : m
        )
      );
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Remove this member?")) return;
    await supabase
      .from("challenge_members")
      .delete().eq("challenge_id", challengeId).eq("user_id", memberId);
    await supabase.from("team_members").delete().eq("user_id", memberId);
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    setCreatingTeam(true);
    const { data, error } = await supabase
      .from("teams").insert({ name: newTeamName.trim() }).select().single();
    if (!error && data) {
      setTeams((prev) => [...prev, data]);
      setNewTeamName("");
    } else if (error) {
      alert("Error creating team: " + error.message);
    }
    setCreatingTeam(false);
  };

  const handleDeleteChallenge = async () => {
    if (!confirm("Permanently delete this challenge? This cannot be undone.")) return;
    await supabase.from("challenge_members").delete().eq("challenge_id", challengeId);
    await supabase.from("challenges").delete().eq("id", challengeId);
    router.push("/embed/challenges");
  };

  // ── Guards ────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-slate-400 font-semibold">Loading...</p>
    </div>
  );

  if (!hasAccess) return (
    <div className="min-h-screen flex items-center justify-center px-5">
      <div className="neon-card rounded-2xl p-12 text-center max-w-sm w-full">
        <p className="text-2xl mb-3">🔒</p>
        <p className="font-bold text-slate-800 text-lg mb-2">Creator Only</p>
        <p className="text-sm text-slate-500 mb-5">
          Only the challenge creator or an admin can manage this challenge.
        </p>
        <button
          onClick={() => router.push(`/embed/challenge/${challengeId}`)}
          className="rainbow-cta px-6 py-3 rounded-xl font-bold text-sm w-full">
          Back to Challenge
        </button>
      </div>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen px-5 pt-6 pb-28 space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push(`/embed/challenge/${challengeId}`)}
          className="w-9 h-9 rounded-full neon-card flex items-center justify-center text-slate-600 hover:bg-white transition flex-shrink-0">
          ←
        </button>
        <div>
          <p className="text-xs font-bold tracking-[0.2em] uppercase" style={{
            background: "linear-gradient(90deg,#ff6b9d,#ff9f43,#ffdd59,#48cfad,#667eea)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>Manage</p>
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
              placeholder="Add rules, notes, or instructions for members"
              className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
              rows={4}
            />
          </div>
          <button
            onClick={handleSaveDetails}
            disabled={saving}
            className="rainbow-cta w-full rounded-xl py-3 font-bold text-sm disabled:opacity-50">
            {saving ? "Saving..." : "Save Details"}
          </button>
        </div>
      </div>

      {/* ── Dates ── */}
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
                className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
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
                className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
          </div>
          <button
            onClick={handleSaveDates}
            disabled={savingDates}
            className="rainbow-cta w-full rounded-xl py-3 font-bold text-sm disabled:opacity-50">
            {savingDates ? "Saving..." : "Save Dates"}
          </button>
        </div>
      </div>

      {/* ── Add Member ── */}
      <div className="neon-card rounded-2xl overflow-hidden">
        <div className="h-1 w-full rainbow-cta" />
        <div className="p-5 space-y-4">
          <p className="font-extrabold text-slate-900">Add Member</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={memberQuery}
              onChange={(e) => setMemberQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearchMembers()}
              placeholder="Search by name or email..."
              className="flex-1 rounded-xl border border-slate-200 bg-white/80 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
            <button
              onClick={handleSearchMembers}
              disabled={searchingMembers}
              className="rainbow-cta px-4 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50 whitespace-nowrap">
              {searchingMembers ? "..." : "Search"}
            </button>
          </div>

          {memberResults.length > 0 && (
            <div className="space-y-2">
              {memberResults.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between px-4 py-3 rounded-xl border border-slate-200 bg-white/80">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                  <button
                    onClick={() => handleAddMember(user.id)}
                    disabled={addingMember === user.id}
                    className="rainbow-cta px-4 py-1.5 rounded-lg font-bold text-xs disabled:opacity-50">
                    {addingMember === user.id ? "Adding..." : "Add"}
                  </button>
                </div>
              ))}
            </div>
          )}

          {memberResults.length === 0 && memberQuery && !searchingMembers && (
            <p className="text-sm text-slate-400 text-center py-2">No users found</p>
          )}
        </div>
      </div>

      {/* ── Teams ── */}
      <div className="neon-card rounded-2xl overflow-hidden">
        <div className="h-1 w-full rainbow-cta" />
        <div className="p-5 space-y-4">
          <p className="font-extrabold text-slate-900">Teams ({teams.length})</p>

          {teams.length > 0 ? (
            <div className="space-y-2">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-white/80">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ background: team.color || "#6366f1" }}
                  />
                  <p className="text-sm font-semibold text-slate-900">{team.name}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-2">No teams yet</p>
          )}

          {/* Create new team */}
          <div className="pt-2 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Create New Team</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateTeam()}
                placeholder="Team name..."
                className="flex-1 rounded-xl border border-slate-200 bg-white/80 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
              <button
                onClick={handleCreateTeam}
                disabled={creatingTeam || !newTeamName.trim()}
                className="rainbow-cta px-4 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50 whitespace-nowrap">
                {creatingTeam ? "..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Members ── */}
      <div className="neon-card rounded-2xl overflow-hidden">
        <div className="h-1 w-full rainbow-cta" />
        <div className="p-5">
          <p className="font-extrabold text-slate-900 mb-4">Members ({members.length})</p>
          <div className="space-y-3">
            {members.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No members yet</p>
            ) : (
              members.map((member) => (
                <div
                  key={member.id}
                  className="rounded-xl border border-slate-200 bg-white/80 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{member.name}</p>
                      <p className="text-xs text-slate-500">{member.email}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="text-xs text-red-500 font-semibold hover:text-red-700 transition-colors px-2 py-1 rounded-lg hover:bg-red-50">
                      Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">
                        Points
                      </label>
                      <input
                        type="number"
                        defaultValue={member.total_points}
                        onBlur={(e) => handleUpdateMemberPoints(member.id, Number(e.target.value))}
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">
                        Streak
                      </label>
                      <input
                        type="number"
                        defaultValue={member.streak}
                        onBlur={(e) => handleUpdateMemberStreak(member.id, Number(e.target.value))}
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                      />
                    </div>
                  </div>

                  {teams.length > 0 && (
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">
                        Team
                      </label>
                      <select
                        value={member.team_id || ""}
                        onChange={(e) => handleMoveTeam(member.id, e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:outline-none">
                        <option value="">No team</option>
                        {teams.map((team) => (
                          <option key={team.id} value={team.id}>{team.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Danger Zone ── */}
      <div className="neon-card rounded-2xl p-5 border border-red-100">
        <p className="font-extrabold text-slate-900 mb-1">Danger Zone</p>
        <p className="text-xs text-slate-500 mb-4">
          This will permanently delete the challenge and remove all members.
        </p>
        <button
          onClick={handleDeleteChallenge}
          className="w-full rounded-xl py-3 font-bold text-sm border-2 border-red-200 text-red-600 hover:bg-red-50 transition-colors">
          Delete Challenge
        </button>
      </div>

    </div>
  );
}