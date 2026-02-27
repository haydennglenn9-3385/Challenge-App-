"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import PRLogModal from "@/components/PRLogModal";

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, #ff6b9d, #ff9f43)",
  "linear-gradient(135deg, #48cfad, #667eea)",
  "linear-gradient(135deg, #a855f7, #ff6b9d)",
  "linear-gradient(135deg, #ff9f43, #ffdd59)",
];

function ProfileContent() {
  const router = useRouter();
  const [profile, setProfile]                     = useState<any>(null);
  const [authUser, setAuthUser]                   = useState<any>(null);
  const [joinedChallenges, setJoinedChallenges]   = useState<any[]>([]);
  const [createdChallenges, setCreatedChallenges] = useState<any[]>([]);
  const [teamMembers, setTeamMembers]             = useState<any[]>([]);
  const [loading, setLoading]                     = useState(true);
  const [authed, setAuthed]                       = useState<boolean | null>(null);
  const [showPRModal, setShowPRModal] = useState(false);


  // Delete flow
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);
  const [deleteStep, setDeleteStep]         = useState<"soft" | "hard" | null>(null);
  const [deleting, setDeleting]             = useState(false);
  const [deleteError, setDeleteError]       = useState("");

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setAuthed(false); setLoading(false); return; }
      setAuthed(true);
      setAuthUser(user);
      const { data: userData } = await supabase
        .from("users").select("*").eq("id", user.id).single();

      if (!userData) {
        const { data: newProfile } = await supabase
          .from("users")
          .insert({ id: user.id, email: user.email, name: user.user_metadata?.display_name || user.email?.split("@")[0] || "Member" })
          .select().single();
        setProfile(newProfile);
      } else {
        setProfile(userData);
      }

      const resolvedId = userData?.id || user.id;

      const { data: joinedData } = await supabase
        .from("challenge_members")
        .select(`challenge_id, challenges(id, name, join_code, creator_id, start_date, end_date, description)`)
        .eq("user_id", resolvedId);
      if (joinedData) setJoinedChallenges(joinedData.map((c: any) => c.challenges).filter(Boolean));

      const { data: createdData } = await supabase
        .from("challenges").select("*").eq("creator_id", resolvedId);
      setCreatedChallenges(createdData || []);

      const { data: userTeamData } = await supabase
        .from("team_members").select("team_id").eq("user_id", resolvedId).limit(1).single();
      if (userTeamData) {
        const { data: membersData } = await supabase
          .from("team_members")
          .select(`user_id, users(id, name, streak, total_points, avatar_emoji)`)
          .eq("team_id", userTeamData.team_id).limit(5);
        if (membersData) setTeamMembers(membersData.map((m: any) => m.users).filter(Boolean));
      }

      setLoading(false);
    }
    loadData();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  async function handleSoftDelete() {
    setDeleting(true);
    setDeleteError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setDeleting(false); return; }

    const { error } = await supabase
      .from("users")
      .update({ deleted_at: new Date().toISOString(), name: "Deleted User", email: "" })
      .eq("id", user.id);

    if (error) { setDeleteError(error.message); setDeleting(false); return; }
    await supabase.auth.signOut();
    router.push("/");
  }

  async function handleHardDelete() {
    setDeleting(true);
    setDeleteError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setDeleting(false); return; }

    await supabase.from("users").delete().eq("id", user.id);

    const res = await fetch("/api/user/delete", { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setDeleteError(json.error || "Something went wrong. Please try again.");
      setDeleting(false);
      return;
    }

    await supabase.auth.signOut();
    router.push("/");
  }

  if (authed === false) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="neon-card rounded-2xl p-12 text-center max-w-sm w-full">
          <div className="text-5xl mb-4">🏳️‍🌈</div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome</h2>
          <p className="text-slate-500 text-sm mb-6">Log in to see your profile</p>
          <button onClick={() => router.push("/auth")} className="rainbow-cta w-full px-6 py-3 rounded-xl font-bold">
            Log in / Sign up
          </button>
        </div>
      </div>
    );
  }

  if (loading || authed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-400 font-semibold">Loading profile…</p>
      </div>
    );
  }

  const streakDays  = profile?.streak || 0;
  const totalPoints = profile?.total_points || 0;
  const avatarEmoji = profile?.avatar_emoji || "😊";
  const weekDays    = ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <>
      <style>{`
        .delete-sheet {
          position: fixed; inset: 0; z-index: 100;
          display: flex; flex-direction: column; justify-content: flex-end;
        }
        .delete-backdrop {
          position: absolute; inset: 0;
          background: rgba(0,0,0,0.4); backdrop-filter: blur(4px);
        }
        .delete-panel {
          position: relative; z-index: 1;
          background: #fff; border-radius: 24px 24px 0 0;
          padding: 28px 20px 48px;
        }
        .delete-btn {
          width: 100%; padding: 14px; border-radius: 14px; border: none;
          font-size: 15px; font-weight: 700; cursor: pointer;
          font-family: 'DM Sans', sans-serif; text-align: left;
        }
        .delete-btn:disabled { opacity: 0.5; cursor: default; }
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
            <h1 className="text-3xl font-display font-extrabold text-slate-900 tracking-tight">Profile</h1>
          </div>
          <button
            onClick={handleSignOut}
            className="text-xs font-bold px-4 py-2 rounded-full border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
          >
            Sign out
          </button>
        </div>

        {/* Hero profile card */}
        <div className="neon-card rounded-2xl overflow-hidden">
          <div className="h-1.5 w-full rainbow-cta" />
          <div className="px-5 py-5">
            <div className="flex items-center gap-4 mb-4">
              {/* Emoji avatar */}
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
                style={{ background: "#f1f5f9" }}
              >
                {avatarEmoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xl font-extrabold text-slate-900">{profile?.name || "Member"}</p>
                <p className="text-xs text-slate-500 mt-0.5 truncate">{authUser?.email}</p>
              </div>
            </div>
            <button
              onClick={() => router.push("/embed/profile/edit")}
              className="w-full py-2.5 rounded-xl text-sm font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
            >
              ✏️ Edit Profile
            </button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 border-t border-slate-100">
            {[
              { label: "Points",     value: totalPoints,            icon: "⭐" },
              { label: "Streak",     value: `${streakDays}d`,       icon: "🔥" },
              { label: "Challenges", value: joinedChallenges.length, icon: "⚡" },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col items-center py-4 border-r border-slate-100 last:border-0">
                <span className="text-lg mb-0.5">{stat.icon}</span>
                <p className="text-xl font-extrabold text-slate-900">{stat.value}</p>
                <p className="text-xs text-slate-400 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Streak calendar */}
        <div className="neon-card rounded-2xl p-5">
          <p className="text-sm font-extrabold text-slate-900 mb-3">This Week</p>
          <div className="flex justify-between">
            {weekDays.map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <span className="text-xs font-bold text-slate-400">{d}</span>
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={i < streakDays ? { background: "linear-gradient(135deg, #ff6b9d, #667eea)" } : { background: "#f1f5f9" }}
                >
                  {i < streakDays && <span className="text-xs">🔥</span>}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-3 font-medium text-center">
            {streakDays > 0 ? `${streakDays}-day streak — keep it going! 🔥` : "Start your streak today!"}
          </p>
        </div>

        {/* Teammates */}
        {teamMembers.length > 0 && (
          <div className="neon-card rounded-2xl p-5">
            <p className="text-sm font-extrabold text-slate-900 mb-3">Your Team</p>
            <div className="space-y-2">
              {teamMembers.slice(0, 4).map((member: any, i: number) => (
                <div key={member.id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                    style={{ background: "#f1f5f9" }}
                  >
                    {member.avatar_emoji || "😊"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900">{member.name}</p>
                    <p className="text-xs text-slate-500">🔥 {member.streak || 0}-day streak</p>
                  </div>
                  <p className="text-sm font-extrabold text-slate-900">{member.total_points || 0} pts</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active challenges */}
        <div className="neon-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-extrabold text-slate-900">Active Challenges</p>
            <button onClick={() => router.push("/embed/challenges")} className="text-xs font-bold text-slate-400">
              Browse →
            </button>
          </div>
          {joinedChallenges.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-slate-500 text-sm mb-3">You haven't joined any challenges yet</p>
              <button onClick={() => router.push("/embed/challenges")} className="rainbow-cta rounded-xl px-5 py-2.5 font-bold text-sm">
                Browse Challenges
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {joinedChallenges.map((challenge: any) => {
                const totalDays  = Math.ceil((new Date(challenge.end_date).getTime() - new Date(challenge.start_date).getTime()) / 86400000);
                const daysPassed = Math.ceil((Date.now() - new Date(challenge.start_date).getTime()) / 86400000);
                const progress   = Math.min(100, Math.max(0, Math.round((daysPassed / totalDays) * 100)));
                return (
                  <button
                    key={challenge.id}
                    onClick={() => router.push(`/embed/challenge/${challenge.id}`)}
                    className="w-full text-left neon-card rounded-xl overflow-hidden hover:-translate-y-0.5 transition-all duration-200"
                    style={{ background: "white" }}
                  >
                    <div className="h-0.5 w-full rainbow-cta" />
                    <div className="px-4 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-bold text-sm text-slate-900">{challenge.name}</p>
                        <span className="text-xs font-bold text-slate-400">{progress}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full rainbow-cta" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Challenges You Created */}
        {createdChallenges.length > 0 && (
          <div className="neon-card rounded-2xl p-5">
            <p className="text-sm font-extrabold text-slate-900 mb-3">Challenges You Created</p>
            <div className="space-y-2">
              {createdChallenges.map((challenge: any) => (
                <div key={challenge.id} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="font-bold text-sm text-slate-900">{challenge.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Code: <strong>{challenge.join_code}</strong></p>
                  </div>
                  <button
                    onClick={() => router.push(`/embed/challenge/${challenge.id}/manage`)}
                    className="text-xs font-bold px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Manage
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div className="neon-card rounded-2xl p-5 space-y-3">
          <p className="text-sm font-extrabold text-slate-900">Quick Actions</p>
          <button onClick={() => router.push("/embed/challenges/new")} className="rainbow-cta w-full rounded-xl py-4 font-bold text-sm">
            Create Challenge
          </button>
          <button onClick={() => router.push("/embed/join")} className="w-full rounded-xl py-3.5 font-bold text-sm border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors">
            Join with Code
          </button>
          <button onClick={() => router.push("/embed/leaderboard")} className="w-full rounded-xl py-3.5 font-bold text-sm border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors">
            View Leaderboard
          </button>
          <button
             onClick={() => setShowPRModal(true)}
             className="w-full rounded-xl py-3 font-bold text-sm border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
            >
              🏆 Log a PR
            </button>
        </div>

        {/* Account — danger zone */}
        <div className="neon-card rounded-2xl p-5">
          <p className="text-sm font-extrabold text-slate-900 mb-3">Account</p>
          <button
            onClick={() => { setShowDeleteMenu(true); setDeleteStep(null); setDeleteError(""); }}
            className="w-full py-3 rounded-xl text-sm font-bold border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
          >
            Delete Profile
          </button>
        </div>

      </div>

      {/* ── Delete bottom sheet ── */}
      {showDeleteMenu && (
        <div className="delete-sheet">
          <div className="delete-backdrop" onClick={() => setShowDeleteMenu(false)} />
          <div className="delete-panel">

            {/* Step 1 — choose type */}
            {deleteStep === null && (
              <>
                <p style={{ fontWeight: 800, fontSize: 17, marginBottom: 6 }}>Delete Profile</p>
                <p style={{ fontSize: 13, color: "#666", marginBottom: 20, lineHeight: 1.5 }}>
                  How would you like to delete your account?
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <button className="delete-btn" style={{ background: "#f1f5f9", color: "#0e0e0e" }} onClick={() => setDeleteStep("soft")}>
                    Deactivate account
                    <span style={{ display: "block", fontSize: 11, fontWeight: 500, color: "#888", marginTop: 2 }}>
                      Hides your profile. Data can be restored — contact support to recover.
                    </span>
                  </button>
                  <button className="delete-btn" style={{ background: "#fff0f0", color: "#c0392b", border: "1px solid #ffc5c5" }} onClick={() => setDeleteStep("hard")}>
                    Permanently delete everything
                    <span style={{ display: "block", fontSize: 11, fontWeight: 500, color: "#e57373", marginTop: 2 }}>
                      Removes all your data forever. This cannot be undone.
                    </span>
                  </button>
                  <button className="delete-btn" style={{ background: "transparent", color: "#999", textAlign: "center" }} onClick={() => setShowDeleteMenu(false)}>
                    Cancel
                  </button>
                </div>
              </>
            )}

            {/* Step 2a — confirm soft delete */}
            {deleteStep === "soft" && (
              <>
                <p style={{ fontWeight: 800, fontSize: 17, marginBottom: 6 }}>Deactivate account?</p>
                <p style={{ fontSize: 13, color: "#666", marginBottom: 20, lineHeight: 1.5 }}>
                  Your profile will be hidden and you'll be signed out. Email us anytime to restore your account.
                </p>
                {deleteError && <p style={{ fontSize: 13, color: "#c0392b", marginBottom: 12 }}>⚠️ {deleteError}</p>}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <button className="delete-btn" style={{ background: "#f1f5f9", color: "#0e0e0e" }} disabled={deleting} onClick={handleSoftDelete}>
                    {deleting ? "Deactivating…" : "Yes, deactivate my account"}
                  </button>
                  <button className="delete-btn" style={{ background: "transparent", color: "#999", textAlign: "center" }} onClick={() => setDeleteStep(null)}>
                    ← Back
                  </button>
                </div>
              </>
            )}

            {/* Step 2b — confirm hard delete */}
            {deleteStep === "hard" && (
              <>
                <p style={{ fontWeight: 800, fontSize: 17, color: "#c0392b", marginBottom: 6 }}>Permanently delete everything?</p>
                <p style={{ fontSize: 13, color: "#666", marginBottom: 20, lineHeight: 1.5 }}>
                  This will erase your account, all check-ins, challenge history, and posts. <strong>There is no way to undo this.</strong>
                </p>
                {deleteError && <p style={{ fontSize: 13, color: "#c0392b", marginBottom: 12 }}>⚠️ {deleteError}</p>}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <button className="delete-btn" style={{ background: "#c0392b", color: "#fff", textAlign: "center" }} disabled={deleting} onClick={handleHardDelete}>
                    {deleting ? "Deleting…" : "Yes, delete everything permanently"}
                  </button>
                  <button className="delete-btn" style={{ background: "transparent", color: "#999", textAlign: "center" }} onClick={() => setDeleteStep(null)}>
                    ← Back
                  </button>
                </div>
              </>
            )}
            {showPRModal && profile?.id && (
              <PRLogModal
                userId={profile.id}
                onClose={() => setShowPRModal(false)}
                onSaved={() => setShowPRModal(false)}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-slate-400">Loading profile…</div>}>
      <ProfileContent />
    </Suspense>
  );
}