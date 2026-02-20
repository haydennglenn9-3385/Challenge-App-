"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@/lib/UserContext";
import { supabase } from "@/lib/supabase";

export default function ManageChallengePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const challengeId = typeof params?.id === "string" ? params.id : "";
  const { user: wixUser, getUserParams } = useUser();

  const [challenge, setChallenge] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState("");
  const [isCreator, setIsCreator] = useState(false);

  // Editable fields
  const [description, setDescription] = useState("");
  const [rules, setRules] = useState("");

  const navigate = (path: string) => router.push(path + getUserParams());

  useEffect(() => {
    async function loadData() {
      if (!challengeId || !wixUser) return;

      // Get user ID
      const userResponse = await fetch(`/api/user/get?wixId=${wixUser.userId}`);
      const userData = await userResponse.json();
      
      if (!userData?.id) {
        setLoading(false);
        return;
      }
      setUserId(userData.id);

      // Get challenge
      const { data: challengeData } = await supabase
        .from('challenges')
        .select('*')
        .eq('id', challengeId)
        .single();

      if (challengeData) {
        setChallenge(challengeData);
        setDescription(challengeData.description || '');
        setRules(challengeData.rules || '');
        setIsCreator(challengeData.creator_id === userData.id);

        // Get all members
        const { data: membersData } = await supabase
          .from('challenge_members')
          .select(`
            user_id,
            users (
              id,
              name,
              email,
              streak,
              total_points
            ),
            team_members!inner (
              team_id,
              teams (
                id,
                name
              )
            )
          `)
          .eq('challenge_id', challengeId);

        if (membersData) {
          setMembers(membersData.map((m: any) => ({
            ...m.users,
            team_id: m.team_members?.[0]?.team_id,
            team_name: m.team_members?.[0]?.teams?.name
          })));
        }

        // Get all teams for this challenge
        const { data: teamsData } = await supabase
          .from('teams')
          .select('id, name')
          .in('name', ['Team Hayden', 'Team Aria', 'Team Tiffany']);

        if (teamsData) setTeams(teamsData);
      }

      setLoading(false);
    }

    loadData();
  }, [challengeId, wixUser]);

  const handleSaveDetails = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('challenges')
      .update({
        description: description,
        rules: rules,
      })
      .eq('id', challengeId);

    if (!error) {
      alert('Challenge details updated!');
    } else {
      alert('Error saving: ' + error.message);
    }
    setSaving(false);
  };

  const handleUpdateMemberPoints = async (memberId: string, newPoints: number) => {
    const { error } = await supabase
      .from('users')
      .update({ total_points: newPoints })
      .eq('id', memberId);

    if (!error) {
      setMembers(prev => prev.map(m => m.id === memberId ? {...m, total_points: newPoints} : m));
    }
  };

  const handleUpdateMemberStreak = async (memberId: string, newStreak: number) => {
    const { error } = await supabase
      .from('users')
      .update({ streak: newStreak })
      .eq('id', memberId);

    if (!error) {
      setMembers(prev => prev.map(m => m.id === memberId ? {...m, streak: newStreak} : m));
    }
  };

  const handleMoveTeam = async (memberId: string, newTeamId: string) => {
    // Remove from old team
    await supabase
      .from('team_members')
      .delete()
      .eq('user_id', memberId);

    // Add to new team
    const { error } = await supabase
      .from('team_members')
      .insert({
        team_id: newTeamId,
        user_id: memberId
      });

    if (!error) {
      const newTeam = teams.find(t => t.id === newTeamId);
      setMembers(prev => prev.map(m => 
        m.id === memberId ? {...m, team_id: newTeamId, team_name: newTeam?.name} : m
      ));
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;

    // Remove from challenge_members
    await supabase
      .from('challenge_members')
      .delete()
      .eq('challenge_id', challengeId)
      .eq('user_id', memberId);

    // Remove from team_members
    await supabase
      .from('team_members')
      .delete()
      .eq('user_id', memberId);

    setMembers(prev => prev.filter(m => m.id !== memberId));
  };

  if (loading) {
    return <div className="p-10 text-center">Loading...</div>;
  }

  if (!isCreator) {
    return (
      <div className="space-y-6">
        <div className="neon-card rounded-3xl p-12 text-center">
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p className="text-slate-600 mb-6">Only the challenge creator can manage this challenge.</p>
          <button onClick={() => navigate(`/embed/challenge/${challengeId}`)}
            className="rainbow-cta px-6 py-3 rounded-full font-semibold">
            Back to Challenge
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Nav */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <button onClick={() => navigate(`/embed/challenge/${challengeId}`)}
          className="px-4 py-2 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition text-sm">
          ← Back to Challenge
        </button>
        <div className="flex gap-3">
          <button onClick={() => router.push("/")}
            className="px-4 py-2 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition text-sm">
            Home
          </button>
          <button onClick={() => navigate("/embed/dashboard")}
            className="rainbow-cta rounded-full px-5 py-2 font-semibold text-sm hover:shadow-xl transition-shadow">
            Dashboard
          </button>
        </div>
      </div>

      {/* Header */}
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500 mb-2">MANAGE</p>
        <h2 className="text-4xl font-display">{challenge?.name}</h2>
      </div>

      {/* Challenge Details */}
      <div className="neon-card rounded-3xl p-6">
        <h3 className="text-xl font-semibold mb-4">Challenge Details</h3>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description for your challenge"
              className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-2">Rules / Notes</label>
            <textarea
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              placeholder="Add any rules, notes, or instructions"
              className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 min-h-[150px] focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>

          <button
            onClick={handleSaveDetails}
            disabled={saving}
            className="rainbow-cta rounded-full px-6 py-3 font-semibold disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Details'}
          </button>
        </div>
      </div>
      
      {/* Team Members Management */}
      <div className="neon-card rounded-3xl p-6">
        <h3 className="text-xl font-semibold mb-4">Manage Members ({members.length})</h3>
        
        <div className="space-y-3">
          {members.map((member) => (
            <div key={member.id} className="p-4 rounded-2xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between mb-3">
                <div className="flex-1">
                  <p className="font-semibold">{member.name}</p>
                  <p className="text-xs text-slate-500">{member.email}</p>
                </div>
                <button
                  onClick={() => handleRemoveMember(member.id)}
                  className="px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100">
                  Remove
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-500">Points</label>
                  <input
                    type="number"
                    value={member.total_points || 0}
                    onChange={(e) => handleUpdateMemberPoints(member.id, Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Streak</label>
                  <input
                    type="number"
                    value={member.streak || 0}
                    onChange={(e) => handleUpdateMemberStreak(member.id, Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Team</label>
                  <select
                    value={member.team_id || ''}
                    onChange={(e) => handleMoveTeam(member.id, e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm">
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
  );
}