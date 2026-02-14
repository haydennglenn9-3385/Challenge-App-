"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addInvites, addToInviteAllowlist, createChallenge, ensureSeedData } from "@/lib/storage";

export default function NewChallengePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(21);
  const [description, setDescription] = useState("");
  const [inviteEmails, setInviteEmails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    ensureSeedData();

    const challenge = createChallenge({ title, duration, description });
    const emails = inviteEmails
      .split(",")
      .map((email) => email.trim())
      .filter(Boolean);

    if (emails.length > 0) {
      addInvites(challenge.id, emails);
      addToInviteAllowlist(emails);
    }

    setSubmitting(false);
    router.push(`/embed/challenge/${challenge.id}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Create</p>
        <h2 className="text-3xl font-display">Launch a Challenge</h2>
        <p className="text-slate-600">Start a fresh streak and invite your crew.</p>
      </div>

      <form onSubmit={handleSubmit} className="neon-card rounded-3xl p-6 space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-600">Challenge name</label>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Morning Mobility"
            className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3"
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-600">Duration (days)</label>
            <input
              type="number"
              min={7}
              value={duration}
              onChange={(event) => setDuration(Number(event.target.value))}
              className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-600">Invite emails</label>
            <input
              type="text"
              value={inviteEmails}
              onChange={(event) => setInviteEmails(event.target.value)}
              placeholder="alex@club.com, jamie@club.com"
              className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-600">Focus</label>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Describe the daily win you want to track."
            className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 min-h-[120px]"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full px-5 py-3 font-semibold rainbow-cta"
        >
          {submitting ? "Launching..." : "Launch Challenge"}
        </button>
      </form>
    </div>
  );
}