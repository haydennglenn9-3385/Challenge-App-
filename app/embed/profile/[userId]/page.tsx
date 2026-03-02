"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar_emoji?: string;
  total_points: number;
  global_points?: number;
  streak: number;
  created_at: string;
}

interface JoinedChallenge {
  id: string;
  name: string;
  join_code: string;
  start_date: string | null;
  end_date: string | null;
  scoring_type: string | null;
}

interface PublicPR {
  id: string;
  type: string;
  label: string;
  value: number;
  unit: string;
  date: string;
  notes?: string;
  previous_value?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, #ff6b9d, #ff9f43)",
  "linear-gradient(135deg, #48cfad, #667eea)",
  "linear-gradient(135deg, #a855f7, #ff6b9d)",
  "linear-gradient(135deg, #ff9f43, #ffdd59)",
];

function gradientForId(id: string) {
  const n = id.charCodeAt(0) + id.charCodeAt(id.length - 1);
  return AVATAR_GRADIENTS[n % AVATAR_GRADIENTS.length];
}

function formatDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function challengeStatus(c: JoinedChallenge): "active" | "upcoming" | "ended" {
  const today = new Date().toISOString().split("T")[0];
  if (!c.start_date || c.start_date <= today) {
    if (!c.end_date || c.end_date >= today) return "active";
    return "ended";
  }
  return "upcoming";
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  active:   { bg: "#dcfce7", color: "#16a34a", label: "Active"    },
  upcoming: { bg: "#fef3c7", color: "#d97706", label: "Upcoming"  },
  ended:    { bg: "#f1f5f9", color: "#94a3b8", label: "Ended"     },
};

function prImprovementLabel(pr: PublicPR): string | null {
  if (!pr.previous_value || pr.previous_value === pr.value) return null;
  const isTimed = pr.unit === "min" || pr.unit === "sec" || pr.unit === "secs" || pr.unit === "mins";
  const improved = isTimed ? pr.value < pr.previous_value : pr.value > pr.previous_value;
  if (!improved) return null;
  const delta = Math.abs(pr.value - pr.previous_value);
  return `+${delta % 1 === 0 ? delta : delta.toFixed(1)} ${pr.unit}`;
}

// Best PR per label (highest value; for timed units lowest)
function bestPRsPerLabel(prs: PublicPR[]): PublicPR[] {
  const map: Record<string, PublicPR> = {};
  for (const pr of prs) {
    const existing = map[pr.label];
    if (!existing) { map[pr.label] = pr; continue; }
    const isTimed = pr.unit === "min" || pr.unit === "sec" || pr.unit === "secs" || pr.unit === "mins";
    if (isTimed ? pr.value < existing.value : pr.value > existing.value) {
      map[pr.label] = pr;
    }
  }
  return Object.values(map).sort((a, b) => a.label.localeCompare(b.label));
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PublicProfilePage() {
  const params   = useParams<{ userId: string }>();
  const router   = useRouter();
  const userId   = typeof params?.userId === "string" ? params.userId : "";

  const [profile,    setProfile]    = useState<UserProfile | null>(null);
  const [challenges, setChallenges] = useState<JoinedChallenge[]>([]);
  const [prs,        setPrs]        = useState<PublicPR[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [notFound,   setNotFound]   = useState(false);
  const [viewerSelf, setViewerSelf] = useState(false); // viewing your own profile

  useEffect(() => {
    if (!userId) return;

    async function load() {
      // 1. Fetch user profile
      const { data: userData, error: userErr } = await supabase
        .from("users")
        .select("id, name, email, avatar_emoji, total_points, global_points, streak, created_at")
        .eq("id", userId)
        .single();

      if (userErr || !userData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setProfile(userData);

      // 2. Check if viewer is the same person (for a subtle hint)
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser?.id === userId) setViewerSelf(true);

      // 3. Joined challenges
      const { data: memberRows } = await supabase
        .from("challenge_members")
        .select(`
          challenge_id,
          challenges (id, name, join_code, start_date, end_date, scoring_type)
        `)
        .eq("user_id", userId);

      const joined = (memberRows || [])
        .map((r: any) => r.challenges)
        .filter(Boolean) as JoinedChallenge[];

      // Sort: active first, then upcoming, then ended
      const order = { active: 0, upcoming: 1, ended: 2 };
      joined.sort((a, b) => order[challengeStatus(a)] - order[challengeStatus(b)]);
      setChallenges(joined);

      // 4. Public PRs only
      const { data: prData } = await supabase
        .from("performance_records")
        .select("id, type, label, value, unit, date, notes, previous_value")
        .eq("user_id", userId)
        .eq("is_public", true)
        .order("date", { ascending: false });

      setPrs(prData || []);
      setLoading(false);
    }

    load();
  }, [userId]);

  // ─── Derived ─────────────────────────────────────────────────────────────────

  const avatarEmoji    = profile?.avatar_emoji || "🏳️‍🌈";
  const avatarGradient = profile ? gradientForId(profile.id) : AVATAR_GRADIENTS[0];
  const displayPts     = profile?.global_points ?? profile?.total_points ?? 0;
  const bestPRs        = bestPRsPerLabel(prs);

  const activeChallenges  = challenges.filter(c => challengeStatus(c) === "active");
  const endedChallenges   = challenges.filter(c => challengeStatus(c) !== "active");

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{
        minHeight: "100dvh",
        background: "linear-gradient(135deg, #d4f5e2 0%, #fde0ef 30%, #fdf6d3 60%, #d4eaf7 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: 12,
        fontFamily: "var(--font-inter), system-ui, sans-serif",
      }}>
        <div style={{ fontSize: 48 }}>🏳️‍🌈</div>
        <div style={{ fontSize: 16, color: "#7b2d8b", letterSpacing: 2, fontWeight: 700 }}>LOADING…</div>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div style={{
        minHeight: "100dvh",
        background: "linear-gradient(135deg, #d4f5e2 0%, #fde0ef 30%, #fdf6d3 60%, #d4eaf7 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: 16, padding: 24,
        fontFamily: "var(--font-inter), system-ui, sans-serif",
      }}>
        <div style={{ fontSize: 52 }}>🤷</div>
        <p style={{ fontSize: 20, fontWeight: 800, color: "#0e0e0e" }}>Member not found</p>
        <p style={{ fontSize: 14, color: "#64748b", textAlign: "center" }}>
          This profile doesn&apos;t exist or may have been removed.
        </p>
        <button
          onClick={() => router.back()}
          style={{
            marginTop: 8, padding: "10px 24px", borderRadius: 999,
            background: "linear-gradient(90deg,#ff6b9d,#ff9f43,#ffdd59,#48cfad,#4fc3f7,#667eea)",
            border: "none", color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer",
          }}
        >
          ← Go Back
        </button>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; }
        ::-webkit-scrollbar { display: none; }

        .pub-card {
          background: rgba(255,255,255,0.85);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255,255,255,0.6);
          box-shadow: 0 4px 24px rgba(0,0,0,0.06);
        }

        .rainbow-bar {
          height: 6px;
          width: 100%;
          background: linear-gradient(90deg, #ff6b9d, #ff9f43, #ffdd59, #48cfad, #4fc3f7, #667eea, #a855f7);
          background-size: 200%;
          animation: rainbowShift 4s linear infinite;
        }

        @keyframes rainbowShift {
          0%   { background-position: 0% }
          100% { background-position: 200% }
        }

        .stat-pill {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.7);
          border: 1px solid rgba(0,0,0,0.06);
          border-radius: 16px;
          padding: 14px 20px;
          min-width: 90px;
          flex: 1;
        }

        .challenge-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px solid #f1f5f9;
          gap: 10px;
        }
        .challenge-row:last-child { border-bottom: none; }

        .pr-chip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 12px 14px;
          gap: 10px;
        }

        .section-title {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #94a3b8;
          margin-bottom: 12px;
        }
      `}</style>

      <div style={{
        minHeight: "100dvh",
        background: "linear-gradient(135deg, #d4f5e2 0%, #fde0ef 30%, #fdf6d3 60%, #d4eaf7 100%)",
        fontFamily: "var(--font-inter), system-ui, sans-serif",
        padding: "0 0 80px",
      }}>

        {/* ── Top bar ─────────────────────────────────────────────────────── */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "16px 20px 8px",
        }}>
          <button
            onClick={() => router.back()}
            style={{
              background: "rgba(255,255,255,0.8)",
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: 12,
              width: 36, height: 36,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, cursor: "pointer",
              color: "#334155",
            }}
          >
            ←
          </button>
          <div>
            <p style={{
              fontSize: 10, fontWeight: 800, letterSpacing: "0.18em",
              textTransform: "uppercase",
              background: "linear-gradient(90deg,#ff6b9d,#ff9f43,#ffdd59,#48cfad,#4fc3f7,#667eea)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              Queers &amp; Allies Fitness
            </p>
            <p style={{ fontSize: 15, fontWeight: 800, color: "#0e0e0e" }}>Member Profile</p>
          </div>
        </div>

        {/* ── Hero card ───────────────────────────────────────────────────── */}
        <div style={{ padding: "8px 16px 0" }}>
          <div className="pub-card" style={{ borderRadius: 24, overflow: "hidden" }}>
            <div className="rainbow-bar" />
            <div style={{ padding: "24px 20px 20px" }}>

              {/* Avatar + name row */}
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
                <div style={{
                  width: 68, height: 68,
                  borderRadius: 20,
                  background: avatarGradient,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 32, flexShrink: 0,
                }}>
                  {avatarEmoji}
                </div>
                <div>
                  <p style={{ fontSize: 22, fontWeight: 900, color: "#0e0e0e", lineHeight: 1.1 }}>
                    {profile.name}
                  </p>
                  <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>
                    Member since {formatDate(profile.created_at)}
                  </p>
                  {viewerSelf && (
                    <button
                      onClick={() => router.push("/embed/profile")}
                      style={{
                        marginTop: 6,
                        fontSize: 11, fontWeight: 700,
                        color: "#667eea",
                        background: "none", border: "none", cursor: "pointer", padding: 0,
                      }}
                    >
                      Edit your profile →
                    </button>
                  )}
                </div>
              </div>

              {/* Stats row */}
              <div style={{ display: "flex", gap: 10 }}>
                <div className="stat-pill">
                  <p style={{ fontSize: 22, fontWeight: 900, color: "#0e0e0e" }}>{displayPts.toLocaleString()}</p>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", marginTop: 2 }}>Points</p>
                </div>
                <div className="stat-pill">
                  <p style={{ fontSize: 22, fontWeight: 900, color: "#ff6b9d" }}>
                    {profile.streak > 0 ? `🔥 ${profile.streak}` : "—"}
                  </p>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", marginTop: 2 }}>Day Streak</p>
                </div>
                <div className="stat-pill">
                  <p style={{ fontSize: 22, fontWeight: 900, color: "#48cfad" }}>{challenges.length}</p>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", marginTop: 2 }}>Challenges</p>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ── Active challenges ────────────────────────────────────────────── */}
        {activeChallenges.length > 0 && (
          <div style={{ padding: "20px 16px 0" }}>
            <div className="pub-card" style={{ borderRadius: 20, padding: "18px 16px" }}>
              <p className="section-title">Active Challenges</p>
              {activeChallenges.map(c => {
                const st = STATUS_STYLES[challengeStatus(c)];
                return (
                  <div key={c.id} className="challenge-row">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "#0e0e0e", marginBottom: 2 }}>
                        {c.name}
                      </p>
                      {c.end_date && (
                        <p style={{ fontSize: 12, color: "#94a3b8" }}>
                          Ends {formatDate(c.end_date)}
                        </p>
                      )}
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 800,
                      padding: "4px 10px", borderRadius: 999,
                      background: st.bg, color: st.color,
                      flexShrink: 0,
                    }}>
                      {st.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Public PRs ──────────────────────────────────────────────────── */}
        {bestPRs.length > 0 && (
          <div style={{ padding: "20px 16px 0" }}>
            <div className="pub-card" style={{ borderRadius: 20, padding: "18px 16px" }}>
              <p className="section-title">Personal Records</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {bestPRs.map(pr => {
                  const improvement = prImprovementLabel(pr);
                  const categoryIcon =
                    pr.type === "strength"  ? "💪" :
                    pr.type === "cardio"    ? "🏃" :
                    pr.type === "endurance" ? "⏱️" : "⭐";

                  return (
                    <div key={pr.id} className="pr-chip">
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 20, flexShrink: 0 }}>{categoryIcon}</span>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: "#0e0e0e" }}>{pr.label}</p>
                          <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>{formatDate(pr.date)}</p>
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <p style={{ fontSize: 16, fontWeight: 900, color: "#334155" }}>
                          {pr.value % 1 === 0 ? pr.value : pr.value.toFixed(1)}
                          <span style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", marginLeft: 3 }}>
                            {pr.unit}
                          </span>
                        </p>
                        {improvement && (
                          <p style={{ fontSize: 11, fontWeight: 700, color: "#48cfad", marginTop: 1 }}>
                            ↑ {improvement}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Past challenges ──────────────────────────────────────────────── */}
        {endedChallenges.length > 0 && (
          <div style={{ padding: "20px 16px 0" }}>
            <div className="pub-card" style={{ borderRadius: 20, padding: "18px 16px" }}>
              <p className="section-title">Past Challenges</p>
              {endedChallenges.map(c => {
                const st = STATUS_STYLES[challengeStatus(c)];
                return (
                  <div key={c.id} className="challenge-row">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "#334155" }}>{c.name}</p>
                      {c.end_date && (
                        <p style={{ fontSize: 12, color: "#94a3b8" }}>Ended {formatDate(c.end_date)}</p>
                      )}
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 800,
                      padding: "4px 10px", borderRadius: 999,
                      background: st.bg, color: st.color,
                      flexShrink: 0,
                    }}>
                      {st.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Empty state for PRs ──────────────────────────────────────────── */}
        {bestPRs.length === 0 && !loading && (
          <div style={{ padding: "20px 16px 0" }}>
            <div className="pub-card" style={{
              borderRadius: 20, padding: "28px 20px",
              textAlign: "center",
            }}>
              <p style={{ fontSize: 36, marginBottom: 10 }}>🏆</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#334155" }}>No public PRs yet</p>
              <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>
                {profile.name.split(" ")[0]} hasn&apos;t shared any personal records.
              </p>
            </div>
          </div>
        )}

      </div>
    </>
  );
}