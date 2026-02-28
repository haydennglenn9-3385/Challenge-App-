// app/embed/challenge/[id]/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

// ─── Constants ────────────────────────────────────────────────────────────────

const GLOBAL_POINTS_PER_CHECKIN = 10;

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWeekNum(date: string, start: string): number {
  const diff = new Date(date).getTime() - new Date(start).getTime();
  return Math.max(1, Math.ceil((diff / 86400000 + 1) / 7));
}

function getMonthNum(date: string, start: string): number {
  const d = new Date(date);
  const s = new Date(start);
  return Math.max(1, (d.getFullYear() - s.getFullYear()) * 12 + (d.getMonth() - s.getMonth()) + 1);
}

/**
 * Returns the effective daily target for a given date.
 * Progressive challenges scale the target by week or month.
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
    default:        return dailyTarget * getWeekNum(date, challengeStart);
  }
}

function calcPoints(completed: number, target: number, pointsMax: number): number {
  if (!target) return pointsMax;
  const ratio = completed / target;
  if (ratio >= 1)   return pointsMax;
  if (ratio >= 0.5) return Math.round(pointsMax / 2);
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
  return `${m.padStart(2, "0")}/${day.padStart(2, "0")}/${y.slice(-2)}`;
}

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function frequencyLabel(progressionType: string, everyX?: number | null): string {
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
  date:      string;
  target:    number;
  completed: number;
  log_id?:   string;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ChallengeDetailPage() {
  const params      = useParams<{ id: string }>();
  const router      = useRouter();
  const challengeId = typeof params?.id === "string" ? params.id : "";

  // ── Core state ───────────────────────────────────────────────────────────────
  const [challenge,       setChallenge]       = useState<any>(null);
  const [members,         setMembers]         = useState<any[]>([]);
  const [messages,        setMessages]        = useState<any[]>([]);
  const [messageText,     setMessageText]     = useState("");
  const [loading,         setLoading]         = useState(true);
  const [notFound,        setNotFound]        = useState(false);

  // ── User state ───────────────────────────────────────────────────────────────
  const [userId,          setUserId]          = useState("");
  const [isMember,        setIsMember]        = useState(false);
  const [isCreator,       setIsCreator]       = useState(false);
  const [userTeam,        setUserTeam]        = useState("");
  const [userTotalPoints, setUserTotalPoints] = useState(0);
  const [challengeLogs,   setChallengeLogs]   = useState<any[]>([]);
  const [challengeStreak, setChallengeStreak] = useState(0);

  // ── Check-in state ───────────────────────────────────────────────────────────
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [todayPoints,    setTodayPoints]    = useState(0);
  const [checkingIn,     setCheckingIn]     = useState(false);
  const [inputValue,     setInputValue]     = useState(0);

  // ── Edit past days state ─────────────────────────────────────────────────────
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

  // ── Derived values ───────────────────────────────────────────────────────────
  const today    = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const scoringType     = challenge?.scoring_type          ?? "task_completion";
  const dailyTarget     = Number(challenge?.daily_target   ?? 0);
  const targetUnit      = challenge?.target_unit           ?? "reps";
  const pointsMax       = challenge?.local_points_per_checkin ?? 10;
  const progressionType = challenge?.progression_type      ?? "daily";
  const everyXDays      = challenge?.every_x_days_value    ?? null;
  const currentWeek     = challenge ? getWeekNum(todayStr,  challenge.start_date) : 1;
  const daysLeft        = challenge
    ? Math.max(0, Math.round((new Date(challenge.end_date).getTime() - today.getTime()) / 86400000))
    : 0;
  const effectiveTarget = challenge
    ? getEffectiveTarget(todayStr, challenge.start_date, dailyTarget, scoringType, progressionType)
    : 0;
  const hasTarget = effectiveTarget > 0;

  // O(1) date → log lookup for calendar
  const logsByDate = useMemo(() => {
    const map: Record<string, any> = {};
    challengeLogs.forEach(l => { map[l.date] = l; });
    return map;
  }, [challengeLogs]);

  // ─── Load logs (reused after check-in and saves) ──────────────────────────
  async function loadLogs(uid: string): Promise<any[]> {
    const { data } = await supabase
      .from("daily_logs")
      .select("*")
      .eq("challenge_id", challengeId)
      .eq("user_id", uid)
      .order("date", { ascending: true });
    const logs = data || [];
    setChallengeLogs(logs);
    setChallengeStreak(computeStreak(logs));
    const todayLog = logs.find((l: any) => l.date === todayStr);
    if (todayLog) {
      setCheckedInToday(true);
      setTodayPoints(todayLog.points_earned ?? 0);
    }
    return logs;
  }

  // ─── Initial load ─────────────────────────────────────────────────────────
  useEffect(() => {
    // ✅ Fix: guard with setLoading(false) so the page never hangs
    if (!challengeId) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    async function load() {
      // Challenge
      const { data: ch } = await supabase
        .from("challenges")
        .select("*")
        .eq("id", challengeId)
        .maybeSingle();

      if (!ch) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setChallenge(ch);

      // Members
      const { data: mems } = await supabase
        .from("challenge_members")
        .select("user_id, users(id, name, total_points, streak)")
        .eq("challenge_id", challengeId);
      setMembers((mems || []).map((m: any) => m.users).filter(Boolean));

      // Messages
      const { data: msgs } = await supabase
        .from("messages")
        .select("id, text, created_at, author_id, users(name)")
        .eq("topic", `challenge:${challengeId}`)
        .order("created_at", { ascending: true })
        .limit(50);
      setMessages(msgs || []);

      // Auth
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        setIsCreator(ch.creator_id === user.id);

        const { data: memberCheck } = await supabase
          .from("challenge_members")
          .select("id")
          .eq("challenge_id", challengeId)
          .eq("user_id", user.id)
          .maybeSingle();

        const member = !!memberCheck;
        setIsMember(member);

        if (member) {
          const { data: profile } = await supabase
            .from("users")
            .select("total_points")
            .eq("id", user.id)
            .maybeSingle();
          setUserTotalPoints(profile?.total_points || 0);

          await loadLogs(user.id);

          const { data: teamRow } = await supabase
            .from("team_members")
            .select("team_id, teams(name)")
            .eq("user_id", user.id)
            .maybeSingle();
          if (teamRow?.teams) setUserTeam((teamRow.teams as any).name);
        }
      }

      // ✅ Fix: always set loading false at the end
      setLoading(false);
    }

    load();

    // Realtime chat
    const sub = supabase
      .channel(`challenge_chat_${challengeId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `topic=eq.challenge:${challengeId}`,
      }, payload => {
        setMessages(prev => [...prev, payload.new as any]);
      })
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [challengeId]);

  // ─── Join ─────────────────────────────────────────────────────────────────
  async function handleJoin() {
    if (!userId || !challenge) return;
    await supabase.from("challenge_members").insert({
      challenge_id: challengeId,
      user_id: userId,
    });
    setIsMember(true);
    await loadLogs(userId);
  }

  // ─── Leave ────────────────────────────────────────────────────────────────
  async function handleLeave() {
    if (!confirm("Leave this challenge?")) return;
    await supabase.from("challenge_members")
      .delete()
      .eq("challenge_id", challengeId)
      .eq("user_id", userId);
    setIsMember(false);
    setChallengeLogs([]);
    setChallengeStreak(0);
    setCheckedInToday(false);
  }

  // ─── Send message ─────────────────────────────────────────────────────────
  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!messageText.trim() || !userId) return;
    await supabase.from("messages").insert({
      topic:     `challenge:${challengeId}`,
      author_id: userId,
      text:      messageText.trim(),
    });
    setMessageText("");
  }

  // ─── Check-in ─────────────────────────────────────────────────────────────
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
      const yesterday    = new Date(today);
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
        text:      "checked in! 🔥",
        meta:      { challenge_id: challengeId, days: newStreak, points: GLOBAL_POINTS_PER_CHECKIN },
      });

      setCheckedInToday(true);
      setTodayPoints(points);
      setUserTotalPoints(newGlobal);
      setChallengeStreak(newStreak);
      setChallengeLogs(prev => [
        ...prev,
        { date: todayStr, reps_completed: completed, reps_target: target, points_earned: points },
      ]);
    }

    setCheckingIn(false);
  }

  // ─── Calendar helpers ─────────────────────────────────────────────────────
  function buildCalendarDays(): (number | null)[] {
    const firstDow   = new Date(calMonth.y, calMonth.m, 1).getDay();
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

  // ─── Save edits ───────────────────────────────────────────────────────────
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

    // Recalc total global points across all challenges
    const { data: allLogs } = await supabase
      .from("daily_logs")
      .select("global_points_earned")
      .eq("user_id", userId);
    const totalGlobal = (allLogs || []).reduce(
      (s: number, l: any) => s + (l.global_points_earned ?? 0), 
      0
    );
    await supabase.from("users").update({ total_points: totalGlobal }).eq("id", userId);
    setUserTotalPoints(totalGlobal);

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

  // ─── Loading / not-found guards ───────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 52 }}>🏳️‍🌈</div>
      <p style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 18, color: "#7b2d8b", letterSpacing: 2 }}>
        LOADING...
      </p>
    </div>
  );

  if (notFound || !challenge) return (
    <div className="min-h-screen flex items-center justify-center px-5">
      <div className="neon-card rounded-2xl p-12 text-center max-w-sm w-full space-y-4">
        <p className="text-4xl">🔍</p>
        <p className="font-extrabold text-slate-900 text-lg">Challenge not found</p>
        <p className="text-sm text-slate-500">This challenge may have been removed or the link is invalid.</p>
        <button
          onClick={() => router.push("/embed/challenges")}
          className="rainbow-cta w-full rounded-xl py-3 font-bold text-sm"
        >
          Browse Challenges
        </button>
      </div>
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        .sheet-backdrop {
          position: fixed; inset: 0; z-index: 50;
          background: rgba(0,0,0,0.45);
          backdrop-filter: blur(6px);
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
          font-weight: 700; transition: background 0.1s;
        }
        .stepper-btn:active { background: #e5e7eb; }
        .cal-day {
          aspect-ratio: 1; border-radius: 10px; border: none;
          font-size: 13px; font-weight: 700; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          position: relative; transition: transform 0.1s;
          font-family: 'DM Sans', sans-serif;
        }
        .cal-day.future        { background: #f8fafc; color: #cbd5e1; cursor: default; }
        .cal-day.logged        { background: #dcfce7; color: #166534; }
        .cal-day.missed        { background: #fef2f2; color: #dc2626; }
        .cal-day.selected-logged   { background: linear-gradient(135deg,#48cfad,#667eea); color: #fff; transform: scale(1.08); }
        .cal-day.selected-unlogged { background: linear-gradient(135deg,#ff6b9d,#ff9f43); color: #fff; transform: scale(1.08); }
        .cal-day.today-ring    { outline: 2.5px solid #667eea; outline-offset: 2px; }
        .edited-badge {
          position: absolute; top: 1px; right: 2px; font-size: 9px;
        }
      `}</style>

      <div className="min-h-screen px-4 pt-5 pb-28 space-y-4 max-w-2xl mx-auto">

        {/* ── Top bar ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/embed/challenges")}
            className="w-9 h-9 rounded-full neon-card flex items-center justify-center text-slate-600 hover:bg-white transition"
          >
            ←
          </button>
          {isCreator && (
            <button
              onClick={() => router.push(`/embed/challenge/${challengeId}/manage`)}
              className="px-4 py-2 rounded-full border border-slate-200 bg-white/80 text-sm font-semibold text-slate-700 hover:bg-white transition"
            >
              ✏️ Manage
            </button>
          )}
        </div>

        {/* ── Challenge header ─────────────────────────────────────────────── */}
        <div className="neon-card rounded-2xl overflow-hidden">
          <div className="h-1.5 w-full rainbow-cta" />
          <div className="px-5 py-5 space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Challenge</p>
            <h1 className="text-3xl font-display font-extrabold text-slate-900 leading-tight">
              {challenge.name}
            </h1>
            {challenge.description && (
              <p className="text-sm text-slate-600 whitespace-pre-line">{challenge.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
              <span>👥 {members.length} member{members.length !== 1 ? "s" : ""}</span>
              <span>⏳ {daysLeft} days left</span>
              <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                Week {currentWeek}
              </span>
              {userTeam && (
                <span className="text-xs font-bold bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                  {userTeam}
                </span>
              )}
            </div>
            {challenge.join_code && (
              <div>
                <span className="inline-block bg-slate-100 rounded-full px-3 py-1 text-xs font-semibold text-slate-700">
                  Code: {challenge.join_code}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Challenge rules ──────────────────────────────────────────────── */}
        <details className="neon-card rounded-2xl overflow-hidden">
          <div className="h-1 w-full rainbow-cta" />
          <summary className="px-5 py-4 font-extrabold text-slate-900 cursor-pointer text-sm list-none flex items-center gap-2">
            ▶ 📋 Challenge Rules
          </summary>
          <div className="px-5 pb-5 space-y-2 text-sm text-slate-600">
            {challenge.rules ? (
              <p className="whitespace-pre-wrap">{challenge.rules}</p>
            ) : (
              <>
                <p>📅 {frequencyLabel(progressionType, everyXDays)}</p>
                {hasTarget && (
                  <p>
                    🎯 Target: <strong>{effectiveTarget} {targetUnit}</strong>
                    {scoringType === "progressive" && " (increases each week)"}
                  </p>
                )}
                <p>⭐ Scoring: <strong>{challenge.scoring_type?.replace(/_/g, " ")}</strong></p>
                <p>📆 {formatDate(challenge.start_date)} → {formatDate(challenge.end_date)}</p>
              </>
            )}
          </div>
        </details>

        {/* ── Member stats ─────────────────────────────────────────────────── */}
        {isMember && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: `🔥 ${challengeStreak}`, label: "Day Streak" },
              { value: `⭐ ${userTotalPoints}`, label: "Total Points" },
              ...(hasTarget
                ? [{ value: String(effectiveTarget), label: scoringType === "progressive" ? "This Week's Target" : "Daily Target" }]
                : [{ value: checkedInToday ? "✅" : "—", label: "Today" }]
              ),
            ].map(stat => (
              <div key={stat.label} className="neon-card rounded-2xl p-3 text-center">
                <p className="text-lg font-extrabold text-slate-900">{stat.value}</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Check-in card ─────────────────────────────────────────────────── */}
        {isMember && (
          <div className="neon-card rounded-2xl overflow-hidden">
            <div className="h-1 w-full rainbow-cta" />
            <div className="px-5 py-5 space-y-4">
              <h2 className="text-lg font-extrabold text-slate-900">
                {checkedInToday ? "✅ Checked In Today" : "Today's Check-in"}
              </h2>

              {checkedInToday ? (
                <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm font-semibold text-green-800">
                  You earned <strong>{todayPoints} pts</strong> today — keep it up! 🏳️‍🌈
                </div>
              ) : hasTarget ? (
                /* Numeric input check-in */
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">
                    Log your {targetUnit} for today
                    <span className="ml-2 text-xs font-bold text-slate-400">
                      target: {effectiveTarget} {targetUnit}
                    </span>
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      className="stepper-btn"
                      onClick={() => setInputValue(v => Math.max(0, v - 1))}
                    >−</button>
                    <input
                      type="number"
                      value={inputValue}
                      min={0}
                      onChange={e => setInputValue(Math.max(0, Number(e.target.value)))}
                      className="flex-1 text-center text-2xl font-extrabold rounded-xl border border-slate-200 bg-white/80 py-3 focus:outline-none focus:ring-2 focus:ring-slate-300"
                    />
                    <button
                      className="stepper-btn"
                      onClick={() => setInputValue(v => v + 1)}
                    >+</button>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-1">
                    {inputValue > 0 && (
                      <span className={
                        inputValue >= effectiveTarget ? "text-green-600" :
                        inputValue >= Math.ceil(effectiveTarget * 0.5) ? "text-amber-500" : "text-red-400"
                      }>
                        {inputValue >= effectiveTarget
                          ? `💯 100%+ · +${pointsMax} pts`
                          : inputValue >= Math.ceil(effectiveTarget * 0.5)
                          ? `🎈 50%+ · +${Math.round(pointsMax / 2)} pts`
                          : `😴 <50% · +0 pts`}
                      </span>
                    )}
                    <span className="ml-auto">{effectiveTarget} {targetUnit}</span>
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
                /* Single-tap check-in */
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

        {/* ── Edit past days ────────────────────────────────────────────────── */}
        {isMember && (
          <button
            onClick={() => { setShowCalendar(true); setSelectedDays(new Set()); setSaveSuccess(false); }}
            className="w-full neon-card rounded-2xl py-4 font-semibold text-slate-700 hover:bg-white transition text-center"
          >
            📅 Edit Past Days
          </button>
        )}

        {/* ── Join / Leave ─────────────────────────────────────────────────── */}
        {!isMember && userId && (
          <button
            onClick={handleJoin}
            className="w-full rainbow-cta rounded-2xl py-4 font-semibold text-lg hover:shadow-xl transition"
          >
            Join Challenge
          </button>
        )}
        {isMember && !isCreator && (
          <button
            onClick={handleLeave}
            className="w-full neon-card rounded-2xl py-3 text-sm font-semibold text-red-400 hover:text-red-600 hover:bg-red-50 transition text-center"
          >
            Leave Challenge
          </button>
        )}

        {/* ── Leaderboard ───────────────────────────────────────────────────── */}
        {members.length > 0 && (
          <div className="neon-card rounded-2xl overflow-hidden">
            <div className="h-1 w-full rainbow-cta" />
            <div className="px-5 py-5">
              <h3 className="text-lg font-extrabold text-slate-900 mb-4">Leaderboard</h3>
              <div className="space-y-2">
                {[...members]
                  .sort((a: any, b: any) => (b.total_points || 0) - (a.total_points || 0))
                  .slice(0, 10)
                  .map((member: any, i: number) => {
                    const isMe = member.id === userId;
                    return (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                        style={{ background: isMe ? "linear-gradient(135deg,#ff6b9d,#667eea)" : "rgba(0,0,0,0.03)" }}
                      >
                        <span className="text-sm font-extrabold w-5 text-center"
                          style={{ color: isMe ? "#fff" : i < 3 ? "#ff9f43" : "#94a3b8" }}>
                          {i + 1}
                        </span>
                        <span className={`flex-1 font-bold text-sm ${isMe ? "text-white" : "text-slate-800"}`}>
                          {member.name || "Member"}
                          {isMe && <span className="ml-1 text-xs opacity-60">(You)</span>}
                        </span>
                        <span className={`font-extrabold text-sm ${isMe ? "text-white" : "text-slate-700"}`}>
                          ⭐ {member.total_points || 0}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {/* ── Live chat ─────────────────────────────────────────────────────── */}
        <div className="neon-card rounded-2xl overflow-hidden">
          <div className="h-1 w-full rainbow-cta" />
          <div className="px-5 py-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-extrabold text-slate-900">Live Chat</h3>
              <span className="neon-chip rounded-full px-3 py-1 text-xs font-semibold">Streak squad</span>
            </div>
            <div className="space-y-3 max-h-[240px] overflow-y-auto pr-1 mb-4">
              {messages.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No messages yet. Start the hype! 🏳️‍🌈</p>
              ) : (
                messages.map((msg: any) => (
                  <div key={msg.id} className="flex gap-2.5">
                    <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-extrabold text-white"
                      style={{ background: "linear-gradient(135deg,#ff6b9d,#667eea)" }}>
                      {(msg.users?.name || "?")[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700">{msg.users?.name || "Member"}</p>
                      <p className="text-sm text-slate-600 mt-0.5">{msg.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            {isMember && (
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  placeholder="Hype your crew…"
                  className="flex-1 rounded-xl border border-slate-200 bg-white/80 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
                <button
                  type="submit"
                  disabled={!messageText.trim()}
                  className="rainbow-cta px-4 py-2.5 rounded-xl font-bold text-sm disabled:opacity-40"
                >
                  Send
                </button>
              </form>
            )}
          </div>
        </div>

      </div>

      {/* ══════════════════════════════════════════════════════════════
          SHEET 1 — Calendar picker
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
              >‹</button>
              <p style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 22, letterSpacing: 1, color: "#0e0e0e" }}>
                {MONTH_NAMES[calMonth.m]} {calMonth.y}
              </p>
              <button
                className="stepper-btn"
                onClick={() => setCalMonth(p => {
                  const d = new Date(p.y, p.m + 1);
                  return { y: d.getFullYear(), m: d.getMonth() };
                })}
                disabled={calMonth.y === today.getFullYear() && calMonth.m >= today.getMonth()}
              >›</button>
            </div>

            {/* Day headers */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 6 }}>
              {["S","M","T","W","T","F","S"].map((d, i) => (
                <div key={i} style={{ textAlign: "center", fontSize: 11, fontWeight: 800, color: "#94a3b8", padding: "2px 0" }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 20 }}>
              {buildCalendarDays().map((day, idx) => {
                if (!day) return <div key={`blank-${idx}`} />;
                const dateStr      = toDateStr(calMonth.y, calMonth.m, day);
                const isFuture     = dateStr > todayStr;
                const isBeforeStart = challenge.start_date && dateStr < challenge.start_date;
                const isToday      = dateStr === todayStr;
                const log          = logsByDate[dateStr];
                const isLogged     = !!log;
                const isEdited     = !!log?.edited_at;
                const isSelected   = selectedDays.has(dateStr);
                const disabled     = isFuture || !!isBeforeStart;

                let cls = "cal-day ";
                if (disabled)                       cls += "future";
                else if (isLogged && isSelected)    cls += "selected-logged";
                else if (isLogged)                  cls += "logged";
                else if (isSelected)                cls += "selected-unlogged";
                else                                cls += "missed";
                if (isToday && !disabled)           cls += " today-ring";

                return (
                  <button
                    key={dateStr}
                    className={cls}
                    onClick={() => !disabled && toggleDay(dateStr)}
                    disabled={disabled}
                  >
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
        <div
          className="sheet-backdrop"
          onClick={e => { if (e.target === e.currentTarget) setShowEditPanel(false); }}
        >
          <div className="sheet-panel">
            <div className="sheet-handle" />

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <button
                onClick={() => setShowEditPanel(false)}
                style={{ background: "#f1f5f9", border: "none", borderRadius: 10, padding: "6px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", color: "#555", flexShrink: 0 }}
              >
                ← Back
              </button>
              <p style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 20, letterSpacing: 1, color: "#0e0e0e" }}>
                Edit {editCards.length} Day{editCards.length !== 1 ? "s" : ""}
              </p>
            </div>

            {saveSuccess ? (
              <div style={{ textAlign: "center", padding: "32px 0" }}>
                <p style={{ fontSize: 40 }}>🎉</p>
                <p style={{ fontWeight: 800, color: "#166534", fontSize: 16, marginTop: 8 }}>Saved!</p>
                <p style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>Points & streak recalculated.</p>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
                  {editCards.map((card, i) => {
                    const pct = card.target > 0 ? Math.min(100, Math.round((card.completed / card.target) * 100)) : 100;
                    return (
                      <div key={card.date} style={{ background: "#f8fafc", borderRadius: 16, padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                          <p style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>{formatDate(card.date)}</p>
                          <p style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>
                            target: {card.target} {targetUnit}
                          </p>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <button
                            className="stepper-btn"
                            onClick={() => setEditCards(prev => prev.map((c, j) =>
                              j === i ? { ...c, completed: Math.max(0, c.completed - 1) } : c
                            ))}
                          >−</button>
                          <input
                            type="number"
                            value={card.completed}
                            min={0}
                            onChange={e => setEditCards(prev => prev.map((c, j) =>
                              j === i ? { ...c, completed: Math.max(0, Number(e.target.value)) } : c
                            ))}
                            style={{ flex: 1, textAlign: "center", fontSize: 22, fontWeight: 800, border: "1.5px solid #e2e8f0", borderRadius: 12, padding: "8px 0", background: "#fff", fontFamily: "'DM Sans', sans-serif" }}
                          />
                          <button
                            className="stepper-btn"
                            onClick={() => setEditCards(prev => prev.map((c, j) =>
                              j === i ? { ...c, completed: c.completed + 1 } : c
                            ))}
                          >+</button>
                        </div>
                        {/* Progress bar */}
                        <div style={{ height: 4, background: "#e5e7eb", borderRadius: 99, overflow: "hidden", marginTop: 10 }}>
                          <div style={{
                            height: "100%", borderRadius: 99, width: `${pct}%`,
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
                  {saving ? "Saving & recalculating…" : `Save All ${editCards.length} Day${editCards.length !== 1 ? "s" : ""} 🔥`}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}