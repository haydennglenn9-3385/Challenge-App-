"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function HomePage() {
  const router = useRouter();
  const [popularChallenges, setPopularChallenges] = useState<any[]>([]);
  const [checkingAuth, setCheckingAuth] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [liveStats, setLiveStats] = useState({ teams: 0, challenges: 0, members: 0 });

  useEffect(() => {
    setMounted(true);
    async function loadData() {
      const [{ data: challenges }, { count: teamCount }, { count: memberCount }] = await Promise.all([
        supabase
          .from("challenges")
          .select(`id, name, start_date, end_date, is_public, challenge_members(count)`)
          .eq("is_public", true)
          .order("created_at", { ascending: false })
          .limit(3),
        supabase.from("teams").select("id", { count: "exact", head: true }),
        supabase.from("users").select("id", { count: "exact", head: true }).is("deleted_at", null),
      ]);
      if (challenges) setPopularChallenges(challenges);
      setLiveStats({
        teams: teamCount ?? 0,
        challenges: challenges?.length ?? 0,
        members: memberCount ?? 0,
      });
    }
    loadData();
  }, []);

  async function handleDashboard() {
    setCheckingAuth(true);
    const { data: { user } } = await supabase.auth.getUser();
    router.push(user ? "/embed/dashboard" : "/auth");
    setCheckingAuth(false);
  }

  const getDaysLeft = (endDate: string) =>
    Math.max(0, Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000));

  const stats = [
    { value: liveStats.teams.toString(), label: "Active Teams" },
    { value: liveStats.challenges.toString(), label: "Public Challenges" },
    { value: liveStats.members.toString(), label: "Members" },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&display=swap');

        :root {
          --rainbow: linear-gradient(90deg, #ff6b9d, #ff9f43, #ffdd59, #48cfad, #4fc3f7, #667eea, #a855f7);
          --rainbow-diag: linear-gradient(135deg, #ff6b9d, #ff9f43, #ffdd59, #48cfad, #667eea);
          --dark: #0a0a0f;
          --card: rgba(255,255,255,0.04);
          --border: rgba(255,255,255,0.08);
        }

        .landing-root {
          min-height: 100vh;
          background: var(--dark);
          font-family: var(--font-inter), system-ui, sans-serif;
          color: white;
          overflow-x: hidden;
        }

        /* Animated gradient orbs in background */
        .orb {
          position: fixed;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.18;
          pointer-events: none;
          animation: orbFloat 12s ease-in-out infinite;
        }
        .orb-1 { width: 500px; height: 500px; background: #ff6b9d; top: -150px; left: -100px; animation-delay: 0s; }
        .orb-2 { width: 400px; height: 400px; background: #667eea; bottom: -100px; right: -100px; animation-delay: -4s; }
        .orb-3 { width: 300px; height: 300px; background: #48cfad; top: 40%; left: 40%; animation-delay: -8s; }

        @keyframes orbFloat {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -20px) scale(1.05); }
          66% { transform: translate(-20px, 15px) scale(0.95); }
        }

        /* Rainbow animated top bar */
        .rainbow-bar {
          height: 3px;
          background: var(--rainbow);
          background-size: 200% 100%;
          animation: rainbowShift 3s linear infinite;
        }
        @keyframes rainbowShift {
          0% { background-position: 0% center; }
          100% { background-position: 200% center; }
        }

        /* Nav */
        .nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          position: relative;
          z-index: 10;
        }
        .nav-logo {
          font-family: var(--font-inter), system-ui, sans-serif;
          font-size: 20px;
          letter-spacing: 2px;
          background: var(--rainbow);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .nav-btn {
          padding: 8px 20px;
          border-radius: 100px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid var(--border);
          background: var(--card);
          color: rgba(255,255,255,0.8);
          backdrop-filter: blur(10px);
        }
        .nav-btn:hover { background: rgba(255,255,255,0.1); color: white; }

        /* Hero */
        .hero {
          position: relative;
          z-index: 5;
          padding: 40px 24px 60px;
          max-width: 480px;
          margin: 0 auto;
          text-align: center;
        }

        .pill-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 100px;
          border: 1px solid rgba(255,107,157,0.3);
          background: rgba(255,107,157,0.08);
          font-size: 12px;
          font-weight: 700;
          color: #ff9f43;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          margin-bottom: 20px;
        }
        .pill-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #48cfad;
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }

        .hero-title {
          font-family: var(--font-inter), system-ui, sans-serif;
          font-size: clamp(52px, 14vw, 76px);
          line-height: 0.95;
          letter-spacing: 1px;
          margin-bottom: 8px;
        }
        .hero-title-main { color: white; display: block; }
        .hero-title-accent {
          display: block;
          background: var(--rainbow);
          background-size: 200% 100%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: rainbowShift 4s linear infinite;
        }

        .hero-sub {
          font-size: 15px;
          color: rgba(255,255,255,0.5);
          line-height: 1.6;
          margin: 16px 0 32px;
          font-weight: 400;
        }

        /* CTA buttons */
        .cta-group {
          display: flex;
          flex-direction: column;
          gap: 12px;
          align-items: center;
        }
        .cta-primary {
          width: 100%;
          max-width: 320px;
          padding: 16px 32px;
          border-radius: 100px;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
          border: none;
          background: var(--rainbow);
          background-size: 200% 100%;
          animation: rainbowShift 3s linear infinite;
          color: #0a0a0f;
          letter-spacing: 0.02em;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 0 30px rgba(255,107,157,0.3);
        }
        .cta-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 40px rgba(255,107,157,0.4);
        }
        .cta-secondary {
          display: flex;
          gap: 10px;
          width: 100%;
          max-width: 320px;
        }
        .cta-ghost {
          flex: 1;
          padding: 13px 16px;
          border-radius: 100px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          border: 1px solid var(--border);
          background: var(--card);
          color: rgba(255,255,255,0.7);
          backdrop-filter: blur(10px);
          transition: all 0.2s;
          text-decoration: none;
          text-align: center;
        }
        .cta-ghost:hover { background: rgba(255,255,255,0.08); color: white; border-color: rgba(255,255,255,0.15); }

        /* Stats row */
        .stats-row {
          display: flex;
          justify-content: center;
          gap: 0;
          margin: 48px 24px 0;
          position: relative;
          z-index: 5;
          max-width: 480px;
          margin-left: auto;
          margin-right: auto;
        }
        .stat-item {
          flex: 1;
          text-align: center;
          padding: 20px 12px;
          background: var(--card);
          border: 1px solid var(--border);
          backdrop-filter: blur(10px);
        }
        .stat-item:first-child { border-radius: 20px 0 0 20px; }
        .stat-item:last-child { border-radius: 0 20px 20px 0; }
        .stat-item:not(:first-child) { border-left: none; }
        .stat-value {
          font-family: var(--font-inter), system-ui, sans-serif;
          font-size: 32px;
          line-height: 1;
          margin-bottom: 4px;
          background: var(--rainbow);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .stat-label {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: rgba(255,255,255,0.35);
        }

        /* Divider */
        .section-divider {
          margin: 48px 24px 32px;
          max-width: 480px;
          margin-left: auto;
          margin-right: auto;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .divider-line {
          flex: 1;
          height: 1px;
          background: var(--border);
        }
        .divider-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: rgba(255,255,255,0.25);
        }

        /* Challenge cards */
        .challenges-section {
          padding: 0 24px 100px;
          max-width: 480px;
          margin: 0 auto;
          position: relative;
          z-index: 5;
        }
        .challenge-card {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 18px 20px;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 16px;
          backdrop-filter: blur(10px);
          transition: all 0.2s;
          cursor: pointer;
          text-decoration: none;
        }
        .challenge-card:hover {
          background: rgba(255,255,255,0.07);
          border-color: rgba(255,255,255,0.14);
          transform: translateY(-1px);
        }
        .challenge-icon {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
          background: rgba(255,107,157,0.12);
        }
        .challenge-name {
          font-size: 15px;
          font-weight: 700;
          color: white;
          margin-bottom: 2px;
        }
        .challenge-meta {
          font-size: 12px;
          color: rgba(255,255,255,0.35);
          font-weight: 500;
        }
        .challenge-badge {
          margin-left: auto;
          padding: 4px 10px;
          border-radius: 100px;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          background: rgba(72,207,173,0.15);
          color: #48cfad;
          flex-shrink: 0;
        }

        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: rgba(255,255,255,0.25);
          font-size: 14px;
        }

        .browse-all {
          display: block;
          width: 100%;
          padding: 14px;
          border-radius: 14px;
          border: 1px solid var(--border);
          background: transparent;
          color: rgba(255,255,255,0.4);
          font-size: 13px;
          font-weight: 700;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          margin-top: 12px;
          text-decoration: none;
        }
        .browse-all:hover { background: var(--card); color: rgba(255,255,255,0.7); }

        /* Fade-in on mount */
        .fade-in { opacity: 0; transform: translateY(16px); transition: opacity 0.5s ease, transform 0.5s ease; }
        .fade-in.visible { opacity: 1; transform: translateY(0); }
        .delay-1 { transition-delay: 0.1s; }
        .delay-2 { transition-delay: 0.2s; }
        .delay-3 { transition-delay: 0.3s; }
        .delay-4 { transition-delay: 0.4s; }
      `}</style>

      <div className="landing-root">
        {/* Background orbs */}
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />

        {/* Rainbow top bar */}
        <div className="rainbow-bar" />

        {/* Nav */}
        <nav className="nav">
          <span className="nav-logo">Q&A Fitness</span>
          <button className="nav-btn" onClick={handleDashboard}>
            {checkingAuth ? "..." : "Sign In →"}
          </button>
        </nav>

        {/* Hero */}
        <section className="hero">
          <div className={`fade-in ${mounted ? "visible" : ""}`}>
            <div className="pill-badge">
              <span className="pill-dot" />
              Sacramento, CA · Est. 2022
            </div>
          </div>

          <div className={`fade-in delay-1 ${mounted ? "visible" : ""}`}>
            <h1 className="hero-title">
              <span className="hero-title-main">Queers &</span>
              <span className="hero-title-main">Allies</span>
              <span className="hero-title-accent">Fitness</span>
            </h1>
          </div>

          <div className={`fade-in delay-2 ${mounted ? "visible" : ""}`}>
            <p className="hero-sub">
              Streak-based fitness challenges built for your crew.
              Track workouts, compete on the leaderboard, and keep each other moving — every single day.
            </p>
          </div>

          <div className={`cta-group fade-in delay-3 ${mounted ? "visible" : ""}`}>
            <button
              className="cta-primary"
              onClick={handleDashboard}
              disabled={checkingAuth}
            >
              {checkingAuth ? "Loading…" : "🏳️‍🌈  Enter the App"}
            </button>
            <div className="cta-secondary">
              <Link href="/auth" className="cta-ghost">Sign Up</Link>
              <Link href="/embed/challenges" className="cta-ghost">Challenges</Link>
            </div>
          </div>
        </section>

        {/* Stats */}
        <div className={`stats-row fade-in delay-4 ${mounted ? "visible" : ""}`}>
          {stats.map((s) => (
            <div key={s.label} className="stat-item">
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Active Challenges */}
        <div className="section-divider">
          <div className="divider-line" />
          <span className="divider-label">Active Challenges</span>
          <div className="divider-line" />
        </div>

        <div className="challenges-section">
          {popularChallenges.length === 0 ? (
            <div className="empty-state">
              No public challenges yet — be the first to create one.
            </div>
          ) : (
            popularChallenges.map((challenge, i) => {
              const memberCount = challenge.challenge_members?.[0]?.count ?? 0;
              const isOngoing   = challenge.end_date === null;
              const daysLeft    = !isOngoing && challenge.end_date
                ? Math.max(0, Math.ceil((new Date(challenge.end_date).getTime() - Date.now()) / 86400000))
                : null;
              const icons = ["⚡", "🔥", "💪"];
              return (
                <Link
                  key={challenge.id}
                  href="/embed/challenges"
                  className="challenge-card"
                >
                  <div className="challenge-icon">{icons[i % 3]}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="challenge-name">{challenge.name}</div>
                    <div className="challenge-meta">
                      {memberCount} member{memberCount !== 1 ? "s" : ""} ·{" "}
                      {isOngoing ? "Ongoing" : `${daysLeft} days left`}
                    </div>
                  </div>
                  <span className="challenge-badge">Active</span>
                </Link>
              );
            })
          )}

          <Link href="/embed/challenges" className="browse-all">
            Browse all challenges →
          </Link>
        </div>
      </div>
    </>
  );
}