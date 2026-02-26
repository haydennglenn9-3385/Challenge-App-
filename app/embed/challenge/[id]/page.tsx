"use client";

// app/embed/challenge/[id]/page.tsx

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

// ─── Constants (calendar only) ───────────────────────────────────────────────

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_LABELS  = ["Su","Mo","Tu","We","Th","Fr","Sa"];
const GLOBAL_POINTS_PER_CHECKIN = 10;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getWeekNum(date: string, challengeStart: string) {
  const s = new Date(challengeStart);
  const d = new Date(date);
  return Math.max(1, Math.floor((d.getTime() - s.getTime()) / (7 * 86400000)) + 1);
}

function getMonthNum(date: string, challengeStart: string) {
  const s = new Date(challengeStart);
  const d = new Date(date);
  return Math.max(1, (d.getFullYear() - s.getFullYear()) * 12 + (d.getMonth() - s.getMonth()) + 1);
}

/**
 * Returns the effective target for a given date based on scoring + progression type.
 * For progressive: target scales with the current period.
 * For everything else: target is flat (daily_target).
 */
function getEffectiveTarget(
  date: string,
  challengeStart: string,
  dailyTarget: number,
  scoringType: string,
  progressionType: string,
): number {
  if (!dailyTarget) return 0;
  if (scoringType !== "progressive") return dailyTarget;

  switch (progressionType) {
    case "weekly":  return dailyTarget * getWeekNum(date, challengeStart);
    case "monthly": return dailyTarget * getMonthNum(date, challengeStart);
    default:        return dailyTarget * getWeekNum(date, challengeStart); // progressive defaults to weekly scaling
  }
}

function calcPoints(completed: number, target: number, pointsMax: number): number {
  if (!target) return pointsMax; // no target = full points
  const ratio = completed / target;
  if (ratio >= 1)        return pointsMax;
  if (ratio >= 0.5)      return Math.round(pointsMax / 2);
  return 0;
}

function computeStreak(logs: { date: string }[]): number {
  if (!logs.length) return 0;
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
  const today  = new Date().toISOString().split("T")[0];
  const last   = sorted[sorted.length - 1].date;
  const daysSinceLast = Math.round(
    (new Date(today).getTime() - new Date(last).getTime()) / 86400000
  );
  if (daysSinceLast > 1) return 0;
  let streak = 1;
  for (let i = sorted.length - 1; i > 0; i--) {
    const diff = Math.round(
      (new Date(sorted[i].date).getTime() - new Date(sorted[i - 1].date).getTime()) / 86400000
    );
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

/** Human-readable check-in frequency label */
function frequencyLabel(progressionType: string, everyX?: number): string {
  switch (progressionType) {
    case "daily":           return "Check in every day";
    case "every_other_day": return "Check in every other day";
    case "weekdays_only":   return "Check in Mon–Fri";
    case "weekly":          return "Check in once per week";
    case "monthly":         return "Check in once per month";
    case "every_x_days":    return `Check in every ${everyX ?? "?"} days`;
    default:                return "Check in daily";
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface EditCard {
  date:           string;
  target:         number;
  completed:      number;
  log_id?:        string;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ChallengeDetailPage() {
  const params      = useParams<{ id: string }>();
  const router      = useRouter();
  const challengeId = typeof params?.id === "string" ? params.id : "";

  // ── Core state ──────────────────────────────────────────────────────────────
  const [challenge,       setChallenge]       = useState<any>(null);
  const [members,         setMembers]         = useState<any[]>([]);
  const [messages,        setMessages]        = useState<any[]>([]);
  const [messageText,     setMessageText]     = useState("");
  const [loading,         setLoading]         = useState(true);
  const [notFound,        setNotFound]        = useState(false);

  // ── User state ──────────────────────────────────────────────────────────────
  const [userId,          setUserId]          = useState("");
  const [isMember,        setIsMember]        = useState(false);
  const [userTeam,        setUserTeam]        = useState("");
  const [userTotalPoints, setUserTotalPoints] = useState(0);
  const [challengeLogs,   setChallengeLogs]   = useState<any[]>([]);
  const [challengeStreak, setChallengeStreak] = useState(0);

  // ── Check-in state ──────────────────────────────────────────────────────────
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [todayPoints,    setTodayPoints]    = useState(0);
  const [checkingIn,     setCheckingIn]     = useState(false);
  const [inputValue,     setInputValue]     = useState(0);

  // ── Edit past days ──────────────────────────────────────────────────────────
  const [showCalendar,  setShowCalendar]  = useState(false);
  const [calMonth,      setCalMonth]      = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [selectedDays,  setSelectedDays]  = useState<Set<string>>(new Set());
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [editCards,     setEditCards]     = useState<EditCard[]>([]);
  const [saving,        setSaving]        = useState(false);
  const [saveSuccess,   setSaveSuccess]   = useState(false);

  // ── Derived challenge values ────────────────────────────────────────────────
  const today      = new Date();
  const todayStr   = today.toISOString().split("T")[0];

  const scoringType     = challenge?.scoring_type     ?? "task_completion";
  const dailyTarget     = Number(challenge?.daily_target ?? 0);
  const targetUnit      = challenge?.target_unit       ?? "reps";
  const pointsMax       = challenge?.local_points_per_checkin ?? 10;
  const progressionType = challenge?.progression_type  ?? "daily";
  const everyXDays      = challenge?.every_x_days_value ?? null;
  const currentWeek     = challenge ? getWeekNum(todayStr, challenge.start_date)  : 1;
  const currentMonth    = challenge ? getMonthNum(todayStr, challenge.start_date) : 1;
  const daysLeft        = challenge
    ? Math.max(0, Math.round((new Date(challenge.end_date).getTime() - today.getTime()) / 86400000))
    : 0;

  const effectiveTarget = challenge
    ? getEffectiveTarget(todayStr, challenge.start_date, dailyTarget, scoringType, progressionType)
    : 0;

  const hasTarget = effectiveTarget > 0;

  // ── Log lookup for calendar ─────────────────────────────────────────────────
  const logsByDate = useMemo(() => {
    const map: Record<string, any> = {};
    challengeLogs.forEach(l => { map[l.date] = l; });
    return map;
  }, [challengeLogs]);

  // ─── Load data ───────────────────────────────────────────────────────────────
  async function loadLogs(uid: string) {
    const { data } = await supabase
      .from("daily_logs")
      .select("*")
      .eq("challenge_id", challengeId)
      .eq("user_id", uid)
      .order("date", { ascending: true });
    const logs = data || [];
    setChallengeLogs(logs);
    setChallengeStreak(computeStreak(logs));
    setCheckedInToday(logs.some(l => l.date === todayStr));
    const todayLog = logs.find(l => l.date === todayStr);
    if (todayLog) setTodayPoints(todayLog.points_earned ?? 0);
    return logs;
  }

  useEffect(() => {
    if (!challengeId) return;

    async function load() {
      // Challenge
      const { data: ch, error: chErr } = await supabase
        .from("challenges").select("*").eq("id", challengeId).single();
      if (chErr || !ch) { setNotFound(true); setLoading(false); return; }
      setChallenge(ch);

      // Members
      const { data: mems } = await supabase
        .from("challenge_members")
        .select("user_id, users(id, name, total_points, streak)")
        .eq("challenge_id", challengeId);
      setMembers((mems || []).map((m: any) => m.users).filter(Boolean));

      // Messages
      const { data: msgs } = await supabase
        .from("team_messages")
        .select("id, text, created_at, users(name)")
        .eq("team_id", ch.team_id)
        .order("created_at", { ascending: true })
        .limit(50);
      setMessages(msgs || []);

      // Auth
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: memberCheck } = await supabase
          .from("challenge_members")
          .select("user_id").eq("challenge_id", challengeId).eq("user_id", user.id).maybeSingle();
        const member = !!memberCheck;
        setIsMember(member);
        if (member) {
          const { data: profile } = await supabase
            .from("users").select("total_points").eq("id", user.id).maybeSingle();
          setUserTotalPoints(profile?.total_points || 0);
          await loadLogs(user.id);
          const { data: teamRow } = await supabase
            .from("team_members").select("team_id, teams(name)").eq("user_id", user.id).maybeSingle();
          if (teamRow?.teams) setUserTeam((teamRow.teams as any).name);
        }
      }
      setLoading(false);
    }

    load();

    // Realtime messages
    const sub = supabase
      .channel(`chat_${challengeId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "team_messages",
        filter: challenge ? `team_id=eq.${challenge?.team_id}` : undefined,
      }, payload => {
        setMessages(prev => [...prev, payload.new as any]);
      })
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [challengeId]);

  // ─── Join / Leave ────────────────────────────────────────────────────────────
  async function handleJoin() {
    if (!userId || !challenge) return;
    await supabase.from("challenge_members").insert({ challenge_id: challengeId, user_id: userId });
    if (challenge.team_id) {
      await supabase.from("team_members").insert({ team_id: challenge.team_id, user_id: userId });
    }
    setIsMember(true);
    await loadLogs(userId);
  }

  async function handleLeave() {
    if (!confirm("Leave this challenge?")) return;
    await supabase.from("challenge_members").delete()
      .eq("challenge_id", challengeId).eq("user_id", userId);
    setIsMember(false);
    setChallengeLogs([]);
    setChallengeStreak(0);
    setCheckedInToday(false);
  }

  // ─── Send message ────────────────────────────────────────────────────────────
  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!messageText.trim() || !userId || !challenge?.team_id) return;
    await supabase.from("team_messages").insert({
      team_id: challenge.team_id,
      author_id: userId,
      text: messageText.trim(),
    });
    setMessageText("");
  }

  // ─── Check-in ────────────────────────────────────────────────────────────────
  async function handleCheckIn() {
    if (!userId || !challengeId || checkedInToday || checkingIn) return;
    setCheckingIn(true);

    const completed = hasTarget ? inputValue : 1;
    const target    = hasTarget ? effectiveTarget : 1;
    const points    = calcPoints(completed, target, pointsMax);

    const { error } = await supabase.from("daily_logs").insert({
      user_id:              userId,
      challenge_id:         challengeId,
      date:                 todayStr,
      reps_completed:       completed,
      reps_target:          target,
      points_earned:        points,
      global_points_earned: GLOBAL_POINTS_PER_CHECKIN,
    });

    if (!error) {
      // Streak
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];
      const hadYesterday = challengeLogs.some(l => l.date === yesterdayStr);
      const newStreak    = hadYesterday ? challengeStreak + 1 : 1;

      // Global points
      const { data: profile } = await supabase
        .from("users").select("total_points").eq("id", userId).maybeSingle();
      const newGlobal = (profile?.total_points || 0) + GLOBAL_POINTS_PER_CHECKIN;

      await supabase.from("users")
        .update({ total_points: newGlobal, streak: newStreak })
        .eq("id", userId);

      // Activity feed
      const { data: uProfile } = await supabase
        .from("users").select("name").eq("id", userId).maybeSingle();
      await supabase.from("activity_feed").insert({
        user_name: uProfile?.name || "Member",
        type:      "streak",
        text:      "checked in!",
        meta:      { challenge_id: challengeId, days: newStreak, points: GLOBAL_POINTS_PER_CHECKIN },
      });

      setCheckedInToday(true);
      setTodayPoints(points);
      setUserTotalPoints(newGlobal);
      setChallengeStreak(newStreak);
      setChallengeLogs(prev => [...prev, { date: todayStr, reps_completed: completed, reps_target: target, points_earned: points }]);
    }

    setCheckingIn(false);
  }

  // ─── Calendar helpers ────────────────────────────────────────────────────────
  function buildCalendarDays(): (number | null)[] {
    const firstDow = new Date(calMonth.y, calMonth.m, 1).getDay();
    const daysInMonth = new Date(calMonth.y, calMonth.m + 1, 0).getDate();
    const cells: (number | null)[] = Array(firstDow).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }

  function toggleDay(dateStr: string) {
    setSelectedDays(prev => {
      const next = new Set(prev);
      next.has(dateStr) ? next.delete(dateStr) : next.add(dateStr);
      return next;
    });
  }

  // ─── Open edit panel ─────────────────────────────────────────────────────────
  function openEditPanel() {
    if (!challenge) return;
    const cards: EditCard[] = Array.from(selectedDays).sort().map(dateStr => {
      const existing = logsByDate[dateStr];
      const target   = getEffectiveTarget(
        dateStr, challenge.start_date, dailyTarget, scoringType, progressionType
      ) || 1;
      return {
        date:      dateStr,
        target,
        completed: existing?.reps_completed ?? 0,
        log_id:    existing?.id,
      };
    });
    setEditCards(cards);
    setShowEditPanel(true);
  }

  // ─── Save edits ──────────────────────────────────────────────────────────────
  async function handleSaveEdits() {
    if (!userId || !challenge) return;
    setSaving(true);

    for (const card of editCards) {
      const points  = calcPoints(card.completed, card.target, pointsMax);
      const payload = {
        user_id:              userId,
        challenge_id:         challengeId,
        date:                 card.date,
        reps_completed:       card.completed,
        reps_target:          card.target,
        points_earned:        points,
        global_points_earned: GLOBAL_POINTS_PER_CHECKIN,
        edited_by:            userId,
        edited_at:            new Date().toISOString(),
      };
      if (card.log_id) {
        await supabase.from("daily_logs").update(payload).eq("id", card.log_id);
      } else {
        await supabase.from("daily_logs").insert(payload);
      }
    }

    // Recalc total_points
    const { data: allLogs } = await supabase
      .from("daily_logs").select("points_earned").eq("user_id", userId);
    const totalPts = (allLogs || []).reduce((s: number, l: any) => s + (l.points_earned || 0), 0);
    await supabase.from("users").update({ total_points: totalPts }).eq("id", userId);
    setUserTotalPoints(totalPts);

    // Reload streak
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

  // ─── Loading / not found ──────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, background: "linear-gradient(135deg,#d4f5e2 0%,#fde0ef 30%,#fdf6d3 60%,#d4eaf7 100%)" }}>
      <div style={{ fontSize: 52 }}>🏳️‍🌈</div>
      <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 18, color: "#7b2d8b", letterSpacing: 2 }}>LOADING...</div>
    </div>
  );

  if (notFound || !challenge) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="neon-card rounded-3xl p-12 text-center max-w-md">
        <div className="text-5xl mb-4">🏋️</div>
        <h2 className="text-2xl font-display mb-4">Challenge not found</h2>
        <button onClick={() => router.push("/embed/challenges")} className="rainbow-cta px-6 py-3 rounded-full font-semibold">
          Browse Challenges
        </button>
      </div>
    </div>
  );

  const calDays = buildCalendarDays();

  // ─── Render ───────────────────────────────────────────────────────────────────
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
        .cal-day.selected-unlogged  { border-color: #7b2d8b; background: #f3e8ff; color: #7b2d8b; }
        .cal-day.selected-logged    {
          background: linear-gradient(135deg,#ff6b9d,#ff9f43,#ffdd59,#48cfad,#667eea);
          color: #fff; outline: 3px solid #7b2d8b; outline-offset: 2px;
        }
        .cal-day.missed             { background: #f1f5f9; color: #94a3b8; }
        .cal-day.today-ring         { box-shadow: 0 0 0 3px #7b2d8b, 0 2px 10px rgba(123,45,139,0.3); }
        .cal-day.future,
        .cal-day.before-start       { background: transparent; color: #e2e8f0; cursor: default; border-color: transparent; }
        .edited-badge               { position: absolute; top: -3px; right: -3px; font-size: 8px; line-height: 1; pointer-events: none; }
        .stepper-btn {
          width: 36px; height: 36px; border-radius: 50%;
          background: #f1f5f9; border: none; font-size: 20px; font-weight: 700;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: background 0.15s; flex-shrink: 0;
        }
        .stepper-btn:hover { background: #e2e8f0; }
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
        .rainbow-btn {
          width: 100%; padding: 14px; border-radius: 16px; border: none;
          background: linear-gradient(90deg,#ff6b9d,#ff9f43,#ffdd59,#48cfad,#667eea);
          color: #1a1a1a; font-size: 15px; font-weight: 800; cursor: pointer;
          font-family: 'DM Sans', sans-serif; transition: opacity 0.15s, box-shadow 0.15s;
        }
        .rainbow-btn:hover  { box-shadow: 0 4px 16px rgba(102,126,234,0.35); }
        .rainbow-btn:active { opacity: 0.85; }
        .rainbow-btn:disabled { opacity: 0.5; cursor: not-allowed; }
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
      `}</style>

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full neon-card flex items-center justify-center text-slate-600 hover:bg-white transition"
        >←</button>
        {challenge.creator_id === userId && (
          <button
            onClick={() => router.push(`/embed/challenge/${challengeId}/manage`)}
            className="px-4 py-2 rounded-full border border-slate-200 bg-white/80 text-sm font-semibold text-slate-700 hover:bg-white transition"
          >
            ✏️ Edit Challenge
          </button>
        )}
      </div>

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <div className="px-4 pb-8 space-y-4 max-w-2xl mx-auto">

        {/* Challenge header */}
        <div className="neon-card rounded-2xl overflow-hidden">
          <div className="h-1.5 w-full rainbow-cta" />
          <div className="px-5 py-5">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500 mb-1">CHALLENGE</p>
            <h1 className="text-3xl font-display font-extrabold text-slate-900 mb-2">{challenge.name}</h1>
            {challenge.description && (
              <p className="text-slate-600 text-sm mb-3">{challenge.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
              <span>👥 {members.length} member{members.length !== 1 ? "s" : ""}</span>
              <span>⏳ {daysLeft} days left</span>
              <span className="font-semibold">Week {currentWeek}</span>
            </div>
            {challenge.join_code && (
              <div className="mt-3">
                <span className="inline-block bg-slate-100 rounded-full px-3 py-1 text-xs font-semibold text-slate-700">
                  Code: {challenge.join_code}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Challenge rules */}
        {challenge.rules && (
          <details className="neon-card rounded-2xl px-5 py-4 cursor-pointer">
            <summary className="font-semibold text-slate-800 list-none flex items-center gap-2">
              <span>▶ 📋 Challenge Rules</span>
            </summary>
            <p className="mt-3 text-sm text-slate-600 whitespace-pre-wrap">{challenge.rules}</p>
          </details>
        )}
        {!challenge.rules && (
          <details className="neon-card rounded-2xl px-5 py-4 cursor-pointer">
            <summary className="font-semibold text-slate-800 list-none flex items-center gap-2">
              <span>▶ 📋 Challenge Rules</span>
            </summary>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <p>📅 {frequencyLabel(progressionType, everyXDays)}</p>
              {hasTarget && (
                <p>🎯 Target: <strong>{effectiveTarget} {targetUnit}</strong>
                  {scoringType === "progressive" && ` (increases each week)`}
                </p>
              )}
              <p>⭐ Scoring: <strong>{challenge.scoring_type?.replace(/_/g, " ")}</strong></p>
              <p>📆 {formatDate(challenge.start_date)} → {formatDate(challenge.end_date)}</p>
            </div>
          </details>
        )}

        {/* Member stats */}
        {isMember && (() => {
          const stats = [
            { value: `🔥 ${challengeStreak}`, label: "Day Streak"   },
            { value: `⭐ ${userTotalPoints}`, label: "Total Points" },
            ...(hasTarget ? [{
              value: String(effectiveTarget),
              label: scoringType === "progressive"
                ? `Week ${currentWeek} Target (${targetUnit})`
                : `Daily Target (${targetUnit})`,
            }] : []),
          ];
          return (
            <div className={`grid gap-3 grid-cols-${stats.length}`}>
              {stats.map(({ value, label }) => (
                <div key={label} className="neon-card rounded-2xl px-3 py-4 text-center">
                  <p className="text-xl font-bold">{value}</p>
                  <p className="text-xs text-slate-500 mt-1">{label}</p>
                </div>
              ))}
            </div>
          );
        })()}

        {/* ── Today's Check-in ─────────────────────────────────────────────── */}
        {isMember && (
          <div className="neon-card rounded-2xl overflow-hidden">
            <div className="h-1 w-full rainbow-cta" />
            <div className="px-5 py-5 space-y-4">

              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500 mb-1">Today's Check-in</p>
                  {hasTarget && (
                    <p className="text-sm text-slate-600">
                      Target: <strong>{effectiveTarget} {targetUnit}</strong>
                      {scoringType === "progressive" && (
                        <span className="ml-2 text-xs text-slate-400">Week {currentWeek}</span>
                      )}
                    </p>
                  )}
                  <p className="text-xs text-slate-400 mt-0.5">
                    {frequencyLabel(progressionType, everyXDays)}
                  </p>
                </div>
                {checkedInToday && (
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-600">+{todayPoints}</p>
                    <p className="text-xs text-slate-500">pts earned</p>
                  </div>
                )}
              </div>

              {/* Already checked in */}
              {checkedInToday ? (
                <div className="rounded-2xl bg-green-50 border border-green-200 p-4 text-center">
                  <p className="text-green-700 font-semibold">✅ Checked in today! Come back tomorrow 💪</p>
                </div>

              ) : !userId ? (
                <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-center">
                  <p className="text-amber-700 text-sm">
                    <button onClick={() => router.push("/auth")} className="underline font-semibold">Log in</button>
                    {" "}to check in
                  </p>
                </div>

              ) : hasTarget ? (
                /* ── Input-based check-in ── */
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <button
                      className="stepper-btn"
                      onClick={() => setInputValue(v => Math.max(0, v - 1))}
                    >−</button>
                    <div className="flex-1 text-center">
                      <input
                        type="number"
                        min={0}
                        value={inputValue}
                        onChange={e => setInputValue(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full text-center text-4xl font-extrabold border-0 bg-transparent focus:outline-none"
                      />
                      <p className="text-xs text-slate-500 mt-0.5">{targetUnit} completed</p>
                    </div>
                    <button
                      className="stepper-btn"
                      onClick={() => setInputValue(v => v + 1)}
                    >+</button>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, Math.round((inputValue / effectiveTarget) * 100))}%`,
                          background: inputValue >= effectiveTarget
                            ? "linear-gradient(90deg,#ff6b9d,#ff9f43,#ffdd59,#48cfad,#667eea)"
                            : inputValue >= effectiveTarget * 0.5
                            ? "linear-gradient(90deg,#48cfad,#667eea)"
                            : "#e5e7eb",
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>0</span>
                      {(scoringType === "tiered" || scoringType === "progressive") && (
                        <span>
                          {inputValue >= effectiveTarget
                            ? `💯 100%+ · +${pointsMax} pts`
                            : inputValue >= Math.ceil(effectiveTarget * 0.5)
                            ? `🎈 50%+ · +${Math.round(pointsMax / 2)} pts`
                            : `😴 <50% · +0 pts`}
                        </span>
                      )}
                      <span>{effectiveTarget}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleCheckIn}
                    disabled={checkingIn || inputValue === 0}
                    className="w-full rainbow-cta rounded-2xl py-3 font-semibold hover:shadow-xl transition disabled:opacity-50"
                  >
                    {checkingIn ? "Saving…" : "Log Check-in"}
                  </button>
                </div>

              ) : (
                /* ── Single-tap check-in ── */
                <button
                  onClick={handleCheckIn}
                  disabled={checkingIn}
                  className="w-full rainbow-cta rounded-2xl py-4 font-semibold text-lg hover:shadow-xl transition disabled:opacity-50"
                >
                  {checkingIn ? "Saving…" : `✅ Check In · +${pointsMax} pts`}
                </button>
              )}

            </div>
          </div>
        )}

        {/* Edit Past Days */}
        {isMember && (
          <button
            onClick={() => { setShowCalendar(true); setSelectedDays(new Set()); setSaveSuccess(false); }}
            className="w-full neon-card rounded-2xl py-4 font-semibold text-slate-700 hover:bg-white transition text-center"
          >
            📅 Edit Past Days
          </button>
        )}

        {/* Live Chat */}
        <div className="neon-card rounded-2xl overflow-hidden">
          <div className="h-1 w-full rainbow-cta" />
          <div className="px-5 py-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-extrabold text-slate-900">Live Chat</h3>
              <span className="neon-chip rounded-full px-3 py-1 text-xs font-semibold">Streak squad</span>
            </div>
            <div className="space-y-3 max-h-[240px] overflow-y-auto pr-1">
              {messages.length === 0 && (
                <p className="text-sm text-slate-500">No messages yet. Start the hype! 🎉</p>
              )}
              {messages.map((msg: any) => (
                <div key={msg.id} className="rounded-2xl border border-slate-100 bg-white/80 p-3">
                  <p className="text-sm font-semibold">{msg.users?.name || "Member"}</p>
                  <p className="text-sm text-slate-600">{msg.text}</p>
                </div>
              ))}
            </div>
            <form onSubmit={handleSendMessage} className="mt-4 flex gap-2">
              <input
                type="text"
                value={messageText}
                onChange={e => setMessageText(e.target.value)}
                placeholder={userId ? "Cheer them on..." : "Log in to chat"}
                disabled={!userId}
                className="flex-1 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
              <button
                type="submit"
                disabled={!userId || !messageText.trim()}
                className="rainbow-cta rounded-full px-4 py-2 font-semibold text-sm disabled:opacity-50"
              >Send</button>
            </form>
          </div>
        </div>

        {/* Challenge Crew */}
        <div className="neon-card rounded-2xl overflow-hidden">
          <div className="h-1 w-full" style={{ background: "#f1f5f9" }} />
          <div className="px-5 py-5">
            <h3 className="text-lg font-extrabold text-slate-900 mb-4">Challenge Crew</h3>
            <div className="space-y-3">
              {members.length === 0 && (
                <p className="text-sm text-slate-500">Invite with code: <strong>{challenge.join_code}</strong></p>
              )}
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

        {/* Join / Leave */}
        {!userId && (
          <div className="neon-card rounded-2xl p-6 text-center">
            <p className="text-slate-600 mb-4 text-sm">Log in to join this challenge and check in</p>
            <button onClick={() => router.push("/auth")} className="rainbow-cta px-6 py-3 rounded-full font-semibold">
              Log in / Sign up
            </button>
          </div>
        )}
        {userId && !isMember && (
          <div className="neon-card rounded-2xl p-6 text-center">
            <button onClick={handleJoin} className="rainbow-cta px-6 py-3 rounded-full font-semibold">
              Join Challenge
            </button>
          </div>
        )}
        {userId && isMember && (
          <div className="neon-card rounded-2xl p-5 text-center">
            <button
              onClick={handleLeave}
              className="px-6 py-3 rounded-full font-semibold border border-red-300 bg-red-50 text-red-600 hover:bg-red-100 transition text-sm"
            >
              Leave Challenge
            </button>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          SHEET 1 — Month Calendar
      ══════════════════════════════════════════════════════════════ */}
      {showCalendar && (
        <div
          className="sheet-backdrop"
          onClick={e => { if (e.target === e.currentTarget) { setShowCalendar(false); setSelectedDays(new Set()); } }}
        >
          <div className="sheet-panel">
            <div className="sheet-handle" />

            {/* Month nav */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <button
                className="stepper-btn"
                onClick={() => setCalMonth(p => {
                  const d = new Date(p.y, p.m - 1);
                  return { y: d.getFullYear(), m: d.getMonth() };
                })}
                disabled={!!challenge.start_date && toDateStr(calMonth.y, calMonth.m, 1) <= challenge.start_date.slice(0, 7) + "-01"}
              >‹</button>
              <p style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 22, color: "#0e0e0e", letterSpacing: 1 }}>
                {MONTH_NAMES[calMonth.m]} {calMonth.y}
              </p>
              <button
                className="stepper-btn"
                onClick={() => setCalMonth(p => {
                  const d = new Date(p.y, p.m + 1);
                  return { y: d.getFullYear(), m: d.getMonth() };
                })}
                disabled={calMonth.y === today.getFullYear() && calMonth.m >= today.getMonth()}
                style={{ opacity: (calMonth.y === today.getFullYear() && calMonth.m >= today.getMonth()) ? 0.3 : 1 }}
              >›</button>
            </div>

            {/* Legend */}
            <div style={{ display: "flex", gap: 14, marginBottom: 16, flexWrap: "wrap" }}>
              {[
                { bg: "linear-gradient(135deg,#ff6b9d,#667eea)", label: "Logged" },
                { bg: "#f1f5f9",                                 label: "Missed" },
                { bg: "#f3e8ff", border: "2px solid #7b2d8b",   label: "Selected" },
              ].map(s => (
                <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 14, height: 14, borderRadius: "50%", background: s.bg, border: s.border || "none", flexShrink: 0 }} />
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
                const dateStr       = toDateStr(calMonth.y, calMonth.m, day);
                const isToday       = dateStr === todayStr;
                const isFuture      = dateStr > todayStr;
                const isBeforeStart = challenge.start_date && dateStr < challenge.start_date;
                const log           = logsByDate[dateStr];
                const isLogged      = !!log;
                const isEdited      = !!log?.edited_at;
                const isSelected    = selectedDays.has(dateStr);
                const disabled      = isFuture || !!isBeforeStart;

                let cls = "cal-day ";
                if (disabled)                    cls += "future";
                else if (isLogged && isSelected) cls += "selected-logged";
                else if (isLogged)               cls += "logged";
                else if (isSelected)             cls += "selected-unlogged";
                else                             cls += "missed";
                if (isToday && !disabled)        cls += " today-ring";

                return (
                  <button key={dateStr} className={cls} onClick={() => !disabled && toggleDay(dateStr)} disabled={disabled}>
                    {day}
                    {isEdited && <span className="edited-badge">✏️</span>}
                  </button>
                );
              })}
            </div>

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
        <div
          className="sheet-backdrop"
          onClick={e => { if (e.target === e.currentTarget) setShowEditPanel(false); }}
        >
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
              {hasTarget
                ? `💯 ≥ target = ${pointsMax} pts · 🎈 ≥ 50% = ${Math.round(pointsMax / 2)} pts · <50% = 0 pts`
                : `Each check-in = ${pointsMax} pts`
              }
            </p>

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
                    const points     = calcPoints(card.completed, card.target, pointsMax);
                    const pct        = card.target > 0 ? Math.min(100, Math.round((card.completed / card.target) * 100)) : 100;
                    const pctLabel   = !hasTarget ? `+${points} pts`
                                     : points === pointsMax ? "💯 100%+"
                                     : points > 0           ? "🎈 50%+"
                                     : "😴 <50%";
                    const isExisting = !!card.log_id;
                    return (
                      <div key={card.date} style={{
                        background: isExisting ? "#fff" : "#fafafa",
                        borderRadius: 20, padding: "16px 16px 14px",
                        border: `1.5px solid ${isExisting ? "#e8d9f7" : "#f1f5f9"}`,
                        boxShadow: isExisting ? "0 2px 12px rgba(123,45,139,0.08)" : "none",
                      }}>
                        {/* Date row */}
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                          <div>
                            <p style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>
                              {new Date(card.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                              {isExisting && <span style={{ marginLeft: 6, color: "#c084fc" }}>✏️ editing</span>}
                            </p>
                            {hasTarget && (
                              <p style={{ fontSize: 13, fontWeight: 700, color: "#0e0e0e", marginTop: 2 }}>
                                Target: {card.target} {targetUnit}
                              </p>
                            )}
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <p style={{ fontSize: 22, fontWeight: 900, color: points > 0 ? "#7b2d8b" : "#cbd5e1", lineHeight: 1 }}>+{points}</p>
                            <p style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700 }}>{pctLabel}</p>
                          </div>
                        </div>

                        {hasTarget ? (
                          <>
                            {/* Stepper */}
                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                              <button
                                className="stepper-btn"
                                onClick={() => setEditCards(p => p.map((c, j) => j === i ? { ...c, completed: Math.max(0, c.completed - 1) } : c))}
                              >−</button>
                              <div style={{ flex: 1 }}>
                                <p style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, textAlign: "center", marginBottom: 4 }}>
                                  {targetUnit} completed
                                </p>
                                <input
                                  className="edit-num-input"
                                  type="number"
                                  min={0}
                                  value={card.completed}
                                  onChange={e => setEditCards(p => p.map((c, j) => j === i
                                    ? { ...c, completed: Math.max(0, parseInt(e.target.value) || 0) }
                                    : c
                                  ))}
                                />
                              </div>
                              <button
                                className="stepper-btn"
                                onClick={() => setEditCards(p => p.map((c, j) => j === i ? { ...c, completed: c.completed + 1 } : c))}
                              >+</button>
                              <div style={{ textAlign: "center", flexShrink: 0, minWidth: 40 }}>
                                <p style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Target</p>
                                <p style={{ fontSize: 20, fontWeight: 900, color: "#0e0e0e" }}>{card.target}</p>
                              </div>
                            </div>
                            {/* Progress bar */}
                            <div style={{ height: 5, borderRadius: 99, background: "#f1f5f9", overflow: "hidden" }}>
                              <div style={{
                                height: "100%", borderRadius: 99,
                                width: `${pct}%`,
                                background: pct >= 100 ? "linear-gradient(90deg,#ff6b9d,#ff9f43,#ffdd59,#48cfad,#667eea)"
                                          : pct >= 50  ? "linear-gradient(90deg,#48cfad,#667eea)"
                                          : "#e5e7eb",
                                transition: "width 0.25s ease",
                              }} />
                            </div>
                          </>
                        ) : (
                          /* No target — simple toggle */
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              onClick={() => setEditCards(p => p.map((c, j) => j === i ? { ...c, completed: 1 } : c))}
                              style={{
                                flex: 1, padding: "10px", borderRadius: 12, border: "2px solid",
                                borderColor: card.completed === 1 ? "#48cfad" : "#e5e7eb",
                                background:  card.completed === 1 ? "#f0fdf8" : "#fafafa",
                                fontWeight: 700, fontSize: 13, cursor: "pointer",
                              }}
                            >✅ Done</button>
                            <button
                              onClick={() => setEditCards(p => p.map((c, j) => j === i ? { ...c, completed: 0 } : c))}
                              style={{
                                flex: 1, padding: "10px", borderRadius: 12, border: "2px solid",
                                borderColor: card.completed === 0 ? "#f87171" : "#e5e7eb",
                                background:  card.completed === 0 ? "#fff1f1" : "#fafafa",
                                fontWeight: 700, fontSize: 13, cursor: "pointer",
                              }}
                            >❌ Missed</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <button className="rainbow-btn" onClick={handleSaveEdits} disabled={saving}>
                  {saving ? "Saving…" : "Save All Changes"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}