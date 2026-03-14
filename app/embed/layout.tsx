// app/embed/layout.tsx
"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { UserProvider } from "@/lib/UserContext";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { dailyCheckin, getCheckinStatus } from "@/app/actions/dailyCheckin";

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

// ─── Nav items ────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { label: "Activity",   icon: "🏳️‍🌈", path: "/embed/dashboard"   },
  { label: "Challenges", icon: "⚡",    path: "/embed/challenges"  },
  { label: "Ranks",      icon: "🏅",    path: "/embed/leaderboard" },
  { label: "Messages",   icon: "💬",    path: "/embed/messages"    },
  { label: "Profile",    icon: "👤",    path: "/embed/profile"     },
];

const ADMIN_ITEM = { label: "Admin", icon: "⚙️", path: "/embed/admin" };

// ─── Admin hook ───────────────────────────────────────────────────────────────
import { supabase } from "@/lib/supabase/client";

function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("users").select("role").eq("id", user.id).single()
        .then(({ data }) => { if (data?.role === "admin") setIsAdmin(true); });
    });
  }, []);
  return isAdmin;
}

// ─── Particle type ────────────────────────────────────────────────────────────
interface Particle { id: number; angle: number; dist: number; color: string; size: number }

const RAINBOW_COLORS = ["#ff6b9d","#ff9f43","#ffdd59","#48cfad","#667eea","#a29bfe"];

function makeParticles(n = 12): Particle[] {
  return Array.from({ length: n }, (_, i) => ({
    id:    i,
    angle: (360 / n) * i + (Math.random() * 16 - 8),
    dist:  44 + Math.random() * 28,
    color: RAINBOW_COLORS[i % RAINBOW_COLORS.length],
    size:  5 + Math.random() * 5,
  }));
}

// ─── Check-in Orb ─────────────────────────────────────────────────────────────
// Used in both BottomNav and Sidebar
interface CheckInOrbProps {
  /** px size of the outer container (orb + ring) */
  size?: number;
  checkedIn: boolean;
  loading: boolean;
  streak: number;
  onPress: () => void;
}

function CheckInOrb({ size = 56, checkedIn, loading, streak, onPress }: CheckInOrbProps) {
  const [burst, setBurst]         = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [tapped, setTapped]       = useState(false);
  const [showBadge, setShowBadge] = useState(false);
  const prevCheckedIn             = useRef(checkedIn);

  // Trigger burst when transitioning to done
  useEffect(() => {
    if (!prevCheckedIn.current && checkedIn) {
      setParticles(makeParticles(12));
      setBurst(true);
      setShowBadge(true);
      setTimeout(() => setBurst(false), 850);
      setTimeout(() => setShowBadge(false), 2000);
    }
    prevCheckedIn.current = checkedIn;
  }, [checkedIn]);

  function handleTap() {
    if (loading) return;
    setTapped(true);
    setTimeout(() => setTapped(false), 280);
    onPress();
  }

  const inner = size - 8; // button inside the ring

  return (
    <>
      <style>{`
        @keyframes qaf-orb-pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(102,126,234,0.5), 0 0 28px 6px rgba(255,107,157,0.2); transform: scale(1); }
          50%      { box-shadow: 0 0 0 12px rgba(102,126,234,0), 0 0 44px 14px rgba(255,107,157,0.1); transform: scale(1.04); }
        }
        @keyframes qaf-orb-done {
          0%,100% { box-shadow: 0 0 22px 6px rgba(72,207,173,0.4); }
          50%      { box-shadow: 0 0 40px 14px rgba(72,207,173,0.2); }
        }
        @keyframes qaf-ring-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes qaf-tap {
          0%   { transform: scale(1); }
          40%  { transform: scale(0.88); }
          75%  { transform: scale(1.06); }
          100% { transform: scale(1); }
        }
        @keyframes qaf-particle {
          0%   { opacity:1; transform: translate(-50%,-50%) rotate(var(--a)) translateX(0) scale(1); }
          100% { opacity:0; transform: translate(-50%,-50%) rotate(var(--a)) translateX(var(--d)) scale(0.1); }
        }
        @keyframes qaf-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes qaf-check-pop {
          0%   { transform: scale(0.3); opacity:0; }
          60%  { transform: scale(1.25); opacity:1; }
          100% { transform: scale(1);   opacity:1; }
        }
        @keyframes qaf-badge-float {
          0%   { opacity:1; transform: translateX(-50%) translateY(0) scale(1); }
          15%  { transform: translateX(-50%) translateY(-4px) scale(1.1); }
          100% { opacity:0; transform: translateX(-50%) translateY(-40px) scale(0.9); }
        }
      `}</style>

      <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>

        {/* Spinning rainbow ring — only when ready */}
        {!checkedIn && !loading && (
          <div aria-hidden style={{
            position: "absolute", inset: -3, borderRadius: "50%",
            background: "conic-gradient(from 0deg,#ff6b9d,#ff9f43,#ffdd59,#48cfad,#667eea,#a29bfe,#ff6b9d)",
            animation: "qaf-ring-spin 2.8s linear infinite",
            zIndex: 0,
          }} />
        )}

        {/* Done ring — static soft teal */}
        {checkedIn && (
          <div aria-hidden style={{
            position: "absolute", inset: -3, borderRadius: "50%",
            background: "conic-gradient(#48cfad,#667eea,#48cfad)",
            zIndex: 0,
          }} />
        )}

        {/* Orb button */}
        <button
          onClick={handleTap}
          aria-label={checkedIn ? "Checked in — tap to view activity" : "Daily check-in"}
          style={{
            position: "absolute", inset: 4,
            borderRadius: "50%", border: "none",
            cursor: "pointer", zIndex: 1,
            display: "flex", alignItems: "center", justifyContent: "center",
            WebkitTapHighlightColor: "transparent",
            background: checkedIn
              ? "radial-gradient(circle at 38% 32%, #f0fdf8, #b2f5e8 55%, #48cfad)"
              : loading
              ? "radial-gradient(circle at 38% 32%, #f5f3ff, #ddd6fe 60%, #c4b5fd)"
              : "radial-gradient(circle at 38% 32%, #fff9fc, #fce4f3 30%, #e0d9fb 60%, #c4b5fd)",
            animation: tapped
              ? "qaf-tap 0.28s cubic-bezier(0.34,1.56,0.64,1) forwards"
              : checkedIn
              ? "qaf-orb-done 3s ease-in-out infinite"
              : "qaf-orb-pulse 2.4s ease-in-out infinite",
            transition: "background 0.4s ease",
          }}
        >
          {loading ? (
            <div style={{
              width: inner * 0.4, height: inner * 0.4,
              borderRadius: "50%",
              border: "2.5px solid rgba(102,126,234,0.2)",
              borderTopColor: "#667eea",
              animation: "qaf-spin 0.7s linear infinite",
            }} />
          ) : checkedIn ? (
            <span style={{
              fontSize: inner * 0.52, lineHeight: 1,
              animation: burst ? "qaf-check-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) both" : "none",
              display: "block",
            }}>
              ✅
            </span>
          ) : (
            <span style={{ fontSize: inner * 0.52, lineHeight: 1, display: "block" }}>💪</span>
          )}
        </button>

        {/* Burst particles */}
        {burst && particles.map(p => (
          <div key={p.id} aria-hidden style={{
            position: "absolute", top: "50%", left: "50%",
            width: p.size, height: p.size, borderRadius: "50%",
            background: p.color, zIndex: 12, pointerEvents: "none",
            ["--a" as string]: `${p.angle}deg`,
            ["--d" as string]: `${p.dist}px`,
            animation: `qaf-particle 0.7s cubic-bezier(0.25,0.46,0.45,0.94) ${p.id * 15}ms forwards`,
          }} />
        ))}

        {/* +5 pts badge */}
        {showBadge && (
          <div aria-live="polite" style={{
            position: "absolute", top: "-2px", left: "50%",
            animation: "qaf-badge-float 2s ease-out forwards",
            zIndex: 20, pointerEvents: "none", whiteSpace: "nowrap",
            fontSize: 11, fontWeight: 800, color: "#667eea",
            background: "rgba(255,255,255,0.97)",
            padding: "3px 10px", borderRadius: 99,
            boxShadow: "0 2px 12px rgba(102,126,234,0.25)",
          }}>
            +5 pts ⭐
          </div>
        )}
      </div>
    </>
  );
}

// ─── Bottom Nav ───────────────────────────────────────────────────────────────
function BottomNav() {
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const router       = useRouter();
  const isAdmin      = useIsAdmin();

  const [checkedIn, setCheckedIn] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [streak,    setStreak]    = useState(0);

  // Load status on mount
  useEffect(() => {
    getCheckinStatus().then(({ checkedInToday, streak }) => {
      setCheckedIn(checkedInToday);
      setStreak(streak);
    });
  }, []);

  const nav = (path: string) => {
    const params = searchParams.toString();
    router.push(params ? `${path}?${params}` : path);
  };

  const isActive = (path: string) => pathname.includes(path);
  const items    = isAdmin ? [...NAV_ITEMS, ADMIN_ITEM] : NAV_ITEMS;

  // Split items around the center orb
  const mid   = Math.floor(items.length / 2);
  const left  = items.slice(0, mid);
  const right = items.slice(mid);

  async function handleOrbPress() {
    if (loading) return;
    if (checkedIn) {
      nav("/embed/dashboard");
      return;
    }
    setLoading(true);
    const result = await dailyCheckin();
    setLoading(false);
    if (result.success) {
      setCheckedIn(true);
      setStreak(result.streak ?? 0);
    } else if (result.alreadyDone) {
      setCheckedIn(true);
      setStreak(result.streak ?? streak);
    }
  }

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
      <div
        className="flex items-end justify-around px-1 pt-2 pb-6"
        style={{
          background:    "rgba(255,255,255,0.96)",
          backdropFilter: "blur(20px)",
          borderTop:     "1px solid rgba(0,0,0,0.06)",
        }}
      >
        {/* Left tabs */}
        {left.map((item) => (
          <button
            key={item.label}
            onClick={() => nav(item.path)}
            className="flex flex-col items-center gap-1 px-2 pb-0.5"
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-all ${
              isActive(item.path) ? "bg-slate-900" : "bg-transparent"
            }`}>
              {item.icon}
            </div>
            <span className={`text-[10px] font-bold transition-colors ${
              isActive(item.path) ? "text-slate-900" : "text-slate-400"
            }`}>
              {item.label}
            </span>
          </button>
        ))}

        {/* ── Center orb ── */}
        <div className="flex flex-col items-center gap-0.5 -mt-5">
          <CheckInOrb
            size={60}
            checkedIn={checkedIn}
            loading={loading}
            streak={streak}
            onPress={handleOrbPress}
          />
          <span style={{
            fontSize: 10, fontWeight: 800, letterSpacing: 0.2,
            color: checkedIn ? "#48cfad" : "#94a3b8",
            marginTop: 3,
          }}>
            {checkedIn
              ? streak > 0 ? `🔥 ${streak}` : "Done!"
              : "Check In"}
          </span>
        </div>

        {/* Right tabs */}
        {right.map((item) => (
          <button
            key={item.label}
            onClick={() => nav(item.path)}
            className="flex flex-col items-center gap-1 px-2 pb-0.5"
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-all ${
              isActive(item.path) ? "bg-slate-900" : "bg-transparent"
            }`}>
              {item.icon}
            </div>
            <span className={`text-[10px] font-bold transition-colors ${
              isActive(item.path) ? "text-slate-900" : "text-slate-400"
            }`}>
              {item.label}
            </span>
          </button>
        ))}
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

  const [checkedIn, setCheckedIn] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [streak,    setStreak]    = useState(0);

  useEffect(() => {
    getCheckinStatus().then(({ checkedInToday, streak }) => {
      setCheckedIn(checkedInToday);
      setStreak(streak);
    });
  }, []);

  const nav = (path: string) => {
    const params = searchParams.toString();
    router.push(params ? `${path}?${params}` : path);
  };

  const isActive = (path: string) => pathname.includes(path);
  const items    = isAdmin ? [...NAV_ITEMS, ADMIN_ITEM] : NAV_ITEMS;
  const fontStack = "var(--font-inter), system-ui, sans-serif";

  async function handleOrbPress() {
    if (loading) return;
    if (checkedIn) {
      nav("/embed/dashboard");
      return;
    }
    setLoading(true);
    const result = await dailyCheckin();
    setLoading(false);
    if (result.success) {
      setCheckedIn(true);
      setStreak(result.streak ?? 0);
    } else if (result.alreadyDone) {
      setCheckedIn(true);
      setStreak(result.streak ?? streak);
    }
  }

  return (
    <aside style={{
      width: 240, flexShrink: 0, position: "sticky", top: 0,
      height: "100dvh", display: "flex", flexDirection: "column",
      padding: "32px 16px 24px",
      borderRight: "1px solid rgba(0,0,0,0.06)",
      background: "#fff",
    }}>
      {/* Logo */}
      <div style={{ paddingLeft: 12, marginBottom: 28 }}>
        <div style={{ fontSize: 28 }}>🏳️‍🌈</div>
        <p style={{
          fontFamily: fontStack, fontSize: 13, fontWeight: 800, letterSpacing: 2,
          background: "linear-gradient(90deg,#ff3c5f,#ff8c42,#ffd166,#06d6a0,#118ab2,#7b2d8b)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginTop: 2,
        }}>
          Queers & Allies Fitness
        </p>
      </div>

      {/* ── Daily Check-in card ── */}
      <div style={{
        marginBottom: 20,
        padding: "16px 14px",
        borderRadius: 18,
        background: checkedIn
          ? "linear-gradient(135deg,rgba(72,207,173,0.08),rgba(102,126,234,0.06))"
          : "linear-gradient(135deg,rgba(255,107,157,0.07),rgba(102,126,234,0.07))",
        border: `1.5px solid ${checkedIn ? "rgba(72,207,173,0.25)" : "rgba(102,126,234,0.15)"}`,
        display: "flex", alignItems: "center", gap: 14,
      }}>
        <CheckInOrb
          size={52}
          checkedIn={checkedIn}
          loading={loading}
          streak={streak}
          onPress={handleOrbPress}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: fontStack, fontSize: 13, fontWeight: 800, color: "#0f172a", marginBottom: 2 }}>
            {checkedIn ? "Checked in! 🎉" : "Daily Check-in"}
          </p>
          <p style={{ fontSize: 11, color: checkedIn ? "#48cfad" : "#94a3b8", fontWeight: 600 }}>
            {checkedIn
              ? streak > 0 ? `🔥 ${streak}-day streak` : "Keep it up!"
              : streak > 0 ? `🔥 ${streak}-day streak` : "+5 pts · build your streak"}
          </p>
        </div>
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
                fontSize: 15, fontWeight: active ? 800 : 600,
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