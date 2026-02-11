"use client";

import { useEffect, useState } from "react";
import {
  addInvites,
  addToInviteAllowlist,
  ensureSeedData,
  getChallenges,
  getInviteAllowlist,
  getInvites,
  Challenge,
  ChallengeInvite,
} from "@/lib/storage";

export default function InvitesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [invites, setInvites] = useState<ChallengeInvite[]>([]);
  const [allowlist, setAllowlist] = useState<string[]>([]);
  const [emails, setEmails] = useState("");
  const [selectedChallenge, setSelectedChallenge] = useState<string | null>(null);

  useEffect(() => {
    ensureSeedData();
    const list = getChallenges();
    setChallenges(list);
    setSelectedChallenge(list[0]?.id || null);
    setInvites(getInvites());
    setAllowlist(getInviteAllowlist());
  }, []);

  const handleInvite = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedChallenge) return;
    const parsed = emails
      .split(",")
      .map((email) => email.trim())
      .filter(Boolean);
    if (parsed.length === 0) return;

    addInvites(selectedChallenge, parsed);
    addToInviteAllowlist(parsed);
    setInvites(getInvites());
    setAllowlist(getInviteAllowlist());
    setEmails("");
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Invites</p>
        <h2 className="text-3xl font-display">Invite the Crew</h2>
        <p className="text-slate-600">Keep it invite-only with a shared list of members.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.55fr_0.45fr]">
        <form onSubmit={handleInvite} className="neon-card rounded-3xl p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-600">Challenge</label>
            <select
              value={selectedChallenge || ""}
              onChange={(event) => setSelectedChallenge(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3"
            >
              {challenges.map((challenge) => (
                <option key={challenge.id} value={challenge.id}>
                  {challenge.title}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-600">Invite emails</label>
            <input
              type="text"
              value={emails}
              onChange={(event) => setEmails(event.target.value)}
              placeholder="alex@club.com, jamie@club.com"
              className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-full px-5 py-3 font-semibold rainbow-cta"
          >
            Send invites
          </button>
        </form>

        <div className="neon-card rounded-3xl p-6">
          <h3 className="text-lg font-semibold">Invite-only list</h3>
          <div className="mt-4 space-y-2">
            {allowlist.map((email) => (
              <div key={email} className="rounded-2xl border border-slate-100 bg-white/80 px-3 py-2 text-sm">
                {email}
              </div>
            ))}
            {allowlist.length === 0 && (
              <p className="text-sm text-slate-500">No allowed emails yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="neon-card rounded-3xl p-6">
        <h3 className="text-lg font-semibold">Pending invites</h3>
        <div className="mt-4 space-y-2">
          {invites.map((invite) => (
            <div key={invite.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white/80 px-4 py-3">
              <div>
                <p className="font-semibold">{invite.email}</p>
                <p className="text-xs text-slate-500">Challenge: {invite.challengeId}</p>
              </div>
              <span className="text-xs font-semibold uppercase text-slate-400">{invite.status}</span>
            </div>
          ))}
          {invites.length === 0 && (
            <p className="text-sm text-slate-500">No invites yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
