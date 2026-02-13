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
    <div className="min-h-screen px-6 pt-20 pb-20 flex flex-col items-center bg-[linear-gradient(to_bottom_right,#BAE3EF,#DFF58C,#FDD3EC,#FFE4B6)]">

      {/* USER CARD */}
      <div className="bg-white shadow-xl rounded-2xl p-10 max-w-xl w-full text-center border border-slate-200 mb-10">
        <h1 className="text-3xl font-bold text-slate-800 mb-4">
          Welcome to your Dashboard
        </h1>

        {userId && (
          <div className="mt-6 text-left space-y-3">
            <p className="text-lg text-slate-700">
              <strong>Name:</strong> {name}
            </p>
            <p className="text-lg text-slate-700">
              <strong>Email:</strong> {email}
            </p>

            <button className="mt-4 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition">
              Change Password
            </button>
          </div>
        )}
      </div>

      {/* STREAK COUNTER */}
      <div className="bg-white shadow-xl rounded-2xl p-8 max-w-xl w-full border border-slate-200 mb-10">
        <h2 className="text-2xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <span className="text-3xl">🔥</span>
          3‑Day Streak
        </h2>

        <div className="flex justify-between text-center mt-4">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <div key={i} className="flex flex-col items-center">
              <span className="text-slate-600">{d}</span>
              <div className={`w-6 h-6 mt-1 rounded-full border-2 ${
                i < 3 ? "border-rainbow animate-pulse" : "border-slate-300"
              }`}></div>
            </div>
          ))}
        </div>
      </div>

      {/* PROGRESS RINGS */}
      <div className="bg-white shadow-xl rounded-2xl p-8 max-w-xl w-full border border-slate-200 mb-10">
        <h2 className="text-2xl font-semibold text-slate-800 mb-4">Your Progress</h2>

        <div className="flex justify-center">
          <div className="w-32 h-32 rounded-full border-[10px] border-transparent bg-[conic-gradient(red,orange,yellow,green,blue,indigo,violet)] flex items-center justify-center">
            <span className="text-slate-700 font-semibold">75%</span>
          </div>
        </div>
      </div>

      {/* JOINED CHALLENGES */}
      <div className="bg-white shadow-xl rounded-2xl p-8 max-w-xl w-full border border-slate-200 mb-10">
        <h2 className="text-2xl font-semibold text-slate-800 mb-4">Joined Challenges</h2>

        <div className="space-y-4">
          <div className="p-4 border rounded-xl flex justify-between items-center">
            <div>
              <p className="font-semibold text-slate-800">Sprint Ladder</p>
              <p className="text-slate-500 text-sm">Join code: <strong>abc123</strong></p>
            </div>
            <button className="px-3 py-1 bg-slate-800 text-white rounded-lg">View</button>
          </div>
        </div>
      </div>

      {/* CREATED CHALLENGES */}
      <div className="bg-white shadow-xl rounded-2xl p-8 max-w-xl w-full border border-slate-200">
        <h2 className="text-2xl font-semibold text-slate-800 mb-4">Your Created Challenges</h2>

        <div className="space-y-4">
          <div className="p-4 border rounded-xl flex justify-between items-center">
            <div>
              <p className="font-semibold text-slate-800">Flex Friday</p>
              <p className="text-slate-500 text-sm">Join code: <strong>xyz789</strong></p>
            </div>
            <button className="px-3 py-1 bg-slate-800 text-white rounded-lg">View</button>
          </div>
        </div>

        <button className="mt-6 w-full py-3 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition">
          Create New Challenge
        </button>
      </div>

    </div>
  );
}
