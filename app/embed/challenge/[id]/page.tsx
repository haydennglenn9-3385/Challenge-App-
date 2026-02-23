"use client";

// app/embed/challenge/[id]/page.tsx — Challenge Detail
// Fully migrated from Wix to Supabase auth.

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

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

const CHALLENGE_START   = new Date("2026-01-04");
const BASE_REPS         = 5;
const REPS_INCREMENT    = 5;
const BASE_CARDIO       = 5;
const CARDIO_INCREMENT  = 5;

function getCurrentWeek()  { return Math.floor((Date.now() - CHALLENGE_START.getTime()) / (1000 * 60 * 60 * 24 * 7)) + 1; }
function getCurrentReps()  { return BASE_REPS  + (getCurrentWeek() - 1) * REPS_INCREMENT; }
function getCurrentCardio(){ return BASE_CARDIO + (getCurrentWeek() - 1) * CARDIO_INCREMENT; }

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
  const [mobileMenuOpen,  setMobileMenuOpen]  = useState(false);

  const today         = new Date();
  const todayExercise = EXERCISES[today.getDay()];
  const currentWeek   = getCurrentWeek();
  const currentReps   = getCurrentReps();
  const currentCardio = getCurrentCardio();
  const todayStr      = today.toISOString().split("T")[0];

  const daysLeft = challenge
    ? Math.ceil((new Date(challenge.end_date).getTime() - Date.now()) / 86400000)
    : 0;

  // ─── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!challengeId) return;

    async function load() {
      // 1. Challenge
      const { data: ch } = await supabase
        .from("challenges")
        .select("*")
        .eq("id", challengeId)
        .maybeSingle();

      if (!ch) { setNotFound(true); setLoading(false); return; }
      setChallenge(ch);

      // 2. Members (via challenge_members → users)
      const { data: memberRows } = await supabase
        .from("challenge_members")
        .select("user_id, users(id, name, total_points, streak)")
        .eq("challenge_id", challengeId);

      setMembers((memberRows || []).map((r: any) => r.users).filter(Boolean));

      // 3. Messages (via team_id if exists, else challenge_id)
      const { data: msgs } = await supabase
        .from("messages")
        .select("id, text, created_at, user_id, users(name)")
        .eq(ch.team_id ? "team_id" : "challenge_id", ch.team_id || challengeId)
        .order("created_at", { ascending: true })
        .limit(50);

      setMessages(msgs || []);

      // 4. Current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      setUserId(user.id);

      // 5. Member check
      const { data: memberCheck } = await supabase
        .from("challenge_members")
        .select("id")
        .eq("challenge_id", challengeId)
        .eq("user_id", user.id)
        .maybeSingle();

      const member = !!memberCheck;
      setIsMember(member);

      if (member) {
        // Points
        const { data: profile } = await supabase
          .from("users")
          .select("total_points")
          .eq("id", user.id)
          .maybeSingle();
        setUserTotalPoints(profile?.total_points || 0);

        // Logs + streak
        const { data: logs } = await supabase
          .from("daily_logs")
          .select("date")
          .eq("user_id", user.id)
          .eq("challenge_id", challengeId)
          .order("date", { ascending: true });
        setChallengeLogs(logs || []);
        setChallengeStreak(computeStreak(logs || []));

        // Today's check-in
        const { data: todayLog } = await supabase
          .from("daily_logs")
          .select("*")
          .eq("user_id", user.id)
          .eq("challenge_id", challengeId)
          .eq("date", todayStr)
          .maybeSingle();
        if (todayLog) { setCheckedInToday(true); setTodayPoints(todayLog.points_earned); }

        // Team
        const { data: teamRow } = await supabase
          .from("team_members")
          .select("team_id, teams(name)")
          .eq("user_id", user.id)
          .maybeSingle();
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
      user_id:          userId,
      challenge_id:     challengeId,
      date:             todayStr,
      exercise:         todayExercise.name,
      completion_level: level,
      reps_completed:   level === "100" ? currentReps : Math.ceil(currentReps * 0.5),
      reps_target:      currentReps,
      points_earned:    points,
    });

    if (!error) {
      const { data: profile } = await supabase
        .from("users").select("total_points").eq("id", userId).maybeSingle();
      const newPoints = (profile?.total_points || 0) + points;
      await supabase.from("users").update({ total_points: newPoints }).eq("id", userId);

      setCheckedInToday(true);
      setTodayPoints(points);
      setUserTotalPoints(newPoints);
      setSuccessMessage(level === "100" ? "🔥 100%+ done! You earned 2 points!" : "✅ 50%+ done! You earned 1 point!");
      setTimeout(() => setSuccessMessage(""), 5000);

      const { data: logs } = await supabase
        .from("daily_logs").select("date")
        .eq("user_id", userId).eq("challenge_id", challengeId)
        .order("date", { ascending: true });
      setChallengeLogs(logs || []);
      setChallengeStreak(computeStreak(logs || []));
    }

    setCheckingIn(false);
  }

  // ─── Send message ────────────────────────────────────────────────────────────
  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!messageText.trim() || !userId || !challenge) return;

    await supabase.from("messages").insert({
      user_id:      userId,
      team_id:      challenge.team_id || null,
      challenge_id: challengeId,
      text:         messageText.trim(),
    });

    // Refresh messages
    const { data: msgs } = await supabase
      .from("messages")
      .select("id, text, created_at, user_id, users(name)")
      .eq(challenge.team_id ? "team_id" : "challenge_id", challenge.team_id || challengeId)
      .order("created_at", { ascending: true })
      .limit(50);
    setMessages(msgs || []);
    setMessageText("");
  }

  // ─── Join / Leave ────────────────────────────────────────────────────────────
  async function handleJoin() {
    if (!userId || !challengeId) return;
    const { error } = await supabase.from("challenge_members").insert({ user_id: userId, challenge_id: challengeId });
    if (!error) window.location.reload();
    else alert("Failed to join challenge");
  }

  async function handleLeave() {
    if (!userId || !challengeId) return;
    const { error } = await supabase.from("challenge_members").delete().eq("user_id", userId).eq("challenge_id", challengeId);
    if (!error) window.location.reload();
    else alert("Failed to leave challenge");
  }

  // ─── States ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-slate-500">Loading challenge…</p>
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
    <div className="space-y-6">

      {/* Mobile nav */}
      <div className="lg:hidden border-b border-slate-200 pb-3 mb-4">
        <div className="flex items-center justify-between px-1">
          <button onClick={() => router.push("/embed/challenges")} className="px-4 py-2 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition text-sm">
            ← Back
          </button>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="px-4 py-2 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition text-sm">
            •••
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="mt-3 rounded-2xl border border-slate-200 bg-white/90 overflow-hidden">
            <div className="flex flex-col py-2">
              {[
                { label: "Home",         path: "/"                                       },
                { label: "Leaderboard",  path: "/embed/leaderboard"                      },
                { label: "Dashboard",    path: "/embed/dashboard"                        },
                { label: "Edit Challenge", path: `/embed/challenge/${challengeId}/edit`  },
              ].map(({ label, path }) => (
                <button key={label} onClick={() => router.push(path)} className="px-4 py-3 text-left text-sm hover:bg-slate-100 transition">
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Desktop nav */}
      <div className="hidden lg:flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <button onClick={() => router.push("/embed/challenges")} className="px-4 py-2 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition text-sm">
          ← Back to Challenges
        </button>
        <div className="flex gap-3">
          {[
            { label: "Home",        path: "/"                  },
            { label: "Leaderboard", path: "/embed/leaderboard" },
            { label: "Dashboard",   path: "/embed/dashboard"   },
          ].map(({ label, path }) => (
            <button key={label} onClick={() => router.push(path)} className="px-4 py-2 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition text-sm">
              {label}
            </button>
          ))}
          <button onClick={() => router.push(`/embed/challenge/${challengeId}/edit`)} className="px-4 py-2 rounded-full font-semibold border border-blue-300 bg-blue-50 hover:bg-blue-100 transition text-sm">
            Edit
          </button>
        </div>
      </div>

      {/* Success banner */}
      {successMessage && (
        <div className="neon-card rounded-2xl p-4 border border-green-200 bg-green-50">
          <p className="text-sm font-semibold text-green-800">{successMessage}</p>
        </div>
      )}

      {/* Mobile hero */}
      <div className="lg:hidden space-y-3 mt-2">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">CHALLENGE</p>
        <h2 className="text-3xl font-display leading-tight">{challenge.name}</h2>
        {challenge.description && <p className="text-sm text-slate-600 whitespace-pre-line">{challenge.description}</p>}
        <div className="flex items-center gap-4 text-sm text-slate-500">
          <span>👥 {members.length} members</span>
          <span>⏳ {daysLeft} days left</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="neon-chip rounded-full px-3 py-1 text-xs font-semibold">Code: {challenge.join_code}</span>
          {userTeam && <span className="rounded-full px-3 py-1 text-xs font-semibold bg-slate-100 text-slate-700">{userTeam}</span>}
          <span className="text-sm text-slate-500">Week {currentWeek}</span>
        </div>
      </div>

      {/* Desktop hero */}
      <div className="hidden lg:grid neon-card rounded-3xl p-6 grid-cols-2 gap-8">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">CHALLENGE</p>
          <h2 className="text-3xl font-display">{challenge.name}</h2>
          {challenge.description && <p className="text-sm text-slate-600 whitespace-pre-line">{challenge.description}</p>}
          <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
            <span>👥 {members.length} members</span>
            <span>⏳ {daysLeft} days left</span>
          </div>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="neon-chip rounded-full px-3 py-1 text-xs font-semibold">Code: {challenge.join_code}</span>
            {userTeam && <span className="rounded-full px-3 py-1 text-xs font-semibold bg-slate-100 text-slate-700">{userTeam}</span>}
            <span className="text-sm text-slate-500">Week {currentWeek}</span>
          </div>
        </div>
        <div className="neon-card rounded-3xl p-4">
          <h3 className="text-lg font-semibold mb-3">Challenge Rules</h3>
          <div className="space-y-3 text-sm text-slate-600">
            <p className="whitespace-pre-line">{challenge.rules || "No rules provided."}</p>
            <div>
              <p className="font-semibold text-slate-800 mb-1">⏳ Challenge Duration</p>
              <p>{formatDate(challenge.start_date)} → {formatDate(challenge.end_date)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile rules */}
      <details className="lg:hidden bg-white/80 rounded-2xl p-4 border border-slate-200 mt-2">
        <summary className="font-semibold text-slate-800 cursor-pointer">Challenge Rules</summary>
        <div className="mt-3 space-y-3 text-sm text-slate-600">
          <p className="whitespace-pre-line">{challenge.rules || "No rules provided."}</p>
          <div>
            <p className="font-semibold text-slate-800 mb-1">⏳ Challenge Duration</p>
            <p>{formatDate(challenge.start_date)} → {formatDate(challenge.end_date)}</p>
          </div>
        </div>
      </details>

      {/* Member stats */}
      {isMember && (
        <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory px-1 sm:grid sm:grid-cols-3 sm:gap-3 sm:overflow-visible sm:px-0">
          {[
            { value: `🔥 ${challengeStreak}`, label: "Day Streak"    },
            { value: `⭐ ${userTotalPoints}`, label: "Total Points"  },
            { value: `${currentReps}`,        label: "Reps Target"   },
          ].map(({ value, label }) => (
            <div key={label} className="min-w-[150px] snap-center rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 text-center shadow-sm sm:min-w-0">
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-slate-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Today's check-in */}
      {isMember && (
        <div className="rounded-3xl bg-white/80 border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500 mb-1">TODAY'S EXERCISE</p>
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
          ) : !userId ? (
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-center">
              <p className="text-amber-700 text-sm">
                <button onClick={() => router.push("/auth")} className="underline font-semibold">Log in</button> to check in
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => handleCheckIn("50")} disabled={checkingIn} className="rounded-2xl border-2 border-slate-200 bg-white hover:border-slate-400 hover:shadow-md transition-all p-4 text-left disabled:opacity-50">
                <p className="text-2xl mb-1">🌗</p>
                <p className="font-bold text-lg">50%+</p>
                <p className="text-sm text-slate-600">{Math.ceil(currentReps * 0.5)}+ reps</p>
                <p className="text-xs font-semibold text-slate-500 mt-2">+1 point</p>
              </button>
              <button onClick={() => handleCheckIn("100")} disabled={checkingIn} className="rainbow-cta rounded-2xl p-4 text-left hover:shadow-xl transition-all disabled:opacity-50">
                <p className="text-2xl mb-1">🌕</p>
                <p className="font-bold text-lg">100%+</p>
                <p className="text-sm">{currentReps}+ reps</p>
                <p className="text-xs font-semibold mt-2">+2 points</p>
              </button>
            </div>
          )}

          {/* Weekly cardio */}
          <div className="mt-2 rounded-2xl border border-slate-200 bg-white/80 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">🏃 Weekly Cardio Goal</p>
                <p className="text-sm text-slate-600">{currentCardio} minutes this week</p>
              </div>
              <button
                onClick={() => setCardioChecked(!cardioChecked)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition ${cardioChecked ? "bg-green-100 text-green-700 border border-green-300" : "border border-slate-300 bg-white hover:bg-slate-50"}`}
              >
                {cardioChecked ? "✅ Done!" : "Mark done"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Community zone */}
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">

        {/* Live chat */}
        <div className="rounded-3xl bg-white/80 border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">Live chat</h3>
            <span className="neon-chip rounded-full px-3 py-1 text-xs font-semibold">Streak squad</span>
          </div>
          <div className="space-y-3 max-h-[240px] overflow-y-auto pr-1">
            {messages.length === 0 && <p className="text-sm text-slate-500">No messages yet. Start the hype! 🎉</p>}
            {messages.map((msg: any) => (
              <div key={msg.id} className="rounded-2xl border border-slate-100 bg-white/80 p-3">
                <p className="text-sm font-semibold">{msg.users?.name || "Member"}</p>
                <p className="text-sm text-slate-600">{msg.text}</p>
              </div>
            ))}
          </div>
          <form onSubmit={handleSendMessage} className="mt-4 flex gap-2">
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder={userId ? "Cheer them on..." : "Log in to chat"}
              disabled={!userId}
              className="flex-1 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
            <button type="submit" disabled={!userId || !messageText.trim()} className="rainbow-cta rounded-full px-4 py-2 font-semibold text-sm disabled:opacity-50">
              Send
            </button>
          </form>
        </div>

        {/* Challenge crew */}
        <div className="rounded-3xl bg-white/80 border border-slate-200 p-6">
          <h3 className="text-xl font-semibold mb-4">Challenge crew</h3>
          <div className="space-y-3">
            {members.length === 0 && (
              <p className="text-sm text-slate-500">Invite members with code: <strong>{challenge.join_code}</strong></p>
            )}
            {members.map((member: any) => (
              <div key={member.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white/80 px-4 py-3">
                <div>
                  <p className="font-semibold text-sm">{member.name}</p>
                  <p className="text-xs text-slate-500">⭐ {member.total_points || 0} pts</p>
                </div>
                <span className="text-sm font-semibold">🔥 {member.streak || 0}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Join button */}
      {!isMember && userId && (
        <div className="rounded-3xl bg-white/80 border border-slate-200 p-6 text-center">
          <button onClick={handleJoin} className="rainbow-cta px-6 py-3 rounded-full font-semibold">
            Join Challenge
          </button>
        </div>
      )}

      {/* Not logged in */}
      {!userId && (
        <div className="rounded-3xl bg-white/80 border border-slate-200 p-6 text-center">
          <p className="text-slate-600 mb-4">Log in to join this challenge and check in daily</p>
          <button onClick={() => router.push("/auth")} className="rainbow-cta px-6 py-3 rounded-full font-semibold">
            Log in / Sign up
          </button>
        </div>
      )}

      {/* Leave button */}
      {userId && isMember && (
        <div className="rounded-3xl bg-white/80 border border-slate-200 p-6 text-center">
          <button onClick={handleLeave} className="px-6 py-3 rounded-full font-semibold border border-red-300 bg-red-50 hover:bg-red-100 transition">
            Leave Challenge
          </button>
        </div>
      )}

    </div>
  );
}