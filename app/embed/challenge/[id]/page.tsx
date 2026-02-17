"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getChallengeById,
  getTeamMembers,
  getMessages,
  sendMessage,
  recordCheckIn,
  getUserStreak,
  Challenge,
  User,
  Message,
} from "@/lib/storage";
import { useUser } from "@/lib/UserContext";

export default function ChallengeDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const challengeId = typeof params?.id === "string" ? params.id : "";
  const { user: wixUser, getUserParams } = useUser();

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState("");

  const navigate = (path: string) => {
    router.push(path + getUserParams());
  };

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
        const userResponse = await fetch(`/api/user/get?wixId=${wixUser.userId}`);
        const userData = await userResponse.json();
        if (userData && userData.id) {
          setUserId(userData.id);
          const userStreak = await getUserStreak(userData.id, challengeId);
          setStreak(userStreak);

          // Check if already checked in today
          const today = new Date().toISOString().split('T')[0];
          const { supabase } = await import('@/lib/supabase');
          const { data: todayLog } = await supabase
            .from('daily_logs')
            .select('id')
            .eq('user_id', userData.id)
            .eq('challenge_id', challengeId)
            .eq('date', today)
            .single();
          
          setCheckedInToday(!!todayLog);
        }
      }

      setLoading(false);
    }

    loadData();
  }, [challengeId, wixUser]);

  const handleCheckIn = async () => {
    if (!userId || !challengeId) return;
    if (checkedInToday) {
      setSuccessMessage("Already checked in today! Come back tomorrow 💪");
      setTimeout(() => setSuccessMessage(""), 3000);
      return;
    }

    setCheckingIn(true);
    const success = await recordCheckIn(userId, challengeId);
    
    if (success) {
      const newStreak = await getUserStreak(userId, challengeId);
      setStreak(newStreak);
      setCheckedInToday(true);
      setSuccessMessage(`🔥 Checked in! You're on a ${newStreak} day streak!`);
      setTimeout(() => setSuccessMessage(""), 4000);
    }
    setCheckingIn(false);
  };

  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!messageText.trim() || !userId || !challenge) return;

    const success = await sendMessage(challenge.team_id, userId, messageText.trim());
    if (success) {
      const updatedMessages = await getMessages(challenge.team_id);
      setMessages(updatedMessages);
      setMessageText("");
    }
  };

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
        <p className="text-slate-600">Challenge not found.</p>
      </div>
    );
  }

  const startDate = new Date(challenge.start_date);
  const endDate = new Date(challenge.end_date);
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const progress = totalDays > 0 ? Math.round((streak / totalDays) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Navigation Header */}
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
            onClick={() => navigate("/embed/profile")}
            className="px-4 py-2 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition text-sm"
          >
            Profile
          </button>
        </div>
      </div>

      {/* Success message */}
      {successMessage && (
        <div className="neon-card rounded-2xl p-4 bg-green-50 border border-green-200">
          <p className="text-sm font-semibold text-green-800">{successMessage}</p>
        </div>
      )}

      {/* Challenge Info */}
      <div className="neon-card rounded-3xl p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500 mb-2">CHALLENGE</p>
        <h2 className="text-3xl font-display mb-4">{challenge.name}</h2>

        <div className="flex items-center gap-2 mb-6">
          <span className="neon-chip rounded-full px-3 py-1 text-xs font-semibold">
            Code: {challenge.join_code}
          </span>
          <span className="text-sm text-slate-500">• {totalDays} days total</span>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Current streak</p>
            <p className="text-lg font-semibold">{streak} days</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Progress</p>
            <p className="text-lg font-semibold">{progress}%</p>
          </div>
          <button
            onClick={handleCheckIn}
            disabled={checkingIn || checkedInToday || !userId}
            className={`rounded-full px-5 py-3 font-semibold transition-shadow ${
              checkedInToday 
                ? "bg-green-100 text-green-700 border border-green-300 cursor-default"
                : "rainbow-cta hover:shadow-xl"
            } disabled:opacity-60`}
          >
            {checkingIn ? "Checking in..." : checkedInToday ? "✅ Checked in today!" : "Check in today"}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Live Chat */}
        <div className="neon-card rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">Live chat</h3>
            <span className="neon-chip rounded-full px-3 py-1 text-xs font-semibold">Streak squad</span>
          </div>

          <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
            {messages.length === 0 && (
              <p className="text-sm text-slate-500">No messages yet. Start the hype! 🎉</p>
            )}
            {messages.map((message) => (
              <div key={message.id} className="rounded-2xl border border-slate-100 bg-white/80 p-3">
                <p className="text-sm font-semibold">{message.author?.name || 'Unknown'}</p>
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
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white/80 px-4 py-3">
                <div>
                  <p className="font-semibold">{member.name}</p>
                  <p className="text-xs text-slate-500">{member.total_points || 0} pts</p>
                </div>
                <span className="text-sm font-semibold text-slate-700">{member.streak || 0} day streak</span>
              </div>
            ))}
            {members.length === 0 && (
              <p className="text-sm text-slate-500">Invite members with code: <strong>{challenge.join_code}</strong></p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}