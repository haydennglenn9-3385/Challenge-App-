"use client";

// app/embed/challenge/[id]/page.tsx --- Challenge Detail + Edit Past Days

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

// ─── Exercise schedule ────────────────────────────────────────────────────────

const EXERCISES: Record<number, { name: string; emoji: string }> = {
  0: { name: "Jumping Jacks", emoji: "⭐" },
  1: { name: "Lunges", emoji: "🦵" },
  2: { name: "Push-ups", emoji: "💪" },
  3: { name: "Glute Bridges", emoji: "🍑" },
  4: { name: "Crunches", emoji: "🔥" },
  5: { name: "Squats", emoji: "🏋️" },
  6: { name: "Bird Dogs", emoji: "🐦" },
};

const BASE_REPS = 5;
const REPS_INCREMENT = 5;
const BASE_CARDIO = 5;
const CARDIO_INCREMENT = 5;
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_LABELS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getWeekNum(date: string, challengeStart: string) {
  const s = new Date(challengeStart);
  const d = new Date(date);
  return Math.max(1, Math.floor((d.getTime() - s.getTime()) / (7 * 86400000)) + 1);
}

function getRepsTarget(date: string, challengeStart: string) {
  return BASE_REPS + (getWeekNum(date, challengeStart) - 1) * REPS_INCREMENT;
}

function calcPoints(repsCompleted: number, repsTarget: number): { points: number; level: string } {
  if (repsCompleted >= repsTarget) return { points: 2, level: "100" };
  if (repsCompleted >= Math.ceil(repsTarget * 0.5)) return { points: 1, level: "50" };
  return { points: 0, level: "0" };
}

function computeStreak(logs: { date: string }[]): number {
  if (!logs.length) return 0;
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
  const today = new Date().toISOString().split("T")[0];
  const last = sorted[sorted.length - 1].date;
  const daysSinceLast = Math.round((new Date(today).getTime() - new Date(last).getTime()) / 86400000);
  if (daysSinceLast > 1) return 0;
  let streak = 1;
  for (let i = sorted.length - 1; i > 0; i--) {
    const diff = Math.round((new Date(sorted[i].date).getTime() - new Date(sorted[i - 1].date).getTime()) / 86400000);
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

function formatDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${m.padStart(2,"0")}/${day.padStart(2,"0")}/${y.slice(-2)}`;
}

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface EditCard {
  date: string;
  exercise: string;
  exerciseEmoji: string;
  reps_target: number;
  reps_completed: number;
  log_id?: string;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ChallengeDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const challengeId = typeof params?.id === "string" ? params.id : "";

  const [challenge, setChallenge] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [userId, setUserId] = useState("");
  const [isMember, setIsMember] = useState(false);
  const [userTeam, setUserTeam] = useState("");
  const [userTotalPoints, setUserTotalPoints] = useState(0);
  const [challengeLogs, setChallengeLogs] = useState<any[]>([]);
  const [challengeStreak, setChallengeStreak] = useState(0);

  // ── Edit past days ────────────────────────────────────────────────────────
  const [showCalendar, setShowCalendar] = useState(false);
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [editCards, setEditCards] = useState<EditCard[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const currentReps = challenge ? getRepsTarget(todayStr, challenge.start_date) : BASE_REPS;
  const currentWeek = challenge ? getWeekNum(todayStr, challenge.start_date) : 1;
  const daysLeft = challenge ? Math.max(0, Math.ceil((new Date(challenge.end_date).getTime() - Date.now()) / 86400000)) : 0;
  const isCreator = userId && challenge && userId === challenge.creator_id;

  // O(1) date → log lookup
  const logsByDate = useMemo(() => {
    const map: Record<string, any> = {};
    challengeLogs.forEach(l => { map[l.date] = l; });
    return map;
  }, [challengeLogs]);

  // ─── Load logs helper (reused after saves) ────────────────────────────────

  async function loadLogs(uid: string) {
    const { data: logs } = await supabase
      .from("daily_logs").select("*")
      .eq("user_id", uid).eq("challenge_id", challengeId)
      .order("date", { ascending: true });
    setChallengeLogs(logs || []);
    setChallengeStreak(computeStreak(logs || []));
    return logs || [];
  }

  // ─── Initial load ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!challengeId) return;

    async function load() {
      const { data: ch } = await supabase.from("challenges").select("*").eq("id", challengeId).maybeSingle();
      if (!ch) { setNotFound(true); setLoading(false); return; }
      setChallenge(ch);

      const { data: memberRows } = await supabase
        .from("challenge_members").select("user_id, users(id, name, total_points, streak)").eq("challenge_id", challengeId);
      setMembers((memberRows || []).map((r: any) => r.users).filter(Boolean));

      const { data: msgs } = await supabase.from("messages")
        .select("id, text, created_at, author_id, users(name)")
        .eq("topic", `challenge:${challengeId}`)
        .order("created_at", { ascending: true }).limit(50);
      setMessages(msgs || []);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);

      const { data: memberCheck } = await supabase.from("challenge_members").select("id")
        .eq("challenge_id", challengeId).eq("user_id", user.id).maybeSingle();
      const member = !!memberCheck;
      setIsMember(member);

      if (member) {
        const { data: profile } = await supabase.from("users").select("total_points").eq("id", user.id).maybeSingle();
        setUserTotalPoints(profile?.total_points || 0);
        await loadLogs(user.id);
        const { data: teamRow } = await supabase.from("team_members").select("team_id, teams(name)").eq("user_id", user.id).maybeSingle();
        if (teamRow?.teams) setUserTeam((teamRow.teams as any).name);
      }

      setLoading(false);
    }

    load();
  }, [challengeId]);

  // ─── Send message ─────────────────────────────────────────────────────────

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!messageText.trim() || !userId) return;
    await supabase.from("messages").insert({ author_id: userId, topic: `challenge:${challengeId}`, text: messageText.trim() });
    const { data: msgs } = await supabase.from("messages")
      .select("id, text, created_at, author_id, users(name)")
      .eq("topic", `challenge:${challengeId}`)
      .order("created_at", { ascending: true }).limit(50);
    setMessages(msgs || []);
    setMessageText("");
  }

  // ─── Join / Leave ─────────────────────────────────────────────────────────

  async function handleJoin() {
    if (!userId) return;
    const { error } = await supabase.from("challenge_members").insert({ user_id: userId, challenge_id: challengeId });
    if (!error) window.location.reload();
  }

  async function handleLeave() {
    if (!userId) return;
    const { error } = await supabase.from("challenge_members").delete().eq("user_id", userId).eq("challenge_id", challengeId);
    if (!error) window.location.reload();
  }

  // ─── Calendar helpers ─────────────────────────────────────────────────────

  function buildCalendarDays() {
    const { y, m } = calMonth;
    const firstDow = new Date(y, m, 1).getDay();
    const daysInMon = new Date(y, m + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMon; d++) cells.push(d);
    return cells;
  }

  function toggleDay(dateStr: string) {
    setSelectedDays(prev => {
      const next = new Set(prev);
      next.has(dateStr) ? next.delete(dateStr) : next.add(dateStr);
      return next;
    });
  }

  function openEditPanel() {
    if (!challenge) return;
    const sorted = [...selectedDays].sort();
    const cards: EditCard[] = sorted.map(dateStr => {
      const dow = new Date(dateStr + "T12:00:00").getDay();
      const ex = EXERCISES[dow];
      const target = getRepsTarget(dateStr, challenge.start_date);
      const existing = logsByDate[dateStr];
      return {
        date: dateStr,
        exercise: ex.name,
        exerciseEmoji: ex.emoji,
        reps_target: target,
        reps_completed: existing?.reps_completed ?? target,
        log_id: existing?.id,
      };
    });
    setEditCards(cards);
    setShowEditPanel(true);
  }

  // ─── Save edits ───────────────────────────────────────────────────────────

  async function handleSaveEdits() {
    if (!userId || !challenge) return;
    setSaving(true);
    for (const card of editCards) {
      const { points, level } = calcPoints(card.reps_completed, card.reps_target);
      const dow = new Date(card.date + "T12:00:00").getDay();
      const payload = {
        user_id: userId,
        challenge_id: challengeId,
        date: card.date,
        exercise: EXERCISES[dow].name,
        reps_completed: card.reps_completed,
        reps_target: card.reps_target,
        completion_level: level,
        points_earned: points,
        edited_by: userId,
        edited_at: new Date().toISOString(),
      };
      if (card.log_id) {
        await supabase.from("daily_logs").update(payload).eq("id", card.log_id);
      } else {
        await supabase.from("daily_logs").insert(payload);
      }
    }

    // Recalculate total_points by summing ALL logs across all challenges
    const { data: allLogs } = await supabase
      .from("daily_logs").select("points_earned").eq("user_id", userId);
    const totalPts = (allLogs || []).reduce((s: number, l: any) => s + (l.points_earned || 0), 0);
    await supabase.from("users").update({ total_points: totalPts }).eq("id", userId);
    setUserTotalPoints(totalPts);

    // Reload + repair streak
    const freshLogs = await loadLogs(userId);
    const newStreak = computeStreak(freshLogs);
    await supabase.from("users").update({ streak: newStreak }).eq("id", userId);
    setChallengeStreak(newStreak);
    setSaving(false);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setShowEditPanel(false);
      setShowCalendar(false);
      setSelectedDays(new Set());
      setEditCards([]);
    }, 2200);
  }

  // ─── Loading / not found ──────────────────────────────────────────────────

  if (loading) return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, background: "linear-gradient(135deg, #d4f5e2 0%, #fde0ef 30%, #fdf6d3 60%, #d4eaf7 100%)" }}>
      <div style={{ fontSize: 52 }}>🏳️‍🌈</div>
      <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 18, color: "#7b2d8b", letterSpacing: 2 }}>LOADING...</div>
    </div>
  );

  if (notFound || !challenge) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="neon-card rounded-3xl p-12 text-center max-w-md">
        <div className="text-5xl mb-4">🏋️</div>
        <h2 className="text-2xl font-display mb-4">Challenge not found</h2>
        <button onClick={() => router.push("/embed/challenges")} className="rainbow-cta px-6 py-3 rounded-full font-semibold">Browse Challenges</button>
      </div>
    </div>
  );

  const calDays = buildCalendarDays();

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        .cal-day {
          width: 38px; height: 38px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 700; cursor: pointer;
          position: relative; transition: transform 0.12s;
          border: 2px solid transparent;
          font-family: 'DM Sans', sans-serif;
          -webkit-tap-highlight-color: transparent;
        }
        .cal-day:active { transform: scale(0.88); }
        .cal-day.logged {
          background: linear-gradient(135deg,#ff6b9d,#ff9f43,#ffdd59,#48cfad,#667eea);
          color: #fff; box-shadow: 0 2px 10px rgba(102,126,234,0.35);
        }
        .cal-day.selected-unlogged {
          border-color: #7b2d8b; background: #f3e8ff; color: #7b2d8b;
        }
        .cal-day.selected-logged {
          background: linear-gradient(135deg,#ff6b9d,#ff9f43,#ffdd59,#48cfad,#667eea);
          color: #fff; outline: 3px solid #7b2d8b; outline-offset: 2px;
        }
        .cal-day.missed { background: #f1f5f9; color: #94a3b8; }
        .cal-day.today-ring { box-shadow: 0 0 0 3px #7b2d8b, 0 2px 10px rgba(123,45,139,0.3); }
        .cal-day.future,
        .cal-day.before-start { background: transparent; color: #e2e8f0; cursor: default; border-color: transparent; }
        .edited-badge {
          position: absolute; top: -3px; right: -3px;
          font-size: 8px; line-height: 1;
          pointer-events: none;
        }
        .edit-num-input {
          width: 100%; padding: 10px 8px; border-radius: 12px;
          border: 1.5px solid #e5e7eb; background: #fff;
          font-size: 18px; font-weight: 800; text-align: center;
          font-family: 'DM Sans', sans-serif; outline: none;
          -moz-appearance: textfield;
        }
        .edit-num-input:focus { border-color: #7b2d8b; }
        .edit-num-input::-webkit-inner-spin-button,
        .edit-num-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .sheet-backdrop {
          position: fixed; inset: 0; z-index: 80;
          background: rgba(0,0,0,0.45); backdrop-filter: blur(6px);
          display: flex; flex-direction: column; justify-content: flex-end;
        }
        .sheet-panel {
          background: #fff; border-radius: 28px 28px 0 0;
          max-height: 92dvh; overflow-y: auto;
          padding: 8px 20px 52px;
          -webkit-overflow-scrolling: touch;
        }
        .sheet-handle {
          width: 40px; height: 4px; border-radius: 99px;
          background: #e5e7eb; margin: 12px auto 20px;
        }
        .rainbow-btn {
          width: 100%; padding: 16px; border-radius: 16px; border: none;
          background: linear-gradient(90deg,#ff3c5f,#ff8c42,#ffd166,#06d6a0,#118ab2,#7b2d8b);
          color: #fff; font-size: 15px; font-weight: 800; cursor: pointer;
          font-family: 'DM Sans', sans-serif; letter-spacing: 0.3px;
          transition: opacity 0.15s;
        }
        .rainbow-btn:disabled { opacity: 0.45; cursor: default; }
        .stepper-btn {
          width: 36px; height: 36px; border-radius: 10px;
          border: 1.5px solid #e5e7eb; background: #f8f9fa;
          font-size: 20px; cursor: pointer; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          font-family: 'DM Sans', sans-serif; font-weight: 700;
          transition: background 0.1s;
        }
        .stepper-btn:active { background: #e5e7eb; }
      `}</style>

      <div className="min-h-screen px-5 pt-6 pb-28 space-y-5">

        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button onClick={() => router.push("/embed/challenges")}
            className="w-9 h-9 rounded-full neon-card flex items-center justify-center text-slate-600 hover:bg-white transition flex-shrink-0">←</button>
          {isCreator && (
            <button onClick={() => router.push(`/embed/challenge/${challengeId}/edit`)}
              className="text-xs font-bold px-4 py-2 rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors">
              ✏️ Edit Challenge
            </button>
          )}
        </div>

        {/* Hero */}
        <div className="neon-card rounded-2xl overflow-hidden">
          <div className="h-1.5 w-full rainbow-cta" />
          <div className="px-5 py-5 space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Challenge</p>
            <h2 className="text-3xl font-display font-extrabold text-slate-900 leading-tight">{challenge.name}</h2>
            {challenge.description && <p className="text-sm text-slate-600 whitespace-pre-line">{challenge.description}</p>}
            <div className="flex items-center gap-4 text-sm text-slate-500 flex-wrap">
              <span>👥 {members.length} members</span>
              <span>⏳ {daysLeft} days left</span>
              <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Week {currentWeek}</span>
              {userTeam && <span className="text-xs font-bold bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">{userTeam}</span>}
            </div>
            <div className="pt-1">
              <span className="neon-chip rounded-full px-3 py-1 text-xs font-semibold">Code: {challenge.join_code}</span>
            </div>
          </div>
        </div>

        {/* Rules */}
        <details className="neon-card rounded-2xl overflow-hidden">
          <div className="h-1 w-full" style={{ background: "linear-gradient(90deg,#ff6b9d,#ff9f43,#ffdd59,#48cfad,#667eea)" }} />
          <summary className="px-5 py-4 font-extrabold text-slate-900 cursor-pointer text-sm">📋 Challenge Rules</summary>
          <div className="px-5 pb-5 space-y-3 text-sm text-slate-600">
            <p className="whitespace-pre-line">{challenge.rules || "No rules provided."}</p>
            <div>
              <p className="font-semibold text-slate-800 mb-1">⏳ Challenge Duration</p>
              <p>{formatDate(challenge.start_date)} → {formatDate(challenge.end_date)}</p>
            </div>
          </div>
        </details>

        {/* Member stats */}
        {isMember && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: `🔥 ${challengeStreak}`, label: "Day Streak" },
              { value: `⭐ ${userTotalPoints}`, label: "Total Points" },
              { value: `${currentReps}`, label: "Reps Target" },
            ].map(({ value, label }) => (
              <div key={label} className="neon-card rounded-2xl px-3 py-4 text-center">
                <p className="text-xl font-bold">{value}</p>
                <p className="text-xs text-slate-500 mt-1">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Edit Past Days */}
        {isMember && (
          <button
            onClick={() => { setShowCalendar(true); setSelectedDays(new Set()); setSaveSuccess(false); }}
            className="w-full py-3 rounded-xl text-sm font-bold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
          >
            📅 Edit Past Days
          </button>
        )}

        {/* Community */}
        <div className="space-y-4">
          <div className="neon-card rounded-2xl overflow-hidden">
            <div className="h-1 w-full rainbow-cta" />
            <div className="px-5 py-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-extrabold text-slate-900">Live Chat</h3>
                <span className="neon-chip rounded-full px-3 py-1 text-xs font-semibold">Streak squad</span>
              </div>
              <div className="space-y-3 max-h-[240px] overflow-y-auto pr-1">
                {messages.length === 0 && <p className="text-sm text-slate-500">No messages yet. Start the hype! 🎉</p>}
                {messages.map((msg: any) => (
                  <div key={msg.id} className="rounded-2xl border border-slate-100 bg-white/80 p-3">
                    <p className="text-sm font-semibold">{(msg.users as any)?.name || "Member"}</p>
                    <p className="text-sm text-slate-600">{msg.text}</p>
                  </div>
                ))}
              </div>
              <form onSubmit={handleSendMessage} className="mt-4 flex gap-2">
                <input type="text" value={messageText} onChange={(e) => setMessageText(e.target.value)}
                  placeholder={userId ? "Cheer them on..." : "Log in to chat"} disabled={!userId}
                  className="flex-1 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
                <button type="submit" disabled={!userId || !messageText.trim()}
                  className="rainbow-cta rounded-full px-4 py-2 font-semibold text-sm disabled:opacity-50">Send</button>
              </form>
            </div>
          </div>

          <div className="neon-card rounded-2xl overflow-hidden">
            <div className="h-1 w-full" style={{ background: "#f1f5f9" }} />
            <div className="px-5 py-5">
              <h3 className="text-lg font-extrabold text-slate-900 mb-4">Challenge Crew</h3>
              <div className="space-y-3">
                {members.length === 0 && <p className="text-sm text-slate-500">Invite with code: <strong>{challenge.join_code}</strong></p>}
                {members.map((member: any) => (
                  <div key={member.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white/80 px-4 py-3">
                    <div>
                      <p className="font-semibold text-sm">{member.name}</p>
                      <p className="text-xs text-slate-500">⭐ {member.total_points || 0} pts</p>
                    </div>
                    <span className="text-sm font-semibold">🔥 {member.streak || 0}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Join / Leave */}
        {!userId && (
          <div className="neon-card rounded-2xl p-6 text-center">
            <p className="text-slate-600 mb-4 text-sm">Log in to join this challenge and check in daily</p>
            <button onClick={() => router.push("/auth")} className="rainbow-cta px-6 py-3 rounded-full font-semibold">Log in / Sign up</button>
          </div>
        )}

        {userId && !isMember && (
          <div className="neon-card rounded-2xl p-6 text-center">
            <button onClick={handleJoin} className="rainbow-cta px-6 py-3 rounded-full font-semibold">Join Challenge</button>
          </div>
        )}

        {userId && isMember && (
          <div className="neon-card rounded-2xl p-5 text-center">
            <button onClick={handleLeave}
              className="px-6 py-3 rounded-full font-semibold border border-red-300 bg-red-50 text-red-600 hover:bg-red-100 transition text-sm">
              Leave Challenge
            </button>
          </div>
        )}

      </div>

      {/* ══════════════════════════════════════════════════════════════
          SHEET 1 — Month Calendar
          ══════════════════════════════════════════════════════════════ */}
      {showCalendar && (
        <div className="sheet-backdrop"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowCalendar(false); setSelectedDays(new Set()); } }}>
          <div className="sheet-panel">
            <div className="sheet-handle" />

            {/* Month nav */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <button
                className="stepper-btn"
                onClick={() => setCalMonth(p => { const d = new Date(p.y, p.m - 1); return { y: d.getFullYear(), m: d.getMonth() }; })}
                disabled={challenge.start_date && toDateStr(calMonth.y, calMonth.m, 1) < challenge.start_date.slice(0, 7) + "-01"}
              >‹</button>
              <p style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 22, color: "#0e0e0e", letterSpacing: 1 }}>
                {MONTH_NAMES[calMonth.m]} {calMonth.y}
              </p>
              <button
                className="stepper-btn"
                onClick={() => setCalMonth(p => { const d = new Date(p.y, p.m + 1); return { y: d.getFullYear(), m: d.getMonth() }; })}
                disabled={calMonth.y === today.getFullYear() && calMonth.m >= today.getMonth()}
                style={{ opacity: (calMonth.y === today.getFullYear() && calMonth.m >= today.getMonth()) ? 0.3 : 1 }}
              >›</button>
            </div>

            {/* Legend */}
            <div style={{ display: "flex", gap: 14, marginBottom: 16, flexWrap: "wrap" }}>
              {[
                { bg: "linear-gradient(135deg,#ff6b9d,#667eea)", label: "Logged" },
                { bg: "#f1f5f9", label: "Missed", color: "#94a3b8" },
                { bg: "#f3e8ff", label: "Selected", border: "2px solid #7b2d8b" },
              ].map(s => (
                <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 14, height: 14, borderRadius: "50%", background: s.bg, border: (s as any).border || "none", flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: "#666", fontWeight: 600 }}>{s.label}</span>
                </div>
              ))}
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ fontSize: 10 }}>✏️</span>
                <span style={{ fontSize: 11, color: "#666", fontWeight: 600 }}>Edited</span>
              </div>
            </div>

            {/* Day headers */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 6 }}>
              {DAY_LABELS.map(d => (
                <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "#94a3b8", paddingBottom: 4 }}>{d}</div>
              ))}
            </div>

            {/* Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "8px 4px", justifyItems: "center", marginBottom: 28 }}>
              {calDays.map((day, idx) => {
                if (day === null) return <div key={`b${idx}`} style={{ width: 38, height: 38 }} />;
                const dateStr = toDateStr(calMonth.y, calMonth.m, day);
                const isToday = dateStr === todayStr;
                const isFuture = dateStr > todayStr;
                const isBeforeStart = challenge.start_date && dateStr < challenge.start_date;
                const log = logsByDate[dateStr];
                const isLogged = !!log;
                const isEdited = !!log?.edited_at;
                const isSelected = selectedDays.has(dateStr);
                const disabled = isFuture || !!isBeforeStart;
                let cls = "cal-day ";
                if (disabled) cls += "future";
                else if (isLogged && isSelected) cls += "selected-logged";
                else if (isLogged) cls += "logged";
                else if (isSelected) cls += "selected-unlogged";
                else cls += "missed";
                if (isToday && !disabled) cls += " today-ring";
                return (
                  <button key={dateStr} className={cls} onClick={() => !disabled && toggleDay(dateStr)} disabled={disabled}>
                    {day}
                    {isEdited && <span className="edited-badge">✏️</span>}
                  </button>
                );
              })}
            </div>

            {/* CTA */}
            {selectedDays.size > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <p style={{ textAlign: "center", fontSize: 13, color: "#7b2d8b", fontWeight: 700 }}>
                  {selectedDays.size} day{selectedDays.size !== 1 ? "s" : ""} selected
                </p>
                <button className="rainbow-btn" onClick={openEditPanel}>
                  Edit Selected Days →
                </button>
              </div>
            ) : (
              <p style={{ textAlign: "center", fontSize: 13, color: "#94a3b8", fontWeight: 600 }}>
                Tap any past day to select it
              </p>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          SHEET 2 — Edit cards
          ══════════════════════════════════════════════════════════════ */}
      {showEditPanel && (
        <div className="sheet-backdrop"
          onClick={(e) => { if (e.target === e.currentTarget) setShowEditPanel(false); }}>
          <div className="sheet-panel">
            <div className="sheet-handle" />

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <button
                onClick={() => setShowEditPanel(false)}
                style={{ background: "#f1f5f9", border: "none", borderRadius: 10, padding: "6px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", color: "#555", flexShrink: 0 }}
              >← Back</button>
              <p style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 20, color: "#0e0e0e", letterSpacing: 1 }}>
                {editCards.length} Day{editCards.length !== 1 ? "s" : ""} to Edit
              </p>
            </div>

            <p style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600, marginBottom: 20 }}>
              💯 ≥ target = 2 pts · 🎈 ≥ 50% of target = 1 pt · below 50% = 0 pts
            </p>

            {/* Success state */}
            {saveSuccess ? (
              <div style={{ textAlign: "center", padding: "48px 20px" }}>
                <div style={{ fontSize: 56, marginBottom: 14 }}>🎉</div>
                <p style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 24, color: "#7b2d8b", letterSpacing: 1 }}>All Saved!</p>
                <p style={{ fontSize: 14, color: "#666", marginTop: 6 }}>Streak & points recalculated ✨</p>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
                  {editCards.map((card, i) => {
                    const { points, level } = calcPoints(card.reps_completed, card.reps_target);
                    const pct = Math.min(100, Math.round((card.reps_completed / card.reps_target) * 100));
                    const pctLabel = level === "100" ? "💯 100%+" : level === "50" ? "🎈 50%+" : "😴 <50%";
                    const isExisting = !!card.log_id;
                    return (
                      <div key={card.date} style={{
                        background: isExisting ? "#fff" : "#fafafa",
                        borderRadius: 20, padding: "16px 16px 14px",
                        border: `1.5px solid ${isExisting ? "#e8d9f7" : "#f1f5f9"}`,
                        boxShadow: isExisting ? "0 2px 12px rgba(123,45,139,0.08)" : "none",
                      }}>
                        {/* Date + exercise row */}
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                          <div>
                            <p style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>
                              {new Date(card.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                              {isExisting && <span style={{ marginLeft: 6, color: "#c084fc" }}>✏️ editing</span>}
                            </p>
                            <p style={{ fontSize: 16, fontWeight: 800, color: "#0e0e0e", marginTop: 2 }}>
                              {card.exerciseEmoji} {card.exercise}
                            </p>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <p style={{ fontSize: 22, fontWeight: 900, color: points > 0 ? "#7b2d8b" : "#cbd5e1", lineHeight: 1 }}>+{points}</p>
                            <p style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700 }}>pts · {pctLabel}</p>
                          </div>
                        </div>

                        {/* Stepper */}
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                          <button className="stepper-btn"
                            onClick={() => setEditCards(p => p.map((c, j) => j === i ? { ...c, reps_completed: Math.max(0, c.reps_completed - 1) } : c))}>
                            −
                          </button>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, textAlign: "center", marginBottom: 4 }}>Reps Completed</p>
                            <input
                              className="edit-num-input"
                              type="number" min={0}
                              value={card.reps_completed}
                              onChange={(e) => setEditCards(p => p.map((c, j) => j === i ? { ...c, reps_completed: Math.max(0, parseInt(e.target.value) || 0) } : c))}
                            />
                          </div>
                          <button className="stepper-btn"
                            onClick={() => setEditCards(p => p.map((c, j) => j === i ? { ...c, reps_completed: c.reps_completed + 1 } : c))}>
                            +
                          </button>
                          <div style={{ textAlign: "center", flexShrink: 0, minWidth: 40 }}>
                            <p style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Target</p>
                            <p style={{ fontSize: 20, fontWeight: 900, color: "#0e0e0e" }}>{card.reps_target}</p>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div style={{ height: 5, borderRadius: 99, background: "#f1f5f9", overflow: "hidden" }}>
                          <div style={{
                            height: "100%", borderRadius: 99,
                            width: `${pct}%`,
                            background: pct >= 100
                              ? "linear-gradient(90deg,#ff6b9d,#ff9f43,#ffdd59,#48cfad,#667eea)"
                              : pct >= 50 ? "linear-gradient(90deg,#48cfad,#667eea)"
                              : "#e5e7eb",
                            transition: "width 0.25s ease",
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button className="rainbow-btn" onClick={handleSaveEdits} disabled={saving}>
                  {saving ? "Saving & recalculating..." : `Save All ${editCards.length} Day${editCards.length !== 1 ? "s" : ""} 🔥`}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}