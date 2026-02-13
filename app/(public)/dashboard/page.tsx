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
    <div className="min-h-screen bg-gradient-to-br from-rose-200 via-pink-200 to-indigo-200 px-6 pt-20 pb-20 flex flex-col items-center">

      <div className="bg-white shadow-xl rounded-2xl p-10 max-w-xl w-full text-center border border-slate-200">
        <h1 className="text-3xl font-bold text-slate-800 mb-4">
          Welcome to your Dashboard
        </h1>

        {!userId && (
          <p className="text-slate-600">
            Waiting for Wix user info…
            <br />
            (Make sure the iframe URL includes userId/email)
          </p>
        )}

        {userId && (
          <div className="mt-6 text-left">
            <p className="text-lg text-slate-700">
              <strong>Name:</strong> {name}
            </p>
            <p className="text-lg text-slate-700">
              <strong>Email:</strong> {email}
            </p>
            <p className="text-lg text-slate-700">
              <strong>User ID:</strong> {userId}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
