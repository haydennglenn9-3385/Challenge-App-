"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  addMessage,
  ensureSeedData,
  getChallengeById,
  getMembers,
  getMessages,
  getStreak,
  incrementStreak,
  ChallengeMember,
  ChallengeMessage,
} from "@/lib/storage";

export default function ChallengeDetailPage() {
  const params = useParams<{ id: string }>();
  const challengeId = typeof params?.id === "string" ? params.id : "";
  const [streak, setStreak] = useState(0);
  const [messageText, setMessageText] = useState("");
  const [messages, setMessages] = useState<ChallengeMessage[]>([]);
  const [members, setMembers] = useState<ChallengeMember[]>([]);

  const challenge = useMemo(() => getChallengeById(challengeId), [challengeId]);

  useEffect(() => {
    ensureSeedData();
    setStreak(getStreak(challengeId));
    setMessages(getMessages(challengeId));
    setMembers(getMembers(challengeId));
  }, [challengeId]);

  if (!challenge) {
    return (
      <div className="neon-card rounded-3xl p-8">
        <p className="text-slate-600">Challenge not found.</p>
      </div>
    );
  }

  const progress = challenge.duration > 0 ? streak / challenge.duration : 0;

  const handleCheckIn = () => {
    incrementStreak(challengeId);
    setStreak(getStreak(challengeId));
  };

  const handleSendMessage = (event: React.FormEvent) => {
    event.preventDefault();
    if (!messageText.trim()) return;
    addMessage({ challengeId, sender: "You", text: messageText.trim() });
    setMessages(getMessages(challengeId));
    setMessageText("");
  };

  return (
    <div className="space-y-8">
      {/* Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <Link href="/embed/challenges">
          <button className="px-4 py-2 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition text-sm">
            ← Back to Challenges
          </button>
        </Link>
        
        <div className="flex gap-3">
          <Link href="/">
            <button className="px-4 py-2 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition text-sm">
              Home
            </button>
          </Link>
          <Link href="/embed/profile">
            <button className="px-4 py-2 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition text-sm">
              Profile
            </button>
          </Link>
        </div>
      </div>

      {/* Challenge Info Card */}
      <div className="neon-card rounded-3xl p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500 mb-2">CHALLENGE</p>
        <h2 className="text-3xl font-display mb-2">{challenge.title}</h2>
        {challenge.description && <p className="text-slate-600 mt-2">{challenge.description}</p>}

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Current streak</p>
            <p className="text-lg font-semibold">{streak} days</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Progress</p>
            <p className="text-lg font-semibold">{Math.round(progress * 100)}%</p>
          </div>
          <button
            onClick={handleCheckIn}
            className="rainbow-cta rounded-full px-5 py-3 font-semibold hover:shadow-xl transition-shadow"
          >
            Check in today
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

          <div className="mt-4 space-y-3 max-h-[280px] overflow-y-auto pr-2">
            {messages.length === 0 && (
              <p className="text-sm text-slate-500">No messages yet. Start the hype.</p>
            )}
            {messages.map((message) => (
              <div key={message.id} className="rounded-2xl border border-slate-100 bg-white/80 p-3">
                <p className="text-sm font-semibold">{message.sender}</p>
                <p className="text-sm text-slate-600">{message.text}</p>
              </div>
            ))}
          </div>

          <form onSubmit={handleSendMessage} className="mt-4 flex gap-2">
            <input
              type="text"
              value={messageText}
              onChange={(event) => setMessageText(event.target.value)}
              placeholder="Cheer them on..."
              className="flex-1 rounded-full border border-slate-200 bg-white/80 px-4 py-2"
            />
            <button
              type="submit"
              className="rainbow-cta rounded-full px-4 py-2 font-semibold"
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
                  <p className="text-xs text-slate-500">Joined {new Date(member.joinedAt).toLocaleDateString()}</p>
                </div>
                <span className="text-sm font-semibold">{member.streak} day streak</span>
              </div>
            ))}
            {members.length === 0 && (
              <p className="text-sm text-slate-500">Invite your first members.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}