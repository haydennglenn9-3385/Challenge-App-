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
    "px-4 py-2 rounded-xl text-black font-semibold shadow-md bg-[linear-gradient(90deg,#FD80AB,#FFCE71,#A4FC95,#65EBE4,#719FFF)]";

  return (
    <div className="min-h-screen px-6 py-16 flex flex-col items-center bg-[linear-gradient(to_bottom_right,#BAE3EF,#DFF58C,#FDD3EC,#FFE4B6)]">

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">

        {/* PROFILE WIDGET */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 mb-3">Your Profile</h2>

          <p className="text-slate-700"><strong>Name:</strong> {name}</p>
          <p className="text-slate-700"><strong>Email:</strong> {email}</p>

          <div className="flex flex-col gap-3 mt-4">
            <button className={rainbowButton}>Change Password</button>
            <button className={rainbowButton}>Log Out</button>
          </div>
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
                  className={`w-6 h-6 mt-1 rounded-full border-2 ${
                    i < 3
                      ? "border-[3px] border-transparent bg-[conic-gradient(#FD80AB,#FFCE71,#A4FC95,#65EBE4,#719FFF,#FD80AB)]"
                      : "border-slate-300"
                  }`}
                ></div>
              </div>
            ))}
          </div>

          <p className="mt-4 text-slate-600 text-sm">you’re on fire! keep it going 🔥</p>
        </div>

        {/* PROGRESS RING WIDGET */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200 flex flex-col items-center">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Your Progress</h2>

          <div className="w-32 h-32 rounded-full border-[10px] border-transparent bg-[conic-gradient(#FD80AB,#FFCE71,#A4FC95,#65EBE4,#719FFF,#FD80AB)] flex items-center justify-center">
            <span className="text-slate-700 font-semibold text-xl">75%</span>
          </div>
        </div>

        {/* JOINED CHALLENGES */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Joined Challenges</h2>

          <div className="space-y-3">
            <div className="p-4 border rounded-xl flex justify-between items-center">
              <div>
                <p className="font-semibold text-slate-800">Sprint Ladder</p>
                <p className="text-slate-500 text-sm">Join code: <strong>abc123</strong></p>
              </div>
              <button className={rainbowButton}>View</button>
            </div>
          </div>

          <button className={`${rainbowButton} w-full mt-4`}>Join a Challenge</button>
        </div>

        {/* CREATED CHALLENGES */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Your Created Challenges</h2>

          <div className="space-y-3">
            <div className="p-4 border rounded-xl flex justify-between items-center">
              <div>
                <p className="font-semibold text-slate-800">Flex Friday</p>
                <p className="text-slate-500 text-sm">Join code: <strong>xyz789</strong></p>
              </div>
              <button className={rainbowButton}>View</button>
            </div>
          </div>

          <button className={`${rainbowButton} w-full mt-4`}>Create New Challenge</button>
        </div>

      </div>
    </div>
  );
}
