"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function ManageChallengePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const challengeId = typeof params?.id === "string" ? params.id : "";

  const [challenge, setChallenge]   = useState<any>(null);
  const [members, setMembers]       = useState<any[]>([]);
  const [teams, setTeams]           = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [isCreator, setIsCreator]   = useState(false);
  const [description, setDescription] = useState("");
  const [rules, setRules]           = useState("");

  useEffect(() => {
    async function loadData() {
      if (!challengeId) return;

      // Use Supabase auth directly — no Wix
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth"); return; }

      const { data: challengeData } = await supabase
        .from("challenges").select("*").eq("id", challengeId).single();

      if (!challengeData) { setLoading(false); return; }

      setChallenge(challengeData);
      setDescription(challengeData.description || "");
      setRules(challengeData.rules || "");
      setIsCreator(challengeData.creator_id === user.id);

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
          team_id: m.team_members?.[0]?.team_id,
          team_name: m.team_members?.[0]?.teams?.name,
        })));
      }

      const { data: teamsData } = await supabase
        .from("teams").select("id, name")
        .in("name", ["Team Hayden", "Team Aria", "Team Tiffany"]);
      if (teamsData) setTeams(teamsData);

      setLoading(false);
    }
    loadData();
  }, [challengeId]);

  const handleSaveDetails = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("challenges")
      .update({ description, rules })
      .eq("id", challengeId);
    if (!error) alert("Challenge details updated!");
    else alert("Error saving: " + error.message);
    setSaving(false);
  };

  const handleUpdateMemberPoints = async (memberId: string, newPoints: number) => {
    const { error } = await supabase.from("users").update({ total_points: newPoints }).eq("id", memberId);
    if (!error) setMembers(prev => prev.map(m => m.id === memberId ? { ...m, total_points: newPoints } : m));
  };

  const handleUpdateMemberStreak = async (memberId: string, newStreak: number) => {
    const { error } = await supabase.from("users").update({ streak: newStreak }).eq("id", memberId);
    if (!error) setMembers(prev => prev.map(m => m.id === memberId ? { ...m, streak: newStreak } : m));
  };

  const handleMoveTeam = async (memberId: string, newTeamId: string) => {
    await supabase.from("team_members").delete().eq("user_id", memberId);
    const { error } = await supabase.from("team_members").insert({ team_id: newTeamId, user_id: memberId });
    if (!error) {
      const newTeam = teams.find(t => t.id === newTeamId);
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, team_id: newTeamId, team_name: newTeam?.name } : m));
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Remove this member?")) return;
    await supabase.from("challenge_members").delete().eq("challenge_id", challengeId).eq("user_id", memberId);
    await supabase.from("team_members").delete().eq("user_id", memberId);
    setMembers(prev => prev.filter(m => m.id !== memberId));
  };

  const handleDeleteChallenge = async () => {
    if (!confirm("Permanently delete this challenge? This cannot be undone.")) return;
    await supabase.from("challenge_members").delete().eq("challenge_id", challengeId);
    await supabase.from("challenges").delete().eq("id", challengeId);
    router.push("/embed/challenges");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-400 font-semibold">Loading...</p></div>;

  if (!isCreator) return (
    <div className="min-h-screen flex items-center justify-center px-5">
      <div className="neon-card rounded-2xl p-12 text-center max-w-sm w-full">
        <p className="text-2xl mb-3">🔒</p>
        <p className="font-bold text-slate-800 text-lg mb-2">Creator Only</p>
        <p className="text-sm text-slate-500 mb-5">Only the challenge creator can manage this challenge.</p>
        <button onClick={() => router.push(`/embed/challenge/${challengeId}`)} className="rainbow-cta px-6 py-3 rounded-xl font-bold text-sm w-full">
          Back to Challenge
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen px-5 pt-6 pb-28 space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push(`/embed/challenge/${challengeId}`)}
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

      {/* Challenge Details */}
      <div className="neon-card rounded-2xl overflow-hidden">
        <div className="h-1 w-full rainbow-cta" />
        <div className="p-5 space-y-4">
          <p className="font-extrabold text-slate-900">Challenge Details</p>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description for your challenge"
              className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
              rows={3}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1.5">Rules / Notes</label>
            <textarea
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              placeholder="Add rules, notes, or instructions for members"
              className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
              rows={4}
            />
          </div>
          <button onClick={handleSaveDetails} disabled={saving}
            className="rainbow-cta w-full rounded-xl py-3 font-bold text-sm disabled:opacity-50">
            {saving ? "Saving..." : "Save Details"}
          </button>
        </div>
      </div>

      {/* Members */}
      <div className="neon-card rounded-2xl overflow-hidden">
        <div className="h-1 w-full rainbow-cta" />
        <div className="p-5">
          <p className="font-extrabold text-slate-900 mb-4">Members ({members.length})</p>
          <div className="space-y-3">
            {members.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No members yet</p>
            ) : members.map((member) => (
              <div key={member.id} className="rounded-xl border border-slate-100 bg-white p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-bold text-sm text-slate-900">{member.name}</p>
                    <p className="text-xs text-slate-400">{member.email}</p>
                    {member.team_name && (
                      <span className="text-xs font-semibold text-slate-500">{member.team_name}</span>
                    )}
                  </div>
                  <button onClick={() => handleRemoveMember(member.id)}
                    className="px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition">
                    Remove
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs text-slate-400 font-semibold block mb-1">Points</label>
                    <input type="number" value={member.total_points || 0}
                      onChange={(e) => handleUpdateMemberPoints(member.id, Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-semibold block mb-1">Streak</label>
                    <input type="number" value={member.streak || 0}
                      onChange={(e) => handleUpdateMemberStreak(member.id, Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-semibold block mb-1">Team</label>
                    <select value={member.team_id || ""}
                      onChange={(e) => handleMoveTeam(member.id, e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:outline-none">
                      {teams.map(team => (
                        <option key={team.id} value={team.id}>{team.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="neon-card rounded-2xl p-5 border border-red-100">
        <p className="font-extrabold text-slate-900 mb-1">Danger Zone</p>
        <p className="text-xs text-slate-500 mb-4">This will permanently delete the challenge and remove all members.</p>
        <button onClick={handleDeleteChallenge}
          className="w-full rounded-xl py-3 font-bold text-sm border-2 border-red-200 text-red-600 hover:bg-red-50 transition-colors">
          Delete Challenge
        </button>
      </div>

    </div>
  );
}