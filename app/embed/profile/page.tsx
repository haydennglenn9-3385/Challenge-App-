"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function ProfilePage() {
  const [wixId, setWixId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  // Request user info from Wix when page loads
  useEffect(() => {
    window.parent.postMessage("REQUEST_USER_INFO", "*");
  }, []);

  // Receive Wix user info
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "USER_INFO") {
        const user = event.data.user;
        setWixId(user.id);
        setName(user.name || "Guest");
        setEmail(user.email || "");
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

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
        <div className="space-y-6">
          <div>
            <label className="text-xs uppercase tracking-wider text-slate-500 mb-2 block">Name</label>
            <p className="text-xl font-semibold">{name || "Loading..."}</p>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-slate-500 mb-2 block">Email</label>
            <p className="text-lg text-slate-700">{email || "Loading..."}</p>
          </div>

          <div className="pt-4 border-t border-slate-200">
            <p className="text-sm text-slate-600 mb-4">
              Your account is managed through Wix. To update your name, email, or password, 
              please use your Wix account settings.
            </p>
            <button
              onClick={() => window.parent.postMessage({ type: "OPEN_WIX_ACCOUNT" }, "*")}
              className="px-6 py-3 rounded-full font-semibold border border-slate-300 bg-white hover:bg-slate-50 transition"
            >
              Manage Wix Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}