"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "WIX_USER") {
        setUser(event.data.user);
        setChecked(true);
      }
    }

    window.addEventListener("message", handleMessage);

    // Ask Wix for the user on load
    window.parent.postMessage({ type: "REQUEST_WIX_USER" }, "*");

    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // If we haven't received anything yet, show loading
  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="neon-card p-6 rounded-3xl text-center">
          <p className="text-lg font-display">Loading your dashboard…</p>
          <p className="text-sm text-slate-500 mt-2">Just a moment.</p>
        </div>
      </div>
    );
  }

  // If Wix explicitly says "no user", redirect to login
  if (checked && !user) {
    router.push("/login");
    return null;
  }

  // If user exists, show dashboard
  return (
    <div className="min-h-screen px-6 py-12">
      <div className="max-w-3xl mx-auto neon-card rounded-3xl p-8 space-y-6">
        <h1 className="text-3xl font-display">Welcome back, {user.profile?.nickname || "friend"}!</h1>

        <p className="text-slate-700">
          Your challenges will appear here once we connect your Wix Member ID to your challenge data.
        </p>

        <div className="p-4 bg-white rounded-2xl shadow">
          <p className="font-semibold">Your Wix Member ID:</p>
          <p className="text-sm text-slate-600 break-all mt-1">{user._id}</p>
        </div>
      </div>
    </div>
  );
}
