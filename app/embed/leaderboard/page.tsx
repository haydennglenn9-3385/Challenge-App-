"use client";

import { Suspense } from "react";
import { UserProvider } from "@/lib/UserContext";
import { usePathname, useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";

function BottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const nav = (path: string) => {
    const params = searchParams.toString();
    router.push(params ? `${path}?${params}` : path);
  };

  const isActive = (path: string) => pathname.includes(path);

  const navItems = [
    { label: "Ranks",      icon: "🏅", path: "/embed/leaderboard" },
    { label: "Challenges", icon: "⚡", path: "/embed/challenges" },
    { label: "Activity",   icon: "🏳️‍🌈", path: "/embed/dashboard", center: true },
    { label: "Messages",   icon: "💬", path: "/embed/messages" },
    { label: "Profile",    icon: "👤", path: "/embed/profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      <div
        className="flex items-center justify-around px-2 pt-2 pb-6"
        style={{
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        {navItems.map((item) =>
          item.center ? (
            <button
              key={item.label}
              onClick={() => nav(item.path)}
              className="flex flex-col items-center gap-1 -mt-5"
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
                style={{
                  background: "linear-gradient(135deg, #ff6b9d, #ff9f43, #ffdd59, #48cfad, #4fc3f7, #667eea)",
                  boxShadow: "0 6px 20px rgba(102,126,234,0.4)",
                }}
              >
                {item.icon}
              </div>
              <span className="text-[10px] font-bold text-slate-400">{item.label}</span>
            </button>
          ) : (
            <button
              key={item.label}
              onClick={() => nav(item.path)}
              className="flex flex-col items-center gap-1 px-2"
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-all ${
                  isActive(item.path) ? "bg-slate-900" : "bg-transparent"
                }`}
              >
                {item.icon}
              </div>
              <span
                className={`text-[10px] font-bold transition-colors ${
                  isActive(item.path) ? "text-slate-900" : "text-slate-400"
                }`}
              >
                {item.label}
              </span>
            </button>
          )
        )}
      </div>
    </nav>
  );
}

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full">
      <Suspense fallback={<div className="p-12 text-center">Loading...</div>}>
        <UserProvider>
          {children}
          <BottomNav />
        </UserProvider>
      </Suspense>
    </div>
  );
}