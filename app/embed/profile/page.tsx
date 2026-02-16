"use client";

import Link from "next/link";
import { useUser } from "@/contexts/UserContext";

export default function ProfilePage() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-center p-12">
          <p className="text-slate-500">Loading profile...</p>
        </div>
      </div>
    );
  }

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
          <Link href="/embed/leaderboard">
            <button className="px-4 py-2 rounded-full font-semibold border border-slate-300 bg-white/80 hover:bg-white transition text-sm">
              Leaderboard
            </button>
          </Link>
        </div>
      </div>

      {/* Page Header */}
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500 mb-2">PROFILE</p>
        <h2 className="text-4xl font-display">Your Profile</h2>
      </div>

      {/* Profile Card */}
      <div className="neon-card rounded-3xl p-8 max-w-2xl">
        {user ? (
          <div className="space-y-6">
            <div>
              <label className="text-xs uppercase tracking-wider text-slate-500 mb-2 block">Name</label>
              <p className="text-xl font-semibold">{user.name}</p>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-slate-500 mb-2 block">Email</label>
              <p className="text-lg text-slate-700">{user.email}</p>
            </div>

            <div className="pt-4 border-t border-slate-200">
              <p className="text-sm text-slate-600 mb-4">
                Your account is managed through Wix Members. To update your name, email, or password, 
                please use your Wix account settings.
              </p>
              <a 
                href="https://www.wix.com/my-account" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block px-6 py-3 rounded-full font-semibold border border-slate-300 bg-white hover:bg-slate-50 transition"
              >
                Manage Wix Account →
              </a>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-slate-600 mb-4">You need to be logged in to view your profile.</p>
            <p className="text-sm text-slate-500">
              When viewing this page through your Wix site while logged in, your profile information will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}