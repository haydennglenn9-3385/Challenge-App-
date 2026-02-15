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
          <button className="rainbow-cta rounded-full px-5 py-2 font-semibold text-sm hover:shadow-xl transition-shadow">
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

      <div className="grid gap-8 lg:grid-cols-2 items-start">
        {/* Left: Form */}
        <div className="space-y-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500 mb-2">CREATE</p>
            <h2 className="text-4xl font-display mb-2">Launch a Challenge</h2>
            <p className="text-slate-600">Start a fresh streak and invite your crew.</p>
          </div>

          <form onSubmit={handleSubmit} className="neon-card rounded-3xl p-8 space-y-5">
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
              className="w-full rainbow-cta rounded-full px-6 py-3 font-semibold hover:shadow-xl transition-shadow disabled:opacity-50"
            >
              {submitting ? "Launching..." : "Launch Challenge"}
            </button>
          </form>
        </div>

        {/* Right: Tips */}
        <div className="space-y-6">
          <div className="neon-card rounded-3xl p-8">
            <h3 className="text-xl font-semibold mb-4">💡 Tips for success</h3>
            <div className="space-y-3 text-slate-700">
              <p className="text-sm leading-relaxed">
                <strong>Keep it simple:</strong> Choose one specific action you can do daily, like "10 minutes of stretching" or "drink 8 glasses of water."
              </p>
              <p className="text-sm leading-relaxed">
                <strong>Set realistic duration:</strong> Start with 21 days - long enough to build a habit, short enough to stay motivated!
              </p>
              <p className="text-sm leading-relaxed">
                <strong>Invite your crew:</strong> Having friends join increases your success rate by 65%. Accountability works!
              </p>
            </div>
          </div>

          <div className="neon-card rounded-3xl p-8 space-y-4">
            <h3 className="text-xl font-semibold mb-4">✨ After you launch</h3>
            <div className="space-y-3 text-slate-700">
              <div className="flex gap-3">
                <span className="text-2xl">1️⃣</span>
                <div>
                  <p className="font-semibold">Share your code</p>
                  <p className="text-sm text-slate-600">Invite friends with your unique challenge code</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="text-2xl">2️⃣</span>
                <div>
                  <p className="font-semibold">Check in daily</p>
                  <p className="text-sm text-slate-600">Build your streak one day at a time</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="text-2xl">3️⃣</span>
                <div>
                  <p className="font-semibold">Use the chat</p>
                  <p className="text-sm text-slate-600">Encourage each other and celebrate wins</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}