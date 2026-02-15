"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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

      {/* Page Header */}
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500 mb-2">CREATE</p>
        <h2 className="text-4xl font-display mb-2">Launch a Challenge</h2>
        <p className="text-slate-600">Start a fresh streak and invite your crew.</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="neon-card rounded-3xl p-6 space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Challenge name</label>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Morning Mobility"
            className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-300"
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Duration (days)</label>
            <input
              type="number"
              min={7}
              value={duration}
              onChange={(event) => setDuration(Number(event.target.value))}
              className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-300"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Invite emails</label>
            <input
              type="text"
              value={inviteEmails}
              onChange={(event) => setInviteEmails(event.target.value)}
              placeholder="alex@club.com, jamie@club.com"
              className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">Focus</label>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Describe the daily win you want to track."
            className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rainbow-cta rounded-full px-5 py-3 font-semibold hover:shadow-xl transition-shadow disabled:opacity-50"
        >
          {submitting ? "Launching..." : "Launch Challenge"}
        </button>
      </form>
    </div>
  );
}