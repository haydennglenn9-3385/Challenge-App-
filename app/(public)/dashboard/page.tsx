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

      {/* PROGRESS + STREAKS */}
      <div className="bg-white shadow-xl rounded-2xl p-8 max-w-xl w-full border border-slate-200 mb-10">
        <h2 className="text-2xl font-semibold text-slate-800 mb-4">Your Progress</h2>
        <p className="text-slate-600">Progress rings or bars will go here.</p>

        <h2 className="text-2xl font-semibold text-slate-800 mt-8 mb-4">Your Streaks</h2>
        <p className="text-slate-600">Daily streaks will go here.</p>
      </div>

      {/* JOINED CHALLENGES */}
      <div className="bg-white shadow-xl rounded-2xl p-8 max-w-xl w-full border border-slate-200 mb-10">
        <h2 className="text-2xl font-semibold text-slate-800 mb-4">Joined Challenges</h2>
        <p className="text-slate-600">List of challenges the user joined, with join codes.</p>
      </div>

      {/* CREATED CHALLENGES */}
      <div className="bg-white shadow-xl rounded-2xl p-8 max-w-xl w-full border border-slate-200">
        <h2 className="text-2xl font-semibold text-slate-800 mb-4">Your Created Challenges</h2>
        <p className="text-slate-600">List of challenges the user created, with join codes.</p>
      </div>

    </div>
  );
}
