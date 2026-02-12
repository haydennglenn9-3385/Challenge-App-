"use client";

import { useEffect, useState } from "react";

type WixUser = {
  id: string;
  name: string;
  email: string;
};

export default function DashboardPage() {
  const [wixUser, setWixUser] = useState<WixUser | null>(null);

  // Log when the dashboard mounts
  useEffect(() => {
    console.log("🔥 DASHBOARD MOUNTED");

    // Send a test message to Wix (or parent)
    window.parent.postMessage({ type: "DASHBOARD_READY" }, "*");
    console.log("📤 SENT DASHBOARD_READY");
  }, []);

  // Listen for Wix identity
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "USER_INFO") {
        console.log("📨 RECEIVED USER_INFO:", event.data.user);
        setWixUser(event.data.user);
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50 px-6 py-20">
      <div className="bg-white shadow-xl rounded-2xl p-10 max-w-xl w-full text-center border border-slate-200">
        <h1 className="text-3xl font-bold text-slate-800 mb-4">
          Welcome to your Dashboard
        </h1>

        {!wixUser && (
          <p className="text-slate-600">
            Waiting for Wix user info…
            <br />
            Check the console for messages.
          </p>
        )}

        {wixUser && (
          <div className="mt-6 text-left">
            <p className="text-lg text-slate-700">
              <strong>Name:</strong> {wixUser.name}
            </p>
            <p className="text-lg text-slate-700">
              <strong>Email:</strong> {wixUser.email}
            </p>
            <p className="text-lg text-slate-700">
              <strong>User ID:</strong> {wixUser.id}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
