"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import {
  getChallengeById,
  getTeamMembers,
  getMessages,
  sendMessage,
  Challenge,
  User,
  Message,
} from "@/lib/storage";

import { useUser } from "@/lib/UserContext";
import { supabase } from "@/lib/supabase";

// Exercise schedule by day of week
const EXERCISES: Record<number, { name: string; emoji: string }> = {
  0: { name: "Jumping Jacks", emoji: "⭐" },
  1: { name: "Lunges", emoji: "🦵" },
  2: { name: "Push-ups", emoji: "💪" },
  3: { name: "Glute Bridges", emoji: "🍑" },
  4: { name: "Crunches", emoji: "🔥" },
  5: { name: "Squats", emoji: "🏋️" },
  6: { name: "Bird Dogs", emoji: "🐦" },
};

const CHALLENGE_START = new Date("2026-01-04");
const BASE_REPS = 5;
const REPS_INCREMENT = 5;
const BASE_CARDIO = 5;
const CARDIO_INCREMENT = 5;

function getCurrentWeek(): number {
  const now = new Date();
  const diffMs = now.getTime() - CHALLENGE_START.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 7) + 1;
}

function getCurrentReps(): number {
  const week = getCurrentWeek();
  return BASE_REPS + (week - 1) * REPS_INCREMENT;
}

function getCurrentCardio(): number {
  const week = getCurrentWeek();
  return BASE_CARDIO + (week - 1) * CARDIO_INCREMENT;
}

// Compute streak
function computeChallengeStreak(logs: any[]) {
  if (!logs || logs.length === 0) return 0;
  let streak = 1;

  for (let i = logs.length - 1; i > 0; i--) {
    const today = new Date(logs[i].date);
    const yesterday = new Date(logs[i - 1].date);
    const diff =
      (today.getTime() - yesterday.getTime()) / (1000 * 60 * 60 * 24);

    if (diff === 1) streak++;
    else break;
  }

  return streak;
}

export default function ChallengeDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const challengeId = typeof params?.id === "string" ? params.id : "";

  const { user: wixUser, getUserParams } = useUser();

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");

  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [todayPoints, setTodayPoints] = useState(0);

  const [userId, setUserId] = useState<string>("");
  const [userTeam, setUserTeam] = useState<string>("");

  const [successMessage, setSuccessMessage] = useState("");
  const [userTotalPoints, setUserTotalPoints] = useState(0);

  const [isMember, setIsMember] = useState(false);
  const [challengeLogs, setChallengeLogs] = useState<any[]>([]);
  const [challengeStreak, setChallengeStreak] = useState(0);

  const [cardioChecked, setCardioChecked] = useState(false);

  const today = new Date();
  const dayOfWeek = today.getDay();
  const todayExercise = EXERCISES[dayOfWeek];

  const currentWeek = getCurrentWeek();
  const currentReps = getCurrentReps();
  const currentCardio = getCurrentCardio();

  const navigate = (path: string) => router.push(path + getUserParams());

  // LOAD DATA
  useEffect(() => {
    async function loadData() {
      if (!challengeId) return;

      const challengeData = await getChallengeById(challengeId);
      setChallenge(challengeData);

      if (challengeData) {
        const [teamMembersData, messagesData] = await Promise.all([
          getTeamMembers(challengeData.team_id),
          getMessages(challengeData.team_id),
        ]);

        setMembers(teamMembersData);
        setMessages(messagesData);
      }

      if (wixUser) {
        const userResponse = await fetch(
          `/api/user/get?wixId=${wixUser.userId}`
        );
        const userData = await userResponse.json();

        if (userData?.id) {
          setUserId(userData.id);

          const { data: memberCheck } = await supabase
            .from("challenge_members")
            .select("id")
            .eq("challenge_id", challengeId)
            .eq("user_id", userData.id)
            .maybeSingle();

          const member = !!memberCheck;
          setIsMember(member);

          if (member) {
            setUserTotalPoints(userData.total_points || 0);

            const { data: logsData } = await supabase
              .from("daily_logs")
              .select("date")
              .eq("user_id", userData.id)
              .eq("challenge_id", challengeId)
              .order("date", { ascending: true });

            setChallengeLogs(logsData || []);
            setChallengeStreak(computeChallengeStreak(logsData || []));

            const todayStr = today.toISOString().split("T")[0];
            const { data: todayLog } = await supabase
              .from("daily_logs")
              .select("*")
              .eq("user_id", userData.id)
              .eq("challenge_id", challengeId)
              .eq("date", todayStr)
              .maybeSingle();

            if (todayLog) {
              setCheckedInToday(true);
              setTodayPoints(todayLog.points_earned);
            }

            const { data: teamMember } = await supabase
              .from("team_members")
              .select("team_id, teams(name)")
              .eq("user_id", userData.id)
              .maybeSingle();

            if (teamMember?.teams) {
              setUserTeam((teamMember.teams as any).name);
            }
          }
        }
      }

      setLoading(false);
    }

    loadData();
  }, [challengeId, wixUser]);

  // CHECK-IN
  const handleCheckIn = async (completionLevel: "50" | "100") => {
    if (!userId || !challengeId || checkedInToday) return;

    setCheckingIn(true);

    const points = completionLevel === "100" ? 2 : 1;
    const todayStr = today.toISOString().split("T")[0];

    const { error } = await supabase.from("daily_logs").insert({
      user_id: userId,
      challenge_id: challengeId,
      date: todayStr,
      exercise: todayExercise.name,
      completion_level: completionLevel,
      reps_completed:
        completionLevel === "100"
          ? currentReps
          : Math.ceil(currentReps * 0.5),
      reps_target: currentReps,
      points_earned: points,
    });

    if (!error) {
      const { data: userData } = await supabase
        .from("users")
        .select("total_points")
        .eq("id", userId)
        .single();

      const newPoints = (userData?.total_points || 0) + points;

      await supabase
        .from("users")
        .update({ total_points: newPoints })
        .eq("id", userId);

      setCheckedInToday(true);
      setTodayPoints(points);
      setUserTotalPoints(newPoints);

      setSuccessMessage(
        completionLevel === "100"
          ? `🔥 100%+ done! You earned 2 points!`
          : `✅ 50%+ done! You earned 1 point!`
      );

      setTimeout(() => setSuccessMessage(""), 5000);

      const { data: logsData } = await supabase
        .from("daily_logs")
        .select("date")
        .eq("user_id", userId)
        .eq("challenge_id", challengeId)
        .order("date", { ascending: true });

      setChallengeLogs(logsData || []);
      setChallengeStreak(computeChallengeStreak(logsData || []));
    }

    setCheckingIn(false);
  };

  // SEND MESSAGE
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!messageText.trim() || !userId || !challenge) return;

    const success = await sendMessage(
      challenge.team_id,
      userId,
      messageText.trim()
    );

    if (success) {
      const updated = await getMessages(challenge.team_id);
      setMessages(updated);
      setMessageText("");
    }
  };

  // RENDER
if (loading) {
  return (
    <div className="flex items-center justify-center p-12">
      <p className="text-slate-500">Loading challenge...</p>
    </div>
  );
}

if (!challenge) {
  return (
    <div className="neon-card rounded-3xl p-8">
      <p>Challenge not found.</p>
    </div>
  );
}

return (
  <div className="space-y-6">

    {/* Nav */}
    <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
      <button
        onClick={() => navigate("/embed/challenges")}
        className="px-4 py-2 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition text-sm"
      >
        ← Back to Challenges
      </button>

      <div className="flex gap-3">
        <button
          onClick={() => router.push("/")}
          className="px-4 py-2 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition text-sm"
        >
          Home
        </button>

        <button
          onClick={() => navigate("/embed/leaderboard")}
          className="px-4 py-2 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition text-sm"
        >
          Leaderboard
        </button>

        <button
          onClick={() => navigate("/embed/dashboard")}
          className="px-4 py-2 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition text-sm"
        >
          Dashboard
        </button>

        <button
          onClick={() => navigate(`/embed/challenge/${challengeId}/edit`)}
          className="px-4 py-2 rounded-full font-semibold border border-blue-300 bg-blue-50 hover:bg-blue-100 transition text-sm"
        >
          Edit
        </button>
      </div>
    </div>

    {/* Success Message */}
    {successMessage && (
      <div className="neon-card rounded-2xl p-4 border border-green-200 bg-green-50">
        <p className="text-sm font-semibold text-green-800">{successMessage}</p>
      </div>
    )}

    {/* Challenge Header */}
    <div className="neon-card rounded-3xl p-6">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-500 mb-1">CHALLENGE</p>
      <h2 className="text-3xl font-display mb-1">{challenge.name}</h2>

      <div className="flex items-center gap-3 mt-2 flex-wrap">
        <span className="neon-chip rounded-full px-3 py-1 text-xs font-semibold">
          Code: {challenge.join_code}
        </span>
        {userTeam && (
          <span className="rounded-full px-3 py-1 text-xs font-semibold bg-slate-100 text-slate-700">
            {userTeam}
          </span>
        )}
        <span className="text-sm text-slate-500">Week {currentWeek}</span>
      </div>

      {isMember && (
        <div className="grid grid-cols-3 gap-3 mt-5">
          <div className="rounded-2xl border border-slate-200 bg-white/80 px-3 py-3 text-center">
            <p className="text-2xl font-bold">🔥 {challengeStreak}</p>
            <p className="text-xs text-slate-500 mt-1">Day Streak</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/80 px-3 py-3 text-center">
            <p className="text-2xl font-bold">⭐ {userTotalPoints}</p>
            <p className="text-xs text-slate-500 mt-1">Total Points</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/80 px-3 py-3 text-center">
            <p className="text-2xl font-bold">{currentReps}</p>
            <p className="text-xs text-slate-500 mt-1">Reps Target</p>
          </div>
        </div>
      )}
    </div>

    {/* Today's Check-in */}
    <div className="neon-card rounded-3xl p-6">
      {!isMember ? (
        <div className="text-center py-8">
          <h3 className="text-2xl font-semibold mb-4">Join This Challenge</h3>
          <p className="text-slate-600 mb-6">Join to start tracking your progress!</p>
          <button
            onClick={async () => {
              if (!userId) {
                alert("Please log in to join");
                return;
              }
              const { joinChallenge } = await import("@/lib/storage");
              const success = await joinChallenge(challenge.join_code, userId);
              if (success) window.location.reload();
              else alert("Failed to join challenge");
            }}
            className="rainbow-cta px-6 py-3 rounded-full font-semibold"
          >
            Join Challenge
          </button>
        </div>
      ) : (
        <div> {/* Wrap all check-in content inside one div */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500 mb-1">TODAY'S EXERCISE</p>
              <h3 className="text-2xl font-semibold">{todayExercise.emoji} {todayExercise.name}</h3>
              <p className="text-sm text-slate-600 mt-1">
                Target: <strong>{currentReps} reps</strong> • 50% = {Math.ceil(currentReps * 0.5)} reps
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
              <p className="text-amber-700 text-sm">Log in to check in</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleCheckIn("50")}
                disabled={checkingIn}
                className="rounded-2xl border-2 border-slate-200 bg-white hover:border-slate-400 hover:shadow-md transition-all p-4 text-left disabled:opacity-50"
              >
                <p className="text-2xl mb-1">🌗</p>
                <p className="font-bold text-lg">50%+</p>
                <p className="text-sm text-slate-600">{Math.ceil(currentReps * 0.5)}+ reps</p>
                <p className="text-xs font-semibold text-slate-500 mt-2">+1 point</p>
              </button>

              <button
                onClick={() => handleCheckIn("100")}
                disabled={checkingIn}
                className="rainbow-cta rounded-2xl p-4 text-left hover:shadow-xl transition-all disabled:opacity-50"
              >
                <p className="text-2xl mb-1">🌕</p>
                <p className="font-bold text-lg">100%+</p>
                <p className="text-sm">{currentReps}+ reps</p>
                <p className="text-xs font-semibold mt-2">+2 points</p>
              </button>
            </div>
          )}

          {/* Weekly Cardio */}
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white/80 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">🏃 Weekly Cardio Goal</p>
                <p className="text-sm text-slate-600">{currentCardio} minutes this week</p>
              </div>
              <button
                onClick={() => setCardioChecked(!cardioChecked)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                  cardioChecked ? "bg-green-100 text-green-700 border border-green-300" : "border border-slate-300 bg-white hover:bg-slate-50"
                }`}
              >
                {cardioChecked ? "✅ Done!" : "Mark done"}
              </button>
            </div>
          </div>
        </div> // END check-in wrapper div
      )}
    </div> // END Today's Check-in

    {/* Main Grid */}
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      {/* Live Chat */}
      <div className="neon-card rounded-3xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">Live chat</h3>
          <span className="neon-chip rounded-full px-3 py-1 text-xs font-semibold">Streak squad</span>
        </div>

        <div className="space-y-3 max-h-[240px] overflow-y-auto pr-1">
          {messages.length === 0 && <p className="text-sm text-slate-500">No messages yet. Start the hype! 🎉</p>}
          {messages.map((message) => (
            <div key={message.id} className="rounded-2xl border border-slate-100 bg-white/80 p-3">
              <p className="text-sm font-semibold">{message.author?.name || "Unknown"}</p>
              <p className="text-sm text-slate-600">{message.text}</p>
            </div>
          ))}
        </div>

        <form onSubmit={handleSendMessage} className="mt-4 flex gap-2">
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder={userId ? "Cheer them on..." : "Log in to chat"}
            className="flex-1 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            disabled={!userId}
          />
          <button
            type="submit"
            disabled={!userId || !messageText.trim()}
            className="rainbow-cta rounded-full px-4 py-2 font-semibold text-sm disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>

      {/* Challenge Crew */}
      <div className="neon-card rounded-3xl p-6">
        <h3 className="text-xl font-semibold mb-4">Challenge crew</h3>
        <div className="space-y-3">
          {members.length === 0 && <p className="text-sm text-slate-500">Invite members with code: <strong>{challenge.join_code}</strong></p>}
          {members.map((member) => (
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
    </div> {/* END Main Grid */}

    {/* Leave Challenge Button */}
    {wixUser && userId && isMember && (
      <div className="neon-card rounded-3xl p-6 text-center">
        <button
          onClick={async () => {
            const { leaveChallenge } = await import("@/lib/storage");
            const success = await leaveChallenge(challengeId, userId);
            if (success) window.location.reload();
            else alert("Failed to leave challenge");
          }}
          className="px-6 py-3 rounded-full font-semibold border border-red-300 bg-red-50 hover:bg-red-100 transition"
        >
          Leave Challenge
        </button>
      </div>
    )}

  </div> // END page wrapper
);
}