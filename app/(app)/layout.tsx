"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type WixUser = {
  id: string;
  name: string;
  email: string;
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [showSettings, setShowSettings] = useState(false);
  const [wixUser, setWixUser] = useState<WixUser | null>(null);

  // ⭐ LISTEN FOR WIX USER INFO
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "USER_INFO") {
        console.log("Received USER_INFO:", event.data.user);
        setWixUser(event.data.user);
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // ⭐ ALLOW ALL ROUTES TO LOAD EVEN BEFORE WIX USER ARRIVES
  // (This fixes the infinite "Loading your account..." issue)
  if (!wixUser && pathname === "/") {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Loading your account...
      </div>
    );
  }

  // ⭐ INITIALS FOR PROFILE BUTTON
  const initials =
    wixUser?.name
      ?.trim()
      .split(/\s+/)
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "QA";

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      {/* HEADER */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-xl font-semibold text-slate-800">
            Queers & Allies Fitness
          </Link>

          <nav className="flex items-center gap-6 text-slate-600">
            <Link href="/dashboard" className={pathname === "/dashboard" ? "font-bold text-slate-900" : ""}>
              Dashboard
            </Link>
            <Link href="/challenges" className={pathname === "/challenges" ? "font-bold text-slate-900" : ""}>
              Challenges
            </Link>
            <Link href="/leaderboard" className={pathname === "/leaderboard" ? "font-bold text-slate-900" : ""}>
              Leaderboard
            </Link>
            <Link href="/messages" className={pathname === "/messages" ? "font-bold text-slate-900" : ""}>
              Messages
            </Link>

            {/* PROFILE BUTTON */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center font-semibold"
            >
              {initials}
            </button>
          </nav>
        </div>
      </header>

      {/* SETTINGS DROPDOWN */}
      {showSettings && wixUser && (
        <div className="absolute right-6 mt-2 bg-white shadow-lg rounded-lg p-4 border border-slate-200 z-50">
          <p className="text-sm text-slate-700 mb-2">{wixUser.email}</p>
          <button
            onClick={() => router.push("/profile")}
            className="block w-full text-left px-3 py-2 hover:bg-slate-100 rounded"
          >
            Profile
          </button>
        </div>
      )}

      {/* MAIN CONTENT */}
      <main className="max-w-5xl mx-auto px-6 py-10">{children}</main>
    </div>
  );
}
