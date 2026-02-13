"use client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { useSearchParams } from "next/navigation";

export default function DashboardPage() {
  const searchParams = useSearchParams();

  const userId = searchParams.get("userId");
  const email = searchParams.get("email");
  const name = searchParams.get("name") || "friend";

  const rainbowButton =
    "px-4 py-2 rounded-xl text-black font-semibold shadow-md bg-[linear-gradient(90deg,#FD80AB,#FFCE71,#A4FC95,#65EBE4,#719FFF)] inline-block";

  const whiteButton =
    "px-3 py-1 rounded-lg bg-white border border-slate-300 text-slate-800 font-medium inline-block";

  return (
    <div className="min-h-screen px-6 py-16 flex flex-col items-center bg-[linear-gradient(to_bottom_right,#BAE3EF,#DFF58C,#FDD3EC,#FFE4B6)]">

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">

        {/* PROFILE WIDGET */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 mb-3">Your Profile</h2>

          <p className="text-slate-700"><strong>Name:</strong> {name}</p>
          <p className="text-slate-700"><strong>Email:</strong> {email}</p>

          <a href="#" className="text-slate-600 underline mt-4 inline-block">
            Change Password
          </a>

          <button className={`${rainbowButton} mt-4`}>
            Log Out
          </button>
        </div>

        {/* STREAK WIDGET */}
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

          <h2 className="text-xl font-bold text-slate-800 mb-2">3‑Day Streak</h2>

          <div className="flex justify-between w-full mt-3">
            {["M","T","W","T","F","S","S"].map((d,i)=>(
              <div key={i} className="flex flex-col items-center">
                <span className="text-slate-600">{d}</span>
                <div
                  className={`w-3 h-3 mt-1 rounded-full ${
                    i < 3 ? "bg-black" : "bg-slate-300"
                  }`}
                ></div>
              </div>
            ))}
          </div>

          <p className="mt-4 text-slate-600 text-sm">you’re on fire! keep it going 🔥</p>
        </div>

        {/* JOINED CHALLENGES */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200 md:col-span-2">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Joined Challenges</h2>

          <div className="space-y-4">

            {/* Example challenge */}
            <div className="p-4 border rounded-xl flex justify-between items-center">
              <div>
                <p className="font-semibold text-slate-800">Sprint Ladder</p>
                <p className="text-slate-500 text-sm">Join code: <strong>abc123</strong></p>
              </div>

              {/* Progress Ring (slightly larger) */}
              <div className="w-20 h-20 rounded-full bg-[conic-gradient(#FD80AB,#FFCE71,#A4FC95,#65EBE4,#719FFF,#FD80AB)] flex items-center justify-center">
                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-slate-700 text-sm font-semibold">
                  75%
                </div>
              </div>
            </div>

          </div>

          <button className={`${rainbowButton} mt-4`}>
            Join a Challenge
          </button>
        </div>

        {/* CREATED CHALLENGES */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200 md:col-span-2">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Your Created Challenges</h2>

          <div className="space-y-4">

            {/* Example created challenge */}
            <div className="p-4 border rounded-xl flex justify-between items-center">
              <div>
                <p className="font-semibold text-slate-800">Flex Friday</p>
                <p className="text-slate-500 text-sm">Join code: <strong>xyz789</strong></p>
              </div>

              <button className={whiteButton}>View</button>
            </div>

          </div>

          <button className={`${rainbowButton} mt-4`}>
            Create New Challenge
          </button>
        </div>

        {/* MESSAGE BOARD */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200 md:col-span-2">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Message Board</h2>

          <div className="space-y-3 text-slate-700">
            <p>💬 Alex: “Killed my workout today!”</p>
            <p>💬 Jordan: “Hydration check 💧”</p>
            <p>💬 Sam: “Anyone doing Flex Friday?”</p>
          </div>

          <button className={`${rainbowButton} mt-4`}>
            Post Message
          </button>
        </div>

      </div>
    </div>
  );
}
