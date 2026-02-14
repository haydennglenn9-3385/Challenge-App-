"use client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function DashboardContent() {
  const searchParams = useSearchParams();

  // Wix → iframe params
  const wixId = searchParams.get("userId");
  const wixEmail = searchParams.get("email");
  const wixName = searchParams.get("name");

  // Actual Supabase profile
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const rainbowButton =
    "px-4 py-2 rounded-xl text-black font-semibold shadow-md bg-[linear-gradient(90deg,#FD80AB,#FFCE71,#A4FC95,#65EBE4,#719FFF)]";

  const whiteButton =
    "px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-800 font-semibold";

  // ⭐ Sync user to Supabase (create if missing)
  useEffect(() => {
    if (!wixId || !wixEmail) {
      console.log("Missing wixId or email — skipping sync");
      return;
    }

    async function syncUser() {
      console.log("SYNCING USER:", { wixId, wixEmail, wixName });

      await fetch("/api/user/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wixId,
          email: wixEmail,
          name: wixName || "friend",
        }),
      });
    }

    syncUser();
  }, [wixId, wixEmail, wixName]);

  // ⭐ Load REAL profile from Supabase
  useEffect(() => {
    if (!wixId) return;

    async function loadProfile() {
      console.log("LOADING PROFILE FOR wixId:", wixId);

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("wix_id", wixId)
        .single();

      if (error) {
        console.error("Failed to load profile:", error);
      } else {
        console.log("PROFILE LOADED:", data);
        setProfile(data);
      }

      setLoading(false);
    }

    loadProfile();
  }, [wixId]);

  if (loading) {
    return (
      <div className="p-10 text-center">
        Loading your dashboard…
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 py-16 flex flex-col items-center bg-[linear-gradient(to_bottom_right,#BAE3EF,#DFF58C,#FDD3EC,#FFE4B6)]">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">

        {/* PROFILE */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 mb-3">Your Profile</h2>

          <p className="text-slate-700">
            <strong>Name:</strong> {profile?.name || "friend"}
          </p>

          <p className="text-slate-700">
            <strong>Email:</strong> {profile?.email || "unknown"}
          </p>

          <p className="text-slate-700">
            <strong>Password:</strong> ••••••••
          </p>

          <div className="flex flex-col gap-3 mt-4 w-fit">
            <button
              onClick={() => (window.location.href = "/profile")}
              className={whiteButton}
            >
              Update Profile
            </button>

            <button className={rainbowButton}>
              Log Out
            </button>
          </div>
        </div>

        {/* STREAK */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200 flex flex-col items-center">
          <div
            className="text-5xl mb-2"
            style={{
              background:
                "linear-gradient(90deg,#FD80AB,#FFCE71,#A4FC95,#65EBE4,#719FFF)",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            🔥
          </div>

          <h2 className="text-xl font-bold text-slate-800 mb-2">
            {profile?.streak || 0}-Day Streak
          </h2>

          <div className="flex justify-between w-full mt-3">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <div key={i} className="flex flex-col items-center">
                <span className="text-slate-600">{d}</span>
                <div
                  className={`w-3 h-3 mt-1 rounded-full ${
                    i < (profile?.streak || 0)
                      ? "bg-black"
                      : "bg-slate-300"
                  }`}
                ></div>
              </div>
            ))}
          </div>

          <p className="mt-4 text-slate-600 text-sm">
            you’re on fire! keep it going 🔥
          </p>
        </div>

        {/* POINTS */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 mb-3">Points & Rewards</h2>

          <p className="text-slate-700">
            <strong>Total Points:</strong> {profile?.total_points || 0}
          </p>

          <button className={`${rainbowButton} mt-4`}>
            Redeem Rewards
          </button>
        </div>

        {/* TEAM POINTS */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 mb-3">
            Team Points (Current Challenge)
          </h2>

          <p className="text-slate-700"><strong>Challenge:</strong> Sprint Ladder</p>
          <p className="text-slate-700"><strong>Team:</strong> Glitter Goblins</p>
          <p className="text-slate-700"><strong>Today:</strong> 2 points</p>
          <p className="text-slate-700"><strong>Total:</strong> 18 points</p>

          <div className="flex gap-3 mt-4">
            <button className={whiteButton}>View Team</button>
            <button className={rainbowButton}>Leaderboard</button>
          </div>
        </div>

        {/* MESSAGES */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200 md:col-span-2">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Messages</h2>

          <div className="space-y-3 text-slate-700">
            <p>💬 Alex → You: “Killed my workout today!”</p>
            <p>💬 Jordan → You: “Hydration check 💧”</p>
            <p>💬 Sam → You: “Anyone doing Flex Friday?”</p>
          </div>

          <button className={`${rainbowButton} mt-4`}>Open Inbox</button>
        </div>

        {/* JOINED CHALLENGES */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200 md:col-span-2">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Joined Challenges</h2>

          <div className="space-y-4">
            <div className="p-4 border rounded-xl flex justify-between items-center">
              <div>
                <p className="font-semibold text-slate-800">Sprint Ladder</p>
                <p className="text-slate-500 text-sm">
                  Join code: <strong>abc123</strong>
                </p>
              </div>

              <div className="w-24 h-24 rounded-full flex items-center justify-center bg-[conic-gradient(#FD80AB,#FFCE71,#A4FC95,#65EBE4,#719FFF,#FD80AB)]">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-slate-700 text-base font-semibold">
                  75%
                </div>
              </div>
            </div>
          </div>

          <button className={`${rainbowButton} mt-4`}>Join a Challenge</button>
        </div>

        {/* CREATED CHALLENGES */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200 md:col-span-2">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Your Created Challenges</h2>

          <div className="space-y-4">
            <div className="p-4 border rounded-xl flex justify-between items-center">
              <div>
                <p className="font-semibold text-slate-800">Flex Friday</p>
                <p className="text-slate-500 text-sm">
                  Join code: <strong>xyz789</strong>
                </p>
              </div>

              <button className={whiteButton}>View</button>
            </div>
          </div>

          <button className={`${rainbowButton} mt-4`}>
            Create New Challenge
          </button>
        </div>

      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading dashboard…</div>}>
      <DashboardContent />
    </Suspense>
  );
}
