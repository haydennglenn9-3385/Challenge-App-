// app/embed/layout.tsx
"use client";

import { Suspense, useEffect, useState } from "react";
import { UserProvider } from "@/lib/UserContext";
import { usePathname, useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

// ─── Loading screen ───────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <>
      <style>{`
        @keyframes rainbowShift { 0%{background-position:0%} 100%{background-position:200%} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
      `}</style>
      <div style={{
        minHeight: "100dvh", width: "100%",
        background: "linear-gradient(135deg, #d4f5e2 0%, #fde0ef 30%, #fdf6d3 60%, #d4eaf7 100%)",
        display: "flex", flexDirection: "column",
      }}>
        <div style={{
          height: 12, width: "100%",
          background: "linear-gradient(90deg,#ff3c5f,#ff8c42,#ffd166,#06d6a0,#118ab2,#7b2d8b,#ff3c5f)",
          backgroundSize: "200% 100%",
          animation: "rainbowShift 4s linear infinite",
          flexShrink: 0,
        }} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
          <div style={{ fontSize: 52, animation: "pulse 1.5s ease-in-out infinite" }}>🏳️‍🌈</div>
          <div style={{ fontFamily: "var(--font-inter), system-ui, sans-serif", fontSize: 11, fontWeight: 700, color: "#7b2d8b", letterSpacing: 6 }}>
            LOADING...
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Static nav items ─────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { label: "Activity",   icon: "🏳️‍🌈", path: "/embed/dashboard"   },
  { label: "Challenges", icon: "⚡",    path: "/embed/challenges"  },
  { label: "Ranks",      icon: "🏅",    path: "/embed/leaderboard" },
  { label: "Messages",   icon: "💬",    path: "/embed/messages"    },
  { label: "Profile",    icon: "👤",    path: "/embed/profile"     },
];

const ADMIN_ITEM = { label: "Admin", icon: "⚙️", path: "/embed/admin" };

// ─── Hook: check admin role once ─────────────────────────────────────────────
function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data?.role === "admin") setIsAdmin(true);
        });
    });
  }, []);

  return isAdmin;
}

// ─── Bottom nav ───────────────────────────────────────────────────────────────
function BottomNav() {
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const router       = useRouter();
  const isAdmin      = useIsAdmin();

  const nav = (path: string) => {
    const params = searchParams.toString();
    router.push(params ? `${path}?${params}` : path);
  };

  const isActive = (path: string) => pathname.includes(path);
  const items = isAdmin ? [...NAV_ITEMS, ADMIN_ITEM] : NAV_ITEMS;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
      <div
        className="flex items-center justify-around px-2 pt-2 pb-6"
        style={{
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        {items.map((item) =>
          item.label === "Activity" ? (
            <button
              key={item.label}
              onClick={() => nav(item.path)}
              className="flex flex-col items-center gap-1 -mt-5"
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
                style={{
                  background: "linear-gradient(135deg,#ff6b9d,#ff9f43,#ffdd59,#48cfad,#4fc3f7,#667eea)",
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

// ─── Sidebar (desktop) ────────────────────────────────────────────────────────
function Sidebar() {
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const router       = useRouter();
  const isAdmin      = useIsAdmin();

  const nav = (path: string) => {
    const params = searchParams.toString();
    router.push(params ? `${path}?${params}` : path);
  };

  const isActive = (path: string) => pathname.includes(path);
  const items = isAdmin ? [...NAV_ITEMS, ADMIN_ITEM] : NAV_ITEMS;

  const fontStack = "var(--font-inter), system-ui, sans-serif";

  return (
    <aside
      style={{
        width: 240, flexShrink: 0, position: "sticky", top: 0,
        height: "100dvh", display: "flex", flexDirection: "column",
        padding: "32px 16px 24px",
        borderRight: "1px solid rgba(0,0,0,0.06)",
        background: "#fff",
      }}
    >
      {/* Logo */}
      <div style={{ paddingLeft: 12, marginBottom: 36 }}>
        <div style={{ fontSize: 28 }}>🏳️‍🌈</div>
        <p style={{
          fontFamily: fontStack,
          fontSize: 13,
          fontWeight: 800,
          letterSpacing: 2,
          background: "linear-gradient(90deg,#ff3c5f,#ff8c42,#ffd166,#06d6a0,#118ab2,#7b2d8b)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          marginTop: 2,
        }}>
          Queers & Allies Fitness
        </p>
      </div>

      {/* Nav items */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
        {items.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.label}
              onClick={() => nav(item.path)}
              style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "12px 16px", borderRadius: 14, border: "none",
                cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                background: active
                  ? "linear-gradient(90deg, rgba(255,107,157,0.12), rgba(102,126,234,0.12))"
                  : item.label === "Admin"
                  ? "rgba(123,45,139,0.06)"
                  : "transparent",
                fontFamily: fontStack,
              }}
            >
              <span style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18,
                background: active
                  ? "linear-gradient(135deg,#ff6b9d,#ff9f43,#ffdd59,#48cfad,#667eea)"
                  : item.label === "Admin"
                  ? "rgba(123,45,139,0.12)"
                  : "rgba(0,0,0,0.04)",
                boxShadow: active ? "0 3px 10px rgba(102,126,234,0.3)" : "none",
              }}>
                {item.icon}
              </span>
              <span style={{
                fontSize: 15,
                fontWeight: active ? 800 : 600,
                color: active ? "#0e0e0e" : item.label === "Admin" ? "#7b2d8b" : "#64748b",
                letterSpacing: active ? "0.01em" : 0,
              }}>
                {item.label}
              </span>
              {active && (
                <div style={{
                  marginLeft: "auto", width: 6, height: 6, borderRadius: "50%",
                  background: "linear-gradient(135deg,#ff6b9d,#667eea)", flexShrink: 0,
                }} />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <p style={{ fontSize: 11, color: "#cbd5e1", fontWeight: 600, textAlign: "center", paddingTop: 16, fontFamily: fontStack }}>
        © 2026 Q&A Fitness
      </p>
    </aside>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────
export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <UserProvider>
        <div className="lg:hidden min-h-screen w-full">
          {children}
          <BottomNav />
        </div>
        <div className="hidden lg:flex min-h-screen w-full" style={{ background: "#f8f9fa" }}>
          <Sidebar />
          <main style={{
            flex: 1, overflowY: "auto", display: "flex",
            justifyContent: "center", padding: "0 24px",
          }}>
            <div style={{ width: "100%", maxWidth: 680, paddingBottom: 60 }}>
              {children}
            </div>
          </main>
        </div>
      </UserProvider>
    </Suspense>
  );
}