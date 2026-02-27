// app/embed/admin/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import LoadingScreen from "@/components/LoadingScreen";
import MemberEditModal from "@/components/manage/MemberEditModal";
import AddMemberModal from "@/components/admin/AddMemberModal";
import AddTeamModal from "@/components/admin/AddTeamModal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChallengeRow {
  id: string;
  name: string;
  join_code: string;
  start_date: string | null;
  end_date: string | null;
  scoring_type: string;
  is_public: boolean;
  has_teams: boolean;
  creator_id: string;
  member_count: number;
}

interface MemberRow {
  id: string;
  name: string;
  email: string;
  total_points: number;
  streak: number;
  role: string;
  created_at: string;
}

interface TeamRow {
  id: string;
  name: string;
  color?: string;
  challenge_id?: string;
  challenges?: {
    id: string;
    name: string;
  }[] | null;
  team_members?: { user_id: string }[];
}

interface EditableMember {
  id: string;
  name: string;
  email?: string;
  total_points: number;
  streak: number;
  team_id?: string;
  team_name?: string;
}

type AdminTab = "challenges" | "members" | "teams";

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  emoji,
  label,
  value,
  gradient,
}: {
  emoji: string;
  label: string;
  value: number | string;
  gradient: string;
}) {
  return (
    <div className="rounded-2xl overflow-hidden bg-white border border-slate-100 shadow-sm">
      <div className="h-1" style={{ background: gradient }} />
      <div className="px-4 py-4">
        <p className="text-2xl mb-1">{emoji}</p>
        <p className="text-2xl font-extrabold text-slate-900 leading-none">{value}</p>
        <p className="text-xs font-semibold text-slate-400 mt-1">{label}</p>
      </div>
    </div>
  );
}

// ─── Challenge Row ────────────────────────────────────────────────────────────

function ChallengeCard({
  challenge,
  onManage,
  onOpen,
}: {
  challenge: ChallengeRow;
  onManage: () => void;
  onOpen: () => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const ended = challenge.end_date && challenge.end_date < today;
  const notStarted = challenge.start_date && challenge.start_date > today;
  const status = ended ? "ended" : notStarted ? "upcoming" : "active";

  const statusStyles: Record<string, string> = {
    active:   "bg-emerald-50 text-emerald-700 border-emerald-200",
    ended:    "bg-slate-100 text-slate-500 border-slate-200",
    upcoming: "bg-amber-50 text-amber-700 border-amber-200",
  };

  const statusLabels: Record<string, string> = {
    active: "Active", ended: "Ended", upcoming: "Upcoming",
  };

  return (
    <div className="flex items-center gap-3 py-3.5 px-4 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 transition">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-bold text-slate-900 truncate">{challenge.name}</p>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusStyles[status]}`}
          >
            {statusLabels[status]}
          </span>
          {challenge.has_teams && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-200">
              Teams
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-0.5">
          <span className="font-bold text-slate-500 font-mono">{challenge.join_code}</span>
          {" · "}
          {challenge.member_count} member{challenge.member_count !== 1 ? "s" : ""}
          {" · "}
          {challenge.scoring_type.replace(/_/g, " ")}
        </p>
      </div>
      <div className="flex gap-1.5 flex-shrink-0">
        <button
          onClick={onOpen}
          className="text-xs font-bold px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:bg-white transition"
        >
          Open
        </button>
        <button
          onClick={onManage}
          className="text-xs font-bold px-3 py-1.5 rounded-full text-white"
          style={{ background: "linear-gradient(90deg,#ff6b9d,#667eea)" }}
        >
          Manage
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter();

  const [loading, setLoading]     = useState(true);
  const [isAdmin, setIsAdmin]     = useState(false);
  const [tab, setTab]             = useState<AdminTab>("challenges");
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddTeam,   setShowAddTeam]   = useState(false);

  // Challenges
  const [challenges, setChallenges] = useState<ChallengeRow[]>([]);
  const [challengeSearch, setChallengeSearch] = useState("");

  // Members
  const [members, setMembers]     = useState<MemberRow[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [editingMember, setEditingMember] = useState<EditableMember | null>(null);

  // Stats
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalChallenges: 0,
    activeChallenges: 0,
    totalMembers: 0,
  });

  // Teams
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [teamSearch, setTeamSearch] = useState("");  

  // ── Load ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth"); return; }

      const { data: profile } = await supabase
        .from("users").select("role").eq("id", user.id).single();

      if (profile?.role !== "admin") {
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      setIsAdmin(true);

      // Load all challenges with member counts
      const { data: challengesRaw } = await supabase
        .from("challenges")
        .select("id, name, join_code, start_date, end_date, scoring_type, is_public, has_teams, creator_id")
        .order("created_at", { ascending: false });

      if (challengesRaw) {
        // Get member counts
        const withCounts = await Promise.all(
          challengesRaw.map(async (ch) => {
            const { count } = await supabase
              .from("challenge_members")
              .select("*", { count: "exact", head: true })
              .eq("challenge_id", ch.id);
            return { ...ch, member_count: count ?? 0 };
          })
        );
        setChallenges(withCounts);

        const today = new Date().toISOString().split("T")[0];
        const active = withCounts.filter(
          (c) => (!c.end_date || c.end_date >= today) && (!c.start_date || c.start_date <= today)
        ).length;
        const totalMems = withCounts.reduce((s, c) => s + c.member_count, 0);

        setStats((p) => ({
          ...p,
          totalChallenges: withCounts.length,
          activeChallenges: active,
          totalMembers: totalMems,
        }));
      }

      // Load all users
      const { data: usersRaw, count: userCount } = await supabase
        .from("users")
        .select("id, name, email, total_points, streak, role, created_at", { count: "exact" })
        .order("total_points", { ascending: false });

      if (usersRaw) {
        setMembers(usersRaw);
        setStats((p) => ({ ...p, totalUsers: userCount ?? usersRaw.length }));
      }
      const { data: teamsRaw } = await supabase
        .from("teams")
        .select(`
          id, name, color, challenge_id,
          challenges ( id, name ),
          team_members ( user_id )
        `)
        .order("name");

      if (teamsRaw) setTeams(teamsRaw);
      setLoading(false);
    }
    load();
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────

  async function handleSaveMember(data: {
    memberId: string;
    points: number;
    streak: number;
    teamId: string | null;
  }) {
    await supabase
      .from("users")
      .update({ total_points: data.points, streak: data.streak })
      .eq("id", data.memberId);

    setMembers((p) =>
      p.map((m) =>
        m.id === data.memberId
          ? { ...m, total_points: data.points, streak: data.streak }
          : m
      )
    );
  }

  async function handleRemoveMember(memberId: string) {
    // Admin "remove" from global panel only soft-warns — we don't delete users
    // this is a no-op placeholder; removal is per-challenge in the manage page
    alert("To remove a member from a challenge, use the Manage page for that challenge.");
  }

  // ── Guards ─────────────────────────────────────────────────────────────────

  if (loading) return <LoadingScreen />;

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5">
        <div className="neon-card rounded-2xl p-12 text-center max-w-sm w-full">
          <p className="text-3xl mb-3">🔒</p>
          <p className="font-extrabold text-slate-900 text-lg mb-2">Admin Only</p>
          <p className="text-sm text-slate-500 mb-5">
            You don't have permission to view this page.
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
  }

  // ── Filtered lists ─────────────────────────────────────────────────────────

  const filteredChallenges = challengeSearch.trim()
    ? challenges.filter(
        (c) =>
          c.name.toLowerCase().includes(challengeSearch.toLowerCase()) ||
          c.join_code.toLowerCase().includes(challengeSearch.toLowerCase())
      )
    : challenges;

  const filteredMembers = memberSearch.trim()
    ? members.filter(
        (m) =>
          m.name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
          m.email?.toLowerCase().includes(memberSearch.toLowerCase())
      )
    : members;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen px-5 pt-6 pb-28 space-y-5 max-w-2xl mx-auto">

      {/* Header */}
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
            Admin
          </p>
          <h1 className="text-2xl font-display font-extrabold text-slate-900 tracking-tight leading-tight">
            Command Center
          </h1>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          emoji="👥"
          label="Total Members"
          value={stats.totalUsers}
          gradient="linear-gradient(90deg,#ff6b9d,#ff9f43)"
        />
        <StatCard
          emoji="⚡"
          label="Total Challenges"
          value={stats.totalChallenges}
          gradient="linear-gradient(90deg,#48cfad,#667eea)"
        />
        <StatCard
          emoji="🔥"
          label="Active Challenges"
          value={stats.activeChallenges}
          gradient="linear-gradient(90deg,#ffd166,#ff6b9d)"
        />
        <StatCard
          emoji="📊"
          label="Total Enrollments"
          value={stats.totalMembers}
          gradient="linear-gradient(90deg,#7b2d8b,#118ab2)"
        />
      </div>

      {/* Quick actions */}
      <div className="flex gap-2">
        <button
          onClick={() => router.push("/embed/challenges/new")}
          className="flex-1 py-3 rounded-xl font-bold text-sm text-white"
          style={{ background: "linear-gradient(90deg,#ff6b9d,#667eea)" }}
        >
          + New Challenge
        </button>
        <button
          onClick={() => setShowAddMember(true)}
          className="flex-1 py-3 rounded-xl font-bold text-sm border border-slate-200 text-slate-700 hover:bg-white transition"
        >
          + Add Member
        </button>
        <button
          onClick={() => setShowAddTeam(true)}
          className="flex-1 py-3 rounded-xl font-bold text-sm border border-slate-200 text-slate-700 hover:bg-white transition"
        >
          + Add Team
        </button>
      </div>

      {/* Tab toggle */}
      <div className="flex p-1 rounded-2xl bg-slate-100">
        {(["challenges", "members", "teams"] as AdminTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all capitalize ${
              tab === t
                ? "bg-white shadow text-slate-900"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t === "challenges" && `⚡ ${challenges.length}`}
            {t === "members"    && `👥 ${members.length}`}
            {t === "teams"      && `🏳️‍🌈 Teams`}
          </button>
        ))}
      </div>

      {/* ── Challenges Tab ── */}
      {tab === "challenges" && (
        <div className="neon-card rounded-2xl overflow-hidden">
          <div className="h-1 w-full rainbow-cta" />
          <div className="p-5 space-y-3">
            <input
              type="text"
              value={challengeSearch}
              onChange={(e) => setChallengeSearch(e.target.value)}
              placeholder="Search by name or join code…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            />

            {filteredChallenges.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No challenges found.</p>
            ) : (
              <div className="space-y-2">
                {filteredChallenges.map((ch) => (
                  <ChallengeCard
                    key={ch.id}
                    challenge={ch}
                    onManage={() => router.push(`/embed/challenge/${ch.id}/manage`)}
                    onOpen={() => router.push(`/embed/challenge/${ch.id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Members Tab ── */}
      {tab === "members" && (
        <div className="neon-card rounded-2xl overflow-hidden">
          <div className="h-1 w-full rainbow-cta" />
          <div className="p-5 space-y-3">
            <input
              type="text"
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            />

            {filteredMembers.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No members found.</p>
            ) : (
              <div className="space-y-2">
                {filteredMembers.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 py-3 px-4 rounded-xl border border-slate-100 bg-white/60 hover:bg-white transition"
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                      style={{ background: "linear-gradient(135deg,#ff6b9d,#667eea)" }}
                    >
                      {m.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold text-slate-900 truncate">{m.name}</p>
                        {m.role === "admin" && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">
                            admin
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 truncate">
                        {m.email} · {m.total_points} pts · {m.streak}🔥
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        setEditingMember({
                          id: m.id,
                          name: m.name,
                          email: m.email,
                          total_points: m.total_points,
                          streak: m.streak,
                        })
                      }
                      className="text-xs font-bold px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 transition whitespace-nowrap"
                    >
                      Edit
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
  
      {/* ── Teams Tab ── */}
      {tab === "teams" && (
        <div className="neon-card rounded-2xl overflow-hidden">
          <div className="h-1 w-full rainbow-cta" />
          <div className="p-5 space-y-3">
            <input
              type="text"
              value={teamSearch}
              onChange={(e) => setTeamSearch(e.target.value)}
              placeholder="Search teams…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            />

            {teams
              .filter((t) =>
                !teamSearch.trim() ||
                t.name?.toLowerCase().includes(teamSearch.toLowerCase())
              )
              .map((team) => {
                const memberCount = team.team_members?.length ?? 0;
                const challengeName = team.challenges?.[0]?.name;
                const challengeId   = team.challenges?.[0]?.id;
                
                return (
                  <div
                    key={team.id}
                    className="flex items-center gap-3 py-3 px-4 rounded-xl border border-slate-100 bg-white/60 hover:bg-white transition"
                  >
                    {/* Color swatch */}
                    <div
                      className="w-9 h-9 rounded-full flex-shrink-0"
                      style={{
                        background: team.color ||
                          "linear-gradient(90deg,#ff3c5f,#ff8c42,#ffd166,#06d6a0,#118ab2,#7b2d8b)",
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{team.name}</p>
                      <p className="text-xs text-slate-400">
                        {memberCount} member{memberCount !== 1 ? "s" : ""}
                        {challengeName && (
                          <span className="ml-1.5">· {challengeName}</span>
                        )}
                      </p>
                    </div>
                    {challengeId && (
                      <button
                        onClick={() =>
                          router.push(`/embed/challenge/${challengeId}/manage`)
                        }
                        className="text-xs font-bold px-3 py-1.5 rounded-full text-white whitespace-nowrap"
                        style={{ background: "linear-gradient(90deg,#ff6b9d,#667eea)" }}
                      >
                        Manage
                      </button>
                    )}
                  </div>
                );
              })}

            {teams.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-6">No teams yet.</p>
            )}
          </div>
        </div>
      )}
      
      {/* Edit Member Modal */}
      {editingMember && (
        <MemberEditModal
          member={editingMember}
          teams={[]}
          onClose={() => setEditingMember(null)}
          onSave={handleSaveMember}
          onRemove={handleRemoveMember}
        />
      )}

      {/* Add Member Modal */}
      {showAddMember && (
        <AddMemberModal
          challenges={challenges}
          teams={teams}
          onClose={() => setShowAddMember(false)}
          onCreated={(newMember) => {
            setMembers((p) => [
              { ...newMember, role: "member", created_at: new Date().toISOString() },
              ...p,
            ]);
            setStats((p) => ({ ...p, totalUsers: p.totalUsers + 1 }));
          }}
        />
      )}

      {/* Add Team Modal */}
      {showAddTeam && (
        <AddTeamModal
          challenges={challenges}
          onClose={() => setShowAddTeam(false)}
          onCreated={(newTeam) => {
            setTeams((p) => [...p, newTeam]);
          }}
        />
      )}
    </div>
  );
}