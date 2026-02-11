"use client";

import { useEffect, useState } from "react";
import {
  addMessage,
  ensureSeedData,
  getChallenges,
  getMessages,
  Challenge,
  ChallengeMessage,
} from "@/lib/storage";

export default function MessagesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChallengeMessage[]>([]);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    ensureSeedData();
    const list = getChallenges();
    setChallenges(list);
    if (list.length > 0) {
      setActiveId(list[0].id);
      setMessages(getMessages(list[0].id));
    }
  }, []);

  const handleSelect = (id: string) => {
    setActiveId(id);
    setMessages(getMessages(id));
  };

  const handleSend = (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeId || !draft.trim()) return;
    addMessage({ challengeId: activeId, sender: "You", text: draft.trim() });
    setMessages(getMessages(activeId));
    setDraft("");
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Messages</p>
        <h2 className="text-3xl font-display">Challenge Chat</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.45fr_0.55fr]">
        <div className="neon-card rounded-3xl p-5 space-y-3">
          <h3 className="text-lg font-semibold">Your channels</h3>
          {challenges.map((challenge) => (
            <button
              key={challenge.id}
              onClick={() => handleSelect(challenge.id)}
              className={`w-full text-left rounded-2xl px-4 py-3 border transition ${
                activeId === challenge.id ? "border-transparent" : "border-slate-100"
              }`}
              style={activeId === challenge.id ? { background: "var(--neon-yellow)" } : { background: "white" }}
            >
              <p className="font-semibold">{challenge.title}</p>
              <p className="text-xs text-slate-500">Stay in sync</p>
            </button>
          ))}
          {challenges.length === 0 && (
            <p className="text-sm text-slate-500">Create a challenge to start chatting.</p>
          )}
        </div>

        <div className="neon-card rounded-3xl p-6 flex flex-col gap-4">
          <div className="flex-1 space-y-3 overflow-y-auto max-h-[320px] pr-2">
            {messages.map((message) => (
              <div key={message.id} className="rounded-2xl border border-slate-100 bg-white/80 p-3">
                <p className="text-sm font-semibold">{message.sender}</p>
                <p className="text-sm text-slate-600">{message.text}</p>
              </div>
            ))}
            {messages.length === 0 && (
              <p className="text-sm text-slate-500">Drop the first hype message.</p>
            )}
          </div>

          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Type a message"
              className="flex-1 rounded-full border border-slate-200 bg-white/80 px-4 py-2"
            />
            <button
              type="submit"
              className="rounded-full px-4 py-2 font-semibold rainbow-cta"
            >
              Send
            </button>
          </form>
        </div>
      </div>
     </div>
   );
 }
