"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import JoinCodeDisplay from "@/components/JoinCodeDisplay";
import MemberGate from "@/components/MemberGate";

// ─── Exercise schedule ────────────────────────────────────────────────────────
const EXERCISES: Record<number, { name: string; emoji: string }> = {
  0: { name: "Jumping Jacks", emoji: "⭐" },
  1: { name: "Lunges",        emoji: "🦵" },
  2: { name: "Push-ups",      emoji: "💪" },
  3: { name: "Glute Bridges", emoji: "🍑" },
  4: { name: "Crunches",      emoji: "🔥" },
  5: { name: "Squats",        emoji: "🏋️" },
  6: { name: "Bird Dogs",     emoji: "🐦" },
};

const CHALLENGE_START  = new Date("2026-01-04");
const BASE_REPS        = 5;
const REPS_INCREMENT   = 5;
const BASE_CARDIO      = 5;
const CARDIO_INCREMENT = 5;

function getCurrentWeek()   { return Math.max(1, Math.floor((Date.now() - CHALLENGE_START.getTime()) / (1000 * 60 * 60 * 24 * 7)) + 1); }
function getCurrentReps()   { return BASE_REPS   + (getCurrentWeek() - 1) * REPS_INCREMENT; }
function getCurrentCardio() { return BASE_CARDIO + (getCurrentWeek() - 1) * CARDIO_INCREMENT; }

function computeStreak(logs: { date: string }[]) {
  if (!logs.length) return 0;
  let streak = 1;
  for (let i = logs.length - 1; i > 0; i--) {
    const diff = (new Date(logs[i].date).getTime() - new Date(logs[i - 1].date).getTime()) / 86400000;
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

function formatDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${m.padStart(2,"0")}/${day.padStart(2,"0")}/${y.slice(-2)}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ChallengeDetailPage() {
  const params      = useParams<{ id: string }>();
  const router      = useRouter();
  const challengeId = typeof params?.id === "string" ? params.id : "";

  const [challenge,       setChallenge]       = useState<any>(null);
  const [members,         setMembers]         = useState<any[]>([]);
  const [messages,        setMessages]        = useState<any[]>([]);
  const [messageText,     setMessageText]     = useState("");
  const [loading,         setLoading]         = useState(true);
  const [notFound,        setNotFound]        = useState(false);
  const [userId,          setUserId]          = useState("");
  const [isMember,        setIsMember]        = useState(false);
  const [userTeam,        setUserTeam]        = useState("");
  const [userTotalPoints, setUserTotalPoints] = useState(0);
  const [challengeLogs,   setChallengeLogs]   = useState<any[]>([]);
  const [challengeStreak, setChallengeStreak] = useState(0);
  const [checkedInToday,  setCheckedInToday]  = useState(false);
  const [todayPoints,     setTodayPoints]     = useState(0);
  const [checkingIn,      setCheckingIn]      = useState(false);
  const [cardioChecked,   setCardioChecked]   = useState(false);
  const [successMessage,  setSuccessMessage]  = useState("");

  const today         = new Date();
  const todayExercise = EXERCISES[today.getDay()];
  const currentWeek   = getCurrentWeek();
  const currentReps   = getCurrentReps();
  const currentCardio = getCurrentCardio();
  const todayStr      = today.toISOString().split("T")[0];
  const daysLeft      = challenge ? Math.ceil((new Date(challenge.end_date).getTime() - Date.now()) / 86400000) : 0;
  const isCreator     = !!(userId && challenge && userId === challenge.creator_id);

  // Join code visibility:
  // - Public challenge  → always visible
  // - Private challenge → only visible to members (or creator)
  const showJoinCode = challenge && (challenge.is_public || isMember || isCreator);

  // ─── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!challengeId) return;
    async function load() {
      const { data: ch } = await supabase
        .from("challenges").select("*").eq("id", challengeId).maybeSingle();
      if (!ch) { setNotFound(true); setLoading(false); return; }
      setChallenge(ch);

      // Member list visible to everyone (names + points only — no sensitive data)
      const { data: memberRows } = await supabase
        .from("challenge_members")
        .select("user_id, users(id, name, total_points, streak, emoji_avatar)")
        .eq("challenge_id", challengeId);
      setMembers((memberRows || []).map((r: any) => r.users).filter(Boolean));

      // Auth check
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);

      const { data: memberCheck } = await supabase
        .from("challenge_members").select("id")
        .eq("challenge_id", challengeId).eq("user_id", user.id).maybeSingle();
      const member = !!memberCheck;
      setIsMember(member);

      if (member) {
        // Messages only loaded for members
        const { data: msgs } = await supabase
          .from("messages")
          .select("id, text, created_at, user_id, users(name, emoji_avatar)")
          .eq(ch.team_id ? "team_id" : "challenge_id", ch.team_id || challengeId)
          .order("created_at", { ascending: true }).limit(50);
        setMessages(msgs || []);

        const { data: profile } = await supabase
          .from("users").select("total_points").eq("id", user.id).maybeSingle();
        setUserTotalPoints(profile?.total_points || 0);

        const { data: logs } = await supabase
          .from("daily_logs").select("date")
          .eq("user_id", user.id).eq("challenge_id", challengeId)
          .order("date", { ascending: true });
        setChallengeLogs(logs || []);
        setChallengeStreak(computeStreak(logs || []));

        const { data: todayLog } = await supabase
          .from("daily_logs").select("*")
          .eq("user_id", user.id).eq("challenge_id", challengeId)
          .eq("date", todayStr).maybeSingle();
        if (todayLog) { setCheckedInToday(true); setTodayPoints(todayLog.points_earned); }

        const { data: teamRow } = await supabase
          .from("team_members").select("team_id, teams(name)")
          .eq("user_id", user.id).maybeSingle();
        if (teamRow?.teams) setUserTeam((teamRow.teams as any).name);
      }
      setLoading(false);
    }
    load();
  }, [challengeId]);

  // ─── Check-in ───────────────────────────────────────────────────────────────
  async function handleCheckIn(level: "50" | "100") {
    if (!userId || !challengeId || checkedInToday) return;
    setCheckingIn(true);
    const points = level === "100" ? 2 : 1;
    const { error } = await supabase.from("daily_logs").insert({
      user_id: userId, challenge_id: challengeId, date: todayStr,
      exercise: todayExercise.name, completion_level: level,
      reps_completed: level === "100" ? currentReps : Math.ceil(currentReps * 0.5),
      reps_target: currentReps, points_earned: points,
    });
    if (!error) {
      const { data: profile } = await supabase.from("users").select("total_points").eq("id", userId).maybeSingle();
      const newPoints = (profile?.total_points || 0) + points;
      await supabase.from("users").update({ total_points: newPoints }).eq("id", userId);
      setCheckedInToday(true); setTodayPoints(points); setUserTotalPoints(newPoints);
      setSuccessMessage(level === "100" ? "🔥 100%+ done! You earned 2 points!" : "✅ 50%+ done! You earned 1 point!");
      setTimeout(() => setSuccessMessage(""), 5000);
      const { data: logs } = await supabase.from("daily_logs").select("date")
        .eq("user_id", userId).eq("challenge_id", challengeId).order("date", { ascending: true });
      setChallengeLogs(logs || []);
      setChallengeStreak(computeStreak(logs || []));
    }
    setCheckingIn(false);
  }

  // ─── Send message ────────────────────────────────────────────────────────────
  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!messageText.trim() || !userId || !challenge || !isMember) return;
    await supabase.from("messages").insert({
      user_id: userId, team_id: challenge.team_id || null,
      challenge_id: challengeId, text: messageText.trim(),
    });
    const { data: msgs } = await supabase
      .from("messages").select("id, text, created_at, user_id, users(name, emoji_avatar)")
      .eq(challenge.team_id ? "team_id" : "challenge_id", challenge.team_id || challengeId)
      .order("created_at", { ascending: true }).limit(50);
    setMessages(msgs || []);
    setMessageText("");
  }

  // ─── Join / Leave ────────────────────────────────────────────────────────────
  async function handleJoin() {
    if (!userId || !challengeId) return;
    const { error } = await supabase.from("challenge_members")
      .insert({ user_id: userId, challenge_id: challengeId });
    if (!error) window.location.reload();
    else alert("Failed to join challenge");
  }

  async function handleLeave() {
    if (!userId || !challengeId) return;
    if (!confirm("Leave this challenge? Your progress will be saved.")) return;
    const { error } = await supabase.from("challenge_members").delete()
      .eq("user_id", userId).eq("challenge_id", challengeId);
    if (!error) window.location.reload();
    else alert("Failed to leave challenge");
  }

  // ─── Loading / not found ─────────────────────────────────────────────────────
  if (loading) return (
    <div style={{
      minHeight: "100dvh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 12,
      background: "linear-gradient(135deg,#d4f5e2 0%,#fde0ef 30%,#fdf6d3 60%,#d4eaf7 100%)",
    }}>
      <div style={{ fontSize: 52 }}>🏳️‍🌈</div>
      <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 18, color: "#7b2d8b", letterSpacing: 2 }}>
        LOADING...
      </div>
    </div>
  );

  if (notFound || !challenge) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="neon-card rounded-3xl p-12 text-center max-w-md">
        <div className="text-5xl mb-4">🏋️</div>
        <h2 className="text-2xl font-display mb-4">Challenge not found</h2>
        <p className="text-slate-600 mb-6">This challenge may have ended or the link is incorrect.</p>
        <button onClick={() => router.push("/embed/challenges")} className="rainbow-cta px-6 py-3 rounded-full font-semibold">
          Browse Challenges
        </button>
      </div>
    </div>
  );

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen px-5 pt-6 pb-28 space-y-5">

      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button
          onClick={() => router.push("/embed/challenges")}
          className="w-9 h-9 rounded-full neon-card flex items-center justify-center text-slate-600 hover:bg-white transition flex-shrink-0"
        >
          ←
        </button>
        {isCreator && (
          <button
            onClick={() => router.push(`/embed/challenge/${challengeId}/manage`)}
            className="text-xs font-bold px-4 py-2 rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
          >
            ⚙️ Manage
          </button>
        )}
      </div>

      {/* Success banner */}
      {successMessage && (
        <div className="neon-card rounded-2xl p-4 border border-green-200 bg-green-50">
          <p className="text-sm font-semibold text-green-800">{successMessage}</p>
        </div>
      )}

      {/* Hero card */}
      <div className="neon-card rounded-2xl overflow-hidden">
        <div className="h-1.5 w-full rainbow-cta" />
        <div className="px-5 py-5 space-y-3">
          {/* Public/private badge */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={challenge.is_public
                ? { background: "#d4f5e2", color: "#166534" }
                : { background: "#fde0ef", color: "#9d174d" }}>
              {challenge.is_public ? "🌍 Public" : "🔒 Private"}
            </span>
            {isMember && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: "#e8d9f7", color: "#6b21a8" }}>
                ✓ Joined
              </span>
            )}
          </div>

          <h2 className="text-3xl font-display font-extrabold text-slate-900 leading-tight">
            {challenge.name}
          </h2>

          {challenge.description && (
            <p className="text-sm text-slate-600 whitespace-pre-line">{challenge.description}</p>
          )}

          <div className="flex items-center gap-3 text-sm text-slate-500 flex-wrap">
            <span>👥 {members.length} members</span>
            <span>⏳ {daysLeft} days left</span>
            <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
              Week {currentWeek}
            </span>
            {userTeam && (
              <span className="text-xs font-bold bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                {userTeam}
              </span>
            )}
          </div>

          {/* Join code — public: always shown · private: members/creator only */}
          {showJoinCode && (
            <JoinCodeDisplay code={challenge.join_code} challengeName={challenge.name} />
          )}

          {/* Private + not a member = teaser */}
          {!challenge.is_public && !isMember && !isCreator && (
            <div style={{
              padding: "10px 14px",
              borderRadius: 12,
              background: "rgba(157,23,77,0.06)",
              border: "1px solid rgba(157,23,77,0.15)",
            }}>
              <p className="text-xs font-semibold text-slate-500">
                🔒 This is a private challenge — join code shared by the creator
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Challenge rules */}
      <details className="neon-card rounded-2xl overflow-hidden">
        <div className="h-1 w-full rainbow-cta" />
        <summary className="px-5 py-4 font-extrabold text-slate-900 cursor-pointer text-sm">
          📋 Challenge Rules
        </summary>
        <div className="px-5 pb-5 space-y-3 text-sm text-slate-600">
          <p className="whitespace-pre-line">{challenge.rules || "No rules provided yet."}</p>
          <div>
            <p className="font-semibold text-slate-800 mb-1">⏳ Duration</p>
            <p>{formatDate(challenge.start_date)} → {formatDate(challenge.end_date)}</p>
          </div>
        </div>
      </details>

      {/* Member stats */}
      {isMember && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: `🔥 ${challengeStreak}`, label: "Day Streak"   },
            { value: `⭐ ${userTotalPoints}`, label: "Total Points" },
            { value: `${currentReps}`,        label: "Reps Target"  },
          ].map(({ value, label }) => (
            <div key={label} className="neon-card rounded-2xl px-3 py-4 text-center">
              <p className="text-xl font-bold">{value}</p>
              <p className="text-xs text-slate-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Today's check-in — members only */}
      {isMember && (
        <div className="neon-card rounded-2xl overflow-hidden">
          <div className="h-1 w-full rainbow-cta" />
          <div className="px-5 py-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500 mb-1">Today's Exercise</p>
                <h3 className="text-2xl font-semibold">{todayExercise.emoji} {todayExercise.name}</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Target: <strong>{currentReps} reps</strong> · 50% = {Math.ceil(currentReps * 0.5)} reps
                </p>
              </div>
              {checkedInToday && (
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">+{todayPoints}</p>
                  <p className="text-xs text-slate-500">pts earned</p>
                </div>
              )}
            </div>

            {checkedInToday ? (
              <div className="rounded-2xl bg-green-50 border border-green-200 p-4 text-center">
                <p className="text-green-700 font-semibold">✅ Checked in today! Come back tomorrow 💪</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => handleCheckIn("50")} disabled={checkingIn}
                  className="rounded-2xl border-2 border-slate-200 bg-white hover:border-slate-400 hover:shadow-md transition-all p-4 text-left disabled:opacity-50">
                  <p className="text-2xl mb-1">🎈</p>
                  <p className="font-bold text-lg">50%+</p>
                  <p className="text-sm text-slate-600">{Math.ceil(currentReps * 0.5)}+ reps</p>
                  <p className="text-xs font-semibold text-slate-500 mt-2">+1 point</p>
                </button>
                <button onClick={() => handleCheckIn("100")} disabled={checkingIn}
                  className="rainbow-cta rounded-2xl p-4 text-left hover:shadow-xl transition-all disabled:opacity-50">
                  <p className="text-2xl mb-1">💯</p>
                  <p className="font-bold text-lg">100%+</p>
                  <p className="text-sm">{currentReps}+ reps</p>
                  <p className="text-xs font-semibold mt-2">+2 points</p>
                </button>
              </div>
            )}

            {/* Weekly cardio */}
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">🏃 Weekly Cardio Goal</p>
                  <p className="text-sm text-slate-600">{currentCardio} minutes this week</p>
                </div>
                <button
                  onClick={() => setCardioChecked(!cardioChecked)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                    cardioChecked
                      ? "bg-green-100 text-green-700 border border-green-300"
                      : "border border-slate-300 bg-white hover:bg-slate-50"
                  }`}
                >
                  {cardioChecked ? "✅ Done!" : "Mark done"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Live Chat — MEMBER GATE ─────────────────────────────────────────── */}
      <MemberGate isMember={isMember} isLoggedIn={!!userId} challengeId={challengeId}>
        <div className="neon-card rounded-2xl overflow-hidden">
          <div className="h-1 w-full rainbow-cta" />
          <div className="px-5 py-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-extrabold text-slate-900">Live Chat</h3>
              <span className="neon-chip rounded-full px-3 py-1 text-xs font-semibold">Streak squad</span>
            </div>
            <div className="space-y-3 max-h-[240px] overflow-y-auto pr-1">
              {messages.length === 0 && (
                <p className="text-sm text-slate-500">No messages yet. Start the hype! 🎉</p>
              )}
              {messages.map((msg: any) => {
                const avatar = msg.users?.emoji_avatar;
                const name   = msg.users?.name || "Member";
                return (
                  <div key={msg.id} className="rounded-2xl border border-slate-100 bg-white/80 p-3 flex gap-3 items-start">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0"
                      style={{ background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.06)" }}>
                      {avatar || name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{name}</p>
                      <p className="text-sm text-slate-600">{msg.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <form onSubmit={handleSendMessage} className="mt-4 flex gap-2">
              <input
                type="text" value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Cheer them on..."
                className="flex-1 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
              <button type="submit" disabled={!messageText.trim()}
                className="rainbow-cta rounded-full px-4 py-2 font-semibold text-sm disabled:opacity-50">
                Send
              </button>
            </form>
          </div>
        </div>
      </MemberGate>

      {/* ─── Challenge Crew — MEMBER GATE ────────────────────────────────────── */}
      <MemberGate isMember={isMember} isLoggedIn={!!userId} challengeId={challengeId}
        fallback={
          // Non-members see a teaser crew list (names only, no points/streak)
          <div className="neon-card rounded-2xl overflow-hidden">
            <div className="h-1 w-full" style={{ background: "#f1f5f9" }} />
            <div className="px-5 py-5">
              <h3 className="text-lg font-extrabold text-slate-900 mb-4">
                Challenge Crew · {members.length} members
              </h3>
              <div className="space-y-2">
                {members.slice(0, 3).map((member: any) => (
                  <div key={member.id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-50">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                      style={{ background: "rgba(0,0,0,0.06)" }}>
                      {member.emoji_avatar || member.name?.[0]}
                    </div>
                    <p className="text-sm font-semibold text-slate-700">{member.name}</p>
                  </div>
                ))}
                {members.length > 3 && (
                  <p className="text-xs text-slate-400 text-center pt-1">
                    +{members.length - 3} more members
                  </p>
                )}
              </div>
              <p className="text-xs text-slate-400 text-center mt-4">
                Join to see points, streaks & full crew details
              </p>
            </div>
          </div>
        }
      >
        {/* Full crew — members only */}
        <div className="neon-card rounded-2xl overflow-hidden">
          <div className="h-1 w-full" style={{ background: "#f1f5f9" }} />
          <div className="px-5 py-5">
            <h3 className="text-lg font-extrabold text-slate-900 mb-4">Challenge Crew</h3>
            <div className="space-y-3">
              {members.length === 0 && (
                <p className="text-sm text-slate-500">Invite members with the join code above.</p>
              )}
              {members.map((member: any) => (
                <div key={member.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white/80 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-base"
                      style={{ background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.06)" }}>
                      {member.emoji_avatar || member.name?.[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{member.name}</p>
                      <p className="text-xs text-slate-500">⭐ {member.total_points || 0} pts</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold">🔥 {member.streak || 0}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </MemberGate>

      {/* ─── Bottom actions ───────────────────────────────────────────────────── */}
      {!userId && (
        <div className="neon-card rounded-2xl p-6 text-center">
          <p className="text-slate-600 mb-4 text-sm">Log in to join this challenge and check in daily</p>
          <button onClick={() => router.push("/auth")} className="rainbow-cta px-6 py-3 rounded-full font-semibold">
            Log in / Sign up
          </button>
        </div>
      )}
      {userId && !isMember && (
        <div className="neon-card rounded-2xl p-6 text-center">
          <p className="text-slate-600 mb-4 text-sm">Ready to join the challenge?</p>
          <button onClick={handleJoin} className="rainbow-cta px-6 py-3 rounded-full font-semibold w-full">
            Join Challenge
          </button>
        </div>
      )}
      {userId && isMember && !isCreator && (
        <div className="neon-card rounded-2xl p-5 text-center">
          <button onClick={handleLeave}
            className="px-6 py-3 rounded-full font-semibold border border-red-300 bg-red-50 text-red-600 hover:bg-red-100 transition text-sm">
            Leave Challenge
          </button>
        </div>
      )}

    </div>
  );
}