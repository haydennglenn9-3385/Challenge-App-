"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/utils/supabase/client";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [showSettings, setShowSettings] = useState(false);
  const [displayName, setDisplayName] = useState("");

  const navItems = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/challenges", label: "Challenges" },
    { href: "/challenges/new", label: "New Challenge" },
    { href: "/leaderboard", label: "Leaderboard" },
    { href: "/messages", label: "Messages" },
    { href: "/invites", label: "Invites" },
  ];

  const handleLogout = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    localStorage.removeItem("userProfile");
    router.push("/login");
  };

  useEffect(() => {
    const loadProfile = async () => {
      const supabase = getSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      const name = (user?.user_metadata?.name as string) || user?.email || "";
      setDisplayName(name);
    };
    loadProfile();
  }, []);

  const initials = useMemo(() => {
    if (!displayName) return "QA";
    const parts = displayName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }, [displayName]);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-slate-200/60 bg-white/90 backdrop-blur">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between px-6 py-4 gap-4">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-2xl"
              style={{ background: "linear-gradient(135deg, var(--neon-teal), var(--neon-lime))" }}
            />
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Queers and Allies Fitness Challenge</p>
              <p className="text-xl font-display">Gym Challenge Hub</p>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                    isActive
                      ? "text-slate-900 shadow-md"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                  style={isActive ? { background: "linear-gradient(135deg, #ff5fd7, #ffb86c, #fff27a, #8bff9f, #5be7ff, #7c7bff)" } : { background: "transparent" }}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/profile")}
              className="flex items-center justify-center w-12 h-12 rounded-full border border-slate-200 text-sm font-semibold text-slate-900"
              style={{ background: "linear-gradient(135deg, #ff5fd7, #ffb86c, #fff27a, #8bff9f, #5be7ff, #7c7bff)" }}
              aria-label="Open profile"
            >
              {initials}
            </button>

            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 transition"
              aria-label="Open settings"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  d="M4 6h16M4 12h16M4 18h16"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>

      {showSettings && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-end z-50">
          <div className="bg-white w-full max-w-xl rounded-t-2xl p-6 shadow-xl animate-slide-up">
            <h2 className="text-xl font-semibold mb-4">Settings</h2>

            <button
              onClick={handleLogout}
              className="w-full text-left py-3 text-red-600 font-medium"
            >
              Log out
            </button>

            <button
              onClick={() => setShowSettings(false)}
              className="w-full text-left py-3 text-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
