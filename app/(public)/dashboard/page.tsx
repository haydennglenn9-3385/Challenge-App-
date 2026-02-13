"use client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { useSearchParams } from "next/navigation";

export default function DashboardPage() {
  const searchParams = useSearchParams();

  const userId = searchParams.get("userId");
  const email = searchParams.get("email");
  const name = searchParams.get("name") || "friend";

  return (
    <div className="min-h-screen px-6 py-16 flex flex-col items-center bg-[linear-gradient(to_bottom_right,#BAE3EF,#DFF58C,#FDD3EC,#FFE4B6)]">

      {/* GRID LAYOUT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">

        {/* PROFILE WIDGET */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 mb-3">Your Profile</h2>
          <p className="text-slate-700"><strong>Name:</strong> {name}</p>
          <p className="text-slate-700"><strong>Email:</strong> {email}</p>

          <button className="mt-4 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition">
            Change Password
          </button>
        </div>

        {/* STREAK WIDGET */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200 flex flex-col items-center">
          <div className="text-5xl mb-2" style={{ background: "linear-gradient(90deg, red, orange, yellow, green, blue, purple)", WebkitBackgroundClip: "text", color: "transparent" }}>
            🔥
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">3‑Day Streak</h2>

          <div className="flex justify-between w-full mt-3">
            {["M","T","W","T","F","S","S"].map((d,i)=>(
              <div key={i} className="flex flex-col items-center">
                <span className="text-slate-600">{d}</span>
                <div className={`w-6 h-6 mt-1 rounded-full border-2 ${
                  i < 3 ? "border-[conic-gradient(red,orange,yellow,green,blue,purple)]" : "border-slate-300"
                }`}></div>
              </div>
            ))}
          </div>

          <p className="mt-4 text-slate-600 text-sm">you’re on fire! time to celebrate 🎉</p>
        </div>

        {/* PROGRESS RING WIDGET */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200 flex flex-col items-center">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Your Progress</h2>

          <div className="w-32 h-32 rounded-full border-[10px] border-transparent bg-[conic-gradient(red,orange,yellow,green,blue,indigo,violet)] flex items-center justify-center">
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
              <button className="px-3 py-1 bg-slate-800 text-white rounded-lg">View</button>
            </div>
          </div>

          <button className="mt-4 w-full py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition">
            Join a Challenge
          </button>
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
              <button className="px-3 py-1 bg-slate-800 text-white rounded-lg">View</button>
            </div>
          </div>

          <button className="mt-4 w-full py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition">
            Create New Challenge
          </button>
        </div>

      </div>
    </div>
  );
}
