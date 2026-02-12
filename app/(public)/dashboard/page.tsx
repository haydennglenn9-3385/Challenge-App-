"use client";

import { useEffect, useState } from "react";

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    console.log("🔥 CLEAN DASHBOARD MOUNTED");
    setMounted(true);

    // TEMP: Log every message to confirm the page is alive
    function handleMessage(event: MessageEvent) {
      console.log("📩 MESSAGE RECEIVED IN CLEAN DASHBOARD:", event.data);
    }

    window.addEventListener("message", handleMessage);

    // TEMP: Send a test message upward so we know postMessage works
    window.parent.postMessage({ type: "CLEAN_DASHBOARD_TEST" }, "*");
    console.log("📤 SENT CLEAN_DASHBOARD_TEST");

    return () => window.removeEventListener("message", handleMessage);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="p-6 rounded-3xl text-center bg-white shadow">
          <p className="text-lg font-semibold">Mounting clean dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="p-10 rounded-3xl text-center bg-white shadow space-y-4">
        <h1 className="text-3xl font-bold">Clean Dashboard Loaded</h1>
        <p className="text-slate-600">
          If you see this, React mounted successfully.
        </p>
        <p className="text-slate-500 text-sm">
          Check the console for logs.
        </p>
      </div>
    </div>
  );
}
