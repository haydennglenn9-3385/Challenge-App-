"use client";
// app/embed/teams/page.tsx — My Teams
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

interface TeamMember {
  id: string;
  name: string;
  streak: number;
  total_points: number;
  avatar_emoji?: string;
}

interface Team {
  id: string;
  name: string;
  color?: string;
  members: TeamMember[];
  rank?: number;
  avg_points?: number;
}

export default function TeamsPage() {
  const router = useRouter();
  const [teams, setTeams]             = useState<Team[]>([]);
  const [loading, setLoading]         = useState(true);
  const [userId, setUserId]           = useState<string | null>(null);
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [messageModal, setMessageModal] = useState<{ type: "member" | "team"; name: string; id: string; teamId?: string } | null>(null);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending]         = useState(false);
  const [sentMsg, setSentMsg]         = useState("");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth"); return; }
      setUserId(user.id);

      // Get all teams the user belongs to
      const { data: teamRows } = await supabase
        .from("team_members")
        .select("team_id, teams(id, name, color)")
        .eq("user_id", user.id);

      if (!teamRows || teamRows.length === 0) { setLoading(false); return; }

      // For each team, get all members + their stats
      const teamsWithMembers: Team[] = await Promise.all(
        teamRows.map(async (row: any) => {
          const team = row.teams;
          const { data: memberRows } = await supabase
            .from("team_members")
            .select("user_id, users(id, name, streak, total_points, avatar_emoji)")
            .eq("team_id", team.id);

          const members: TeamMember[] = (memberRows || [])
            .map((m: any) => m.users)
            .filter(Boolean)
            .sort((a: TeamMember, b: TeamMember) => (b.total_points || 0) - (a.total_points || 0));

          const totalPts = members.reduce((s, m) => s + (m.total_points || 0), 0);
          const avgPts   = members.length > 0 ? Math.ceil(totalPts / members.length) : 0;

          return { id: team.id, name: team.name, color: team.color, members, avg_points: avgPts };
        })
      );

      // Fetch all teams to determine rank
      const { data: allTeams } = await supabase
        .from("teams")
        .select(`id, team_members(user_id, users(total_points))`);

      if (allTeams) {
        const ranked = allTeams
          .map((t: any) => {
            const mems = t.team_members || [];
            const total = mems.reduce((s: number, m: any) => s + (m.users?.total_points || 0), 0);
            const avg = mems.length > 0 ? Math.ceil(total / mems.length) : 0;
            return { id: t.id, avg };
          })
          .sort((a: any, b: any) => b.avg - a.avg);

        teamsWithMembers.forEach((team) => {
          const rankIdx = ranked.findIndex((r: any) => r.id === team.id);
          team.rank = rankIdx >= 0 ? rankIdx + 1 : undefined;
        });
      }

      setTeams(teamsWithMembers);
      setLoading(false);
    }
    load();
  }, []);

  async function handleSendMessage() {
    if (!messageText.trim() || !userId || !messageModal) return;
    setSending(true);

    if (messageModal.type === "team") {
      await supabase.from("messages").insert({
        user_id: userId,
        team_id: messageModal.id,
        text: messageText.trim(),
      });
    } else {
      // Individual — DM via messages with both user IDs noted
      await supabase.from("messages").insert({
        user_id: userId,
        team_id: messageModal.teamId || null,
        text: `@${messageModal.name}: ${messageText.trim()}`,
      });
    }

    setSentMsg("Message sent! 🎉");
    setMessageText("");
    setSending(false);
    setTimeout(() => { setSentMsg(""); setMessageModal(null); }, 2000);
  }

  const getMedal = (rank?: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return null;
  };

  if (loading) return (
    <div style={{
      minHeight: "100dvh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 12,
      background: "linear-gradient(135deg, #d4f5e2 0%, #fde0ef 30%, #fdf6d3 60%, #d4eaf7 100%)",
    }}>
      <div style={{ fontSize: 52 }}>🏳️‍🌈</div>
      <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 18, color: "#7b2d8b", letterSpacing: 2 }}>
        LOADING...
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        .msg-sheet { position: fixed; inset: 0; z-index: 100; display: flex; flex-direction: column; justify-content: flex-end; }
        .msg-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(4px); }
        .msg-panel { position: relative; z-index: 1; background: #fff; border-radius: 24px 24px 0 0; padding: 24px 20px 40px; }
        .msg-input {
          width: 100%; padding: 13px 16px; border-radius: 14px;
          border: 1.5px solid rgba(0,0,0,0.1); background: #f8f9fa;
          font-size: 14px; outline: none; font-family: 'DM Sans', sans-serif;
          resize: none;
        }
        .msg-input:focus { border-color: #7b2d8b; }
        .send-btn {
          width: 100%; padding: 14px; border-radius: 14px; border: none;
          background: linear-gradient(135deg, #7b2d8b, #ff3c5f);
          color: #fff; font-size: 15px; font-weight: 700; cursor: pointer;
          font-family: 'DM Sans', sans-serif; margin-top: 10px;
        }
        .send-btn:disabled { opacity: 0.5; cursor: default; }
      `}</style>

      <div className="min-h-screen px-5 pt-6 pb-28 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold tracking-[0.2em] uppercase mb-1" style={{
              background: "linear-gradient(90deg,#ff6b9d,#ff9f43,#ffdd59,#48cfad,#4fc3f7,#667eea)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              Queers & Allies Fitness
            </p>
            <h1 className="text-3xl font-display font-extrabold text-slate-900 tracking-tight">My Teams</h1>
          </div>
          <button
            onClick={() => router.push("/embed/leaderboard")}
            className="text-xs font-bold px-3 py-2 rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
          >
            🏆 Ranks
          </button>
        </div>

        {teams.length === 0 ? (
          <div className="neon-card rounded-2xl p-10 text-center space-y-3">
            <p className="text-3xl">🏳️‍🌈</p>
            <p className="font-bold text-slate-800">You're not on any teams yet</p>
            <p className="text-sm text-slate-500">Join a challenge to get placed on a team.</p>
            <button onClick={() => router.push("/embed/challenges")} className="rainbow-cta rounded-xl px-6 py-3 font-bold text-sm">
              Browse Challenges
            </button>
          </div>
        ) : (
          teams.map((team) => (
            <div key={team.id} className="neon-card rounded-2xl overflow-hidden">
              <div className="h-1.5 w-full rainbow-cta" />

              {/* Team header */}
              <div className="px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-extrabold text-slate-900">{team.name}</h2>
                      {getMedal(team.rank) && <span className="text-lg">{getMedal(team.rank)}</span>}
                      {team.rank && !getMedal(team.rank) && (
                        <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                          #{team.rank}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {team.members.length} members · {team.avg_points} avg pts
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Message whole team */}
                    <button
                      onClick={() => { setMessageModal({ type: "team", name: team.name, id: team.id }); setMessageText(""); setSentMsg(""); }}
                      className="text-xs font-bold px-3 py-1.5 rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      💬 Team
                    </button>
                    {/* Expand/collapse */}
                    <button
                      onClick={() => setExpandedTeam(expandedTeam === team.id ? null : team.id)}
                      className="w-8 h-8 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors text-sm"
                    >
                      {expandedTeam === team.id ? "▲" : "▼"}
                    </button>
                  </div>
                </div>

                {/* Member list — expanded */}
                {expandedTeam === team.id && (
                  <div className="mt-4 space-y-2">
                    {team.members.map((member, i) => (
                      <div key={member.id}
                        className="flex items-center gap-3 py-2.5 px-3 rounded-xl border border-slate-100 bg-white/80">
                        {/* Rank within team */}
                        <span className="text-xs font-bold text-slate-400 w-4 text-center flex-shrink-0">
                          {i + 1}
                        </span>
                        {/* Avatar */}
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-base flex-shrink-0">
                          {member.avatar_emoji || "😊"}
                        </div>
                        {/* Name + streak */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">
                            {member.name}
                            {member.id === userId && <span className="ml-1 text-xs font-normal text-slate-400">(You)</span>}
                          </p>
                          <p className="text-xs text-slate-500">🔥 {member.streak || 0}-day streak</p>
                        </div>
                        {/* Points */}
                        <p className="text-sm font-extrabold text-slate-900 flex-shrink-0">{member.total_points || 0} pts</p>
                        {/* Message individual (not yourself) */}
                        {member.id !== userId && (
                          <button
                            onClick={() => { setMessageModal({ type: "member", name: member.name, id: member.id, teamId: team.id }); setMessageText(""); setSentMsg(""); }}
                            className="w-8 h-8 rounded-full border border-slate-200 bg-white flex items-center justify-center text-sm hover:bg-slate-50 transition-colors flex-shrink-0"
                          >
                            💬
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Message bottom sheet */}
      {messageModal && (
        <div className="msg-sheet">
          <div className="msg-backdrop" onClick={() => setMessageModal(null)} />
          <div className="msg-panel">
            <div style={{ width: 40, height: 4, borderRadius: 99, background: "#e5e7eb", margin: "0 auto 20px" }} />
            <p style={{ fontSize: 13, color: "#888", marginBottom: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
              {messageModal.type === "team" ? "Message Team" : "Message Member"}
            </p>
            <p style={{ fontSize: 18, fontWeight: 800, color: "#0e0e0e", marginBottom: 16 }}>
              {messageModal.name}
            </p>

            {sentMsg ? (
              <div style={{ background: "#f0fff8", border: "1px solid #b7f5d8", color: "#1b7a4e", borderRadius: 14, padding: "14px", textAlign: "center", fontSize: 15, fontWeight: 700 }}>
                {sentMsg}
              </div>
            ) : (
              <>
                <textarea
                  className="msg-input"
                  rows={3}
                  placeholder={messageModal.type === "team" ? `Send a message to ${messageModal.name}…` : `Send a message to ${messageModal.name}…`}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                />
                <button className="send-btn" onClick={handleSendMessage} disabled={sending || !messageText.trim()}>
                  {sending ? "Sending…" : "Send Message"}
                </button>
                <button
                  onClick={() => setMessageModal(null)}
                  style={{ width: "100%", padding: "12px", borderRadius: 14, border: "none", background: "transparent", color: "#999", fontSize: 14, fontWeight: 700, cursor: "pointer", marginTop: 6 }}
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}