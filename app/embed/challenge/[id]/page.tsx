"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import {
  secondsToDisplay,
  displayToSeconds,
  formatTimeInput,
  timeDelta,
} from "@/lib/utils/time";

// ─── Constants ────────────────────────────────────────────────────────────────

const GLOBAL_POINTS_PER_CHECKIN = 5;

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function formatDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${m}/${day}/${y.slice(-2)}`;
}

function getWeekNum(date: string, start: string): number {
  const ms = new Date(date).getTime() - new Date(start).getTime();
  return Math.floor(ms / (7 * 86400000)) + 1;
}

function getMonthNum(date: string, start: string): number {
  const d = new Date(date);
  const s = new Date(start);
  return (d.getFullYear() - s.getFullYear()) * 12 + (d.getMonth() - s.getMonth()) + 1;
}

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
    case "weekly":  return dailyTarget * Math.max(1, getWeekNum(date, challengeStart));
    case "monthly": return dailyTarget * Math.max(1, getMonthNum(date, challengeStart));
    default:        return dailyTarget * Math.max(1, getWeekNum(date, challengeStart));
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
  const todayStr = new Date().toISOString().split("T")[0];
  const last = sorted[sorted.length - 1].date;
  const daysSinceLast = Math.round(
    (new Date(todayStr).getTime() - new Date(last).getTime()) / 86400000
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
  date:             string;
  target:           number;
  completed:        number;
  duration_seconds: number | null;
  log_id?:          string;
}

interface DeltaResult {
  delta:    string;
  improved: boolean;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ChallengeDetailPage() {
  const params      = useParams<{ id: string }>();
  const router      = useRouter();
  const challengeId = typeof params?.id === "string" ? params.id : "";

  // ── Core state ───────────────────────────────────────────────────────────────
  const [challenge,    setChallenge]    = useState<any>(null);
  const [members,      setMembers]      = useState<any[]>([]);
  const [messages,     setMessages]     = useState<any[]>([]);
  const [messageText,  setMessageText]  = useState("");
  const [loading,      setLoading]      = useState(true);
  const [notFound,     setNotFound]     = useState(false);

  // ── User state ───────────────────────────────────────────────────────────────
  const [userId,          setUserId]          = useState("");
  const [isMember,        setIsMember]        = useState(false);
  const [isCreator,       setIsCreator]       = useState(false);
  const [userTeam,        setUserTeam]        = useState("");
  const [userTotalPoints, setUserTotalPoints] = useState(0);
  const [challengeLogs,   setChallengeLogs]   = useState<any[]>([]);
  const [challengeStreak, setChallengeStreak] = useState(0);
  const [challengePoints, setChallengePoints] = useState(0);

  // ── Check-in state ───────────────────────────────────────────────────────────
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [todayPoints,    setTodayPoints]    = useState(0);
  const [checkingIn,     setCheckingIn]     = useState(false);
  const [inputValue,     setInputValue]     = useState(0);       // reps / distance / weight
  const [timeInput,      setTimeInput]      = useState("");      // timed challenges

  // Delta shown after submit
  const [deltaResult, setDeltaResult] = useState<DeltaResult | null>(null);

  // ── Edit past days ───────────────────────────────────────────────────────────
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

  const scoringType     = challenge?.scoring_type              ?? "task_completion";
  const isTimed         = scoringType === "timed";
  const lowerIsBetter   = challenge?.scoring_direction === "asc"; // asc = lower is better (race)
  const dailyTarget     = Number(challenge?.daily_target       ?? 0);
  const targetUnit      = challenge?.target_unit               ?? "reps";
  const pointsMax       = challenge?.local_points_per_checkin  ?? 2;
  const progressionType = challenge?.progression_type          ?? "daily";
  const everyXDays      = challenge?.progression_interval_days ?? null;
  const hasTarget       = dailyTarget > 0 && !isTimed;

  const effectiveTarget = challenge
    ? getEffectiveTarget(todayStr, challenge.start_date, dailyTarget, scoringType, progressionType)
    : dailyTarget;

  const startDate  = challenge?.start_date ?? todayStr;
  const endDate    = challenge?.end_date   ?? todayStr;
  const daysLeft   = Math.max(0, Math.ceil(
    (new Date(endDate).getTime() - today.getTime()) / 86400000
  ));
  const currentWeek = getWeekNum(todayStr, startDate);

  // Previous best for timed challenges
  const previousBestSeconds = useMemo(() => {
    if (!isTimed) return null;
    const times = challengeLogs
      .map(l => l.duration_seconds)
      .filter((v): v is number => typeof v === "number" && v > 0);
    if (!times.length) return null;
    return lowerIsBetter ? Math.min(...times) : Math.max(...times);
  }, [challengeLogs, isTimed, lowerIsBetter]);

  const logsByDate = useMemo(() => {
    const map: Record<string, any> = {};
    for (const log of challengeLogs) map[log.date] = log;
    return map;
  }, [challengeLogs]);

  const sortedMembers = useMemo(
    () => [...members].sort((a, b) => (b.total_points ?? 0) - (a.total_points ?? 0)),
    [members]
  );

  // Validate timed input
  const parsedSeconds = isTimed ? displayToSeconds(timeInput) : null;
  const timeInputValid = isTimed ? parsedSeconds !== null && parsedSeconds > 0 : true;

  // ─── loadLogs ────────────────────────────────────────────────────────────────
  async function loadLogs(uid: string): Promise<any[]> {
    const { data: logs } = await supabase
      .from("daily_logs")
      .select("*")
      .eq("user_id", uid)
      .eq("challenge_id", challengeId)
      .order("date", { ascending: true });

    const rows = logs ?? [];
    setChallengeLogs(rows);
    setCheckedInToday(rows.some(l => l.date === todayStr));
    setChallengeStreak(computeStreak(rows));

    // Fix: was dead code after return — now correctly computed before return
    const localSum = rows.reduce((s, l) => s + (l.points_earned ?? 0), 0);
    setChallengePoints(localSum);

    return rows;
  }

  // ─── Initial load ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!challengeId) { setNotFound(true); setLoading(false); return; }

    async function load() {
      const { data: ch } = await supabase
        .from("challenges").select("*").eq("id", challengeId).maybeSingle();
      if (!ch) { setNotFound(true); setLoading(false); return; }
      setChallenge(ch);

      const { data: mems } = await supabase
        .from("challenge_members")
        .select("user_id, users!challenge_members_user_id_fkey(id, name, total_points, streak)")
        .eq("challenge_id", challengeId);
      setMembers((mems ?? []).map((m: any) => m.users).filter(Boolean));

      const { data: msgs } = await supabase
        .from("messages")
        .select("id, text, created_at, author_id, users(name)")
        .eq("team_id", ch.team_id)
        .eq("is_dm", false)
        .order("created_at", { ascending: true })
        .limit(50);
      setMessages(msgs ?? []);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        setIsCreator(ch.creator_id === user.id);

        const { data: memberCheck } = await supabase
          .from("challenge_members").select("id")
          .eq("challenge_id", challengeId).eq("user_id", user.id).maybeSingle();

        const member = !!memberCheck;
        setIsMember(member);

        if (member) {
          const logs = await loadLogs(user.id);
          const computed = logs.reduce(
            (sum, log) => sum + (log.global_points_earned ?? 0), 0
          );
          setUserTotalPoints(computed);

          await supabase
            .from("users")
            .update({ total_points: computed })
            .eq("id", user.id);

          const { data: teamRow } = await supabase
            .from("team_members").select("team_id, teams(name)")
            .eq("user_id", user.id).maybeSingle();
          if (teamRow?.teams) setUserTeam((teamRow.teams as any).name);
        }
      }

      setLoading(false);
    }

    load();

    const sub = supabase
      .channel(`challenge_chat_${challengeId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages",
        filter: `team_id=eq.${challenge?.team_id}`,
      }, payload => setMessages(prev => [...prev, payload.new as any]))
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [challengeId]);

  // ─── Join ────────────────────────────────────────────────────────────────────
  async function handleJoin() {
    if (!userId || !challenge) return;
    await supabase.from("challenge_members").insert({ challenge_id: challengeId, user_id: userId });
    if (challenge.team_id) {
      await supabase.from("team_members").insert({ team_id: challenge.team_id, user_id: userId });
    }
    setIsMember(true);
    const logs = await loadLogs(userId);
    const computed = logs.reduce((s, l) => s + (l.global_points_earned ?? 0), 0);
    setUserTotalPoints(computed);
  }

  // ─── Leave ───────────────────────────────────────────────────────────────────
  async function handleLeave() {
    if (!confirm("Leave this challenge?")) return;
    await supabase.from("challenge_members")
      .delete().eq("challenge_id", challengeId).eq("user_id", userId);
    setIsMember(false);
    setChallengeLogs([]);
    setChallengeStreak(0);
    setCheckedInToday(false);
  }

  // ─── Chat ────────────────────────────────────────────────────────────────────
  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!messageText.trim() || !userId) return;
    await supabase.from("messages").insert({
      team_id:   challenge.team_id,
      author_id: userId,
      text:      messageText.trim(),
      is_dm:     false,
    });
    setMessageText("");
  }

  // ─── Check-in ────────────────────────────────────────────────────────────────
  async function handleCheckIn() {
    if (!userId || !challengeId || checkedInToday || checkingIn) return;
    if (isTimed && !timeInputValid) return;
    setCheckingIn(true);

    const durationSecs = isTimed ? parsedSeconds : null;
    const completed    = hasTarget ? inputValue : 1;
    const target       = hasTarget ? effectiveTarget : 1;
    const points       = isTimed ? pointsMax : calcPoints(completed, target, pointsMax);

    const { error } = await supabase.from("daily_logs").insert({
      user_id:              userId,
      challenge_id:         challengeId,
      date:                 todayStr,
      reps_completed:       isTimed ? 0 : completed,
      reps_target:          isTimed ? 0 : target,
      duration_seconds:     durationSecs,
      points_earned:        points,
      global_points_earned: GLOBAL_POINTS_PER_CHECKIN,
    });

    if (!error) {
      // Delta for timed challenges
      if (isTimed && durationSecs !== null && previousBestSeconds !== null) {
        setDeltaResult(timeDelta(durationSecs, previousBestSeconds, lowerIsBetter));
        setTimeout(() => setDeltaResult(null), 4000);
      }

      // Streak
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];
      const hadYesterday = challengeLogs.some(l => l.date === yesterdayStr);
      const newStreak    = hadYesterday ? challengeStreak + 1 : 1;

      const STREAK_MILESTONES: Record<number, number> = { 7: 25, 30: 100, 100: 500 };
      const streakBonus    = STREAK_MILESTONES[newStreak] ?? 0;
      const totalNewPoints = GLOBAL_POINTS_PER_CHECKIN + streakBonus;
      const newGlobal      = userTotalPoints + totalNewPoints;

      await supabase.from("users")
        .update({ total_points: newGlobal, streak: newStreak })
        .eq("id", userId);

      const { data: uProfile } = await supabase
        .from("users").select("name").eq("id", userId).maybeSingle();

      await supabase.from("activity_feed").insert({
        user_name: uProfile?.name ?? "Member",
        type:      streakBonus > 0 ? "streak_milestone" : "streak",
        text:      streakBonus > 0
          ? `hit a ${newStreak}-day streak! 🎉 +${streakBonus} bonus pts`
          : "checked in!",
        meta: {
          challenge_id: challengeId,
          days:         newStreak,
          points:       totalNewPoints,
          bonus:        streakBonus,
        },
      });

      setCheckedInToday(true);
      setTodayPoints(points);
      setUserTotalPoints(newGlobal);
      setChallengeStreak(newStreak);
      setChallengePoints(prev => prev + points);
      setChallengeLogs(prev => [
        ...prev,
        {
          date:                 todayStr,
          reps_completed:       isTimed ? 0 : completed,
          reps_target:          isTimed ? 0 : target,
          duration_seconds:     durationSecs,
          points_earned:        points,
          global_points_earned: GLOBAL_POINTS_PER_CHECKIN,
        },
      ]);
    }

    setCheckingIn(false);
  }

  // ─── Calendar helpers ────────────────────────────────────────────────────────
  function buildCalendarDays(): (number | null)[] {
    const firstDow    = new Date(calMonth.y, calMonth.m, 1).getDay();
    const daysInMonth = new Date(calMonth.y, calMonth.m + 1, 0).getDate();
    const cells: (number | null)[] = Array(firstDow).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }

  function toggleDay(dateStr: string) {
    if (dateStr > todayStr) return;
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
        date:             dateStr,
        target,
        completed:        existing?.reps_completed ?? 0,
        duration_seconds: existing?.duration_seconds ?? null,
        log_id:           existing?.id,
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
      const points  = isTimed ? pointsMax : calcPoints(card.completed, card.target, pointsMax);
      const payload = {
        user_id:              userId,
        challenge_id:         challengeId,
        date:                 card.date,
        reps_completed:       isTimed ? 0 : card.completed,
        reps_target:          isTimed ? 0 : card.target,
        duration_seconds:     isTimed ? card.duration_seconds : null,
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

    const { data: allLogs } = await supabase
      .from("daily_logs").select("global_points_earned").eq("user_id", userId);
    const totalGlobal = (allLogs ?? []).reduce(
      (s: number, l: any) => s + (l.global_points_earned ?? 0), 0
    );
    await supabase.from("users").update({ total_points: totalGlobal }).eq("id", userId);
    setUserTotalPoints(totalGlobal);

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
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🏳️‍🌈</div>
        <p style={{ fontFamily: "var(--font-inter), system-ui, sans-serif", fontSize: 18, color: "#7b2d8b", letterSpacing: 2 }}>LOADING...</p>
      </div>
    </div>
  );

  if (notFound) return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div className="neon-card rounded-3xl p-10 text-center max-w-sm">
        <p style={{ fontSize: 48, marginBottom: 12 }}>🔍</p>
        <p className="font-extrabold text-xl text-slate-900 mb-2">Challenge not found</p>
        <p className="text-slate-500 text-sm mb-6">This challenge may have been removed or the link is incorrect.</p>
        <button onClick={() => router.push("/embed/challenges")} className="rainbow-cta rounded-full px-6 py-3 font-semibold">
          Browse Challenges
        </button>
      </div>
    </div>
  );

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100dvh", background: "#f8f7ff", paddingBottom: 120 }}>

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <div style={{ padding: "16px 20px", display: "flex", gap: 10, alignItems: "center" }}>
        <button
          onClick={() => router.push("/embed/challenges")}
          className="neon-card rounded-full px-4 py-2 text-sm font-semibold text-slate-700"
        >
          ← Challenges
        </button>
        <button
          onClick={() => router.push("/embed/dashboard")}
          className="neon-card rounded-full px-4 py-2 text-sm font-semibold text-slate-700 ml-auto"
        >
          Dashboard
        </button>
      </div>

      <div style={{ padding: "0 20px", maxWidth: 600, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* ── Challenge header ────────────────────────────────────────────── */}
        <div className="neon-card rounded-3xl overflow-hidden">
          <div className="h-1 w-full rainbow-cta" />
          <div style={{ padding: "20px 24px" }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", color: "#94a3b8", textTransform: "uppercase", marginBottom: 4 }}>
              {challenge.scoring_type?.replace(/_/g, " ")}
            </p>
            <h1 style={{ fontFamily: "var(--font-inter), system-ui, sans-serif", fontSize: 32, color: "#0e0e0e", letterSpacing: 1, lineHeight: 1.1, marginBottom: 8 }}>
              {challenge.name}
            </h1>
            {challenge.description && (
              <p style={{ fontSize: 14, color: "#64748b", marginBottom: 12 }}>{challenge.description}</p>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 12, color: "#64748b", fontWeight: 600 }}>
              <span>📅 {formatDate(challenge.start_date)} → {formatDate(challenge.end_date)}</span>
              <span>⏳ {daysLeft}d left</span>
              <span>📆 Week {currentWeek}</span>
              {challenge.join_code && (
                <span className="neon-chip rounded-full px-3 py-0.5">Code: {challenge.join_code}</span>
              )}
            </div>
          </div>
        </div>

        {/* ── Challenge rules ────────────────────────────────────────────── */}
        <details className="neon-card rounded-2xl px-5 py-4 cursor-pointer">
          <summary className="font-semibold text-slate-800 text-sm list-none flex items-center gap-2">
            ▶ 📋 Challenge Rules
          </summary>
          <div className="mt-3 space-y-1.5 text-sm text-slate-600">
            {challenge.rules
              ? <p className="whitespace-pre-wrap">{challenge.rules}</p>
              : <>
                  <p>📅 {frequencyLabel(progressionType, everyXDays)}</p>
                  {isTimed && <p>⏱ Log your time each check-in</p>}
                  {hasTarget && <p>🎯 Target: <strong>{effectiveTarget} {targetUnit}</strong>{scoringType === "progressive" && " (increases each week)"}</p>}
                  <p>⭐ Points per check-in: <strong>{GLOBAL_POINTS_PER_CHECKIN}</strong></p>
                </>
            }
          </div>
        </details>

        {/* ── Your stats ─────────────────────────────────────────────────── */}
        {isMember && (
          <div className="neon-card rounded-2xl overflow-hidden">
            <div className="h-1 w-full rainbow-cta" />
            <div style={{ padding: "16px 20px" }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", color: "#94a3b8", textTransform: "uppercase", marginBottom: 12 }}>
                Your Stats
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                {[
                  { value: `🔥 ${challengeStreak}`, label: "Day Streak" },
                  { value: `⭐ ${challengePoints}`, label: "Challenge Pts" },
                  {
                    value: isTimed && previousBestSeconds !== null
                      ? `⏱ ${secondsToDisplay(previousBestSeconds)}`
                      : `${challengeLogs.length}`,
                    label: isTimed ? (lowerIsBetter ? "Best Time" : "Longest") : "Check-ins",
                  },
                ].map(stat => (
                  <div key={stat.label} style={{ textAlign: "center", padding: "12px 8px", background: "rgba(0,0,0,0.03)", borderRadius: 14 }}>
                    <p style={{ fontFamily: "var(--font-inter), system-ui, sans-serif", fontSize: 22, color: "#0e0e0e", letterSpacing: 0.5, lineHeight: 1 }}>
                      {stat.value}
                    </p>
                    <p style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 4 }}>
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
              {userTeam && (
                <p style={{ fontSize: 12, color: "#7b2d8b", fontWeight: 700, marginTop: 12, textAlign: "center" }}>
                  🏆 {userTeam}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Check-in card ──────────────────────────────────────────────── */}
        {isMember && (
          <div className="neon-card rounded-2xl overflow-hidden">
            <div className="h-1 w-full rainbow-cta" />
            <div style={{ padding: "20px" }}>
              {checkedInToday ? (
                <div style={{ textAlign: "center", padding: "8px 0" }}>
                  <p style={{ fontSize: 32, marginBottom: 6 }}>✅</p>
                  <p style={{ fontFamily: "var(--font-inter), system-ui, sans-serif", fontSize: 20, color: "#48cfad", letterSpacing: 1 }}>
                    Checked in today!
                  </p>
                  <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>
                    +{GLOBAL_POINTS_PER_CHECKIN} global pts · +{todayPoints} local pts
                  </p>

                  {/* Delta result shown after timed submit */}
                  {deltaResult && (
                    <div style={{
                      marginTop: 10,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 14px",
                      borderRadius: 99,
                      background: deltaResult.improved ? "rgba(72,207,173,0.12)" : "rgba(239,68,68,0.08)",
                    }}>
                      <span style={{ fontSize: 16 }}>{deltaResult.improved ? "▼" : "▲"}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: deltaResult.improved ? "#48cfad" : "#ef4444" }}>
                        {deltaResult.delta} {deltaResult.improved ? (lowerIsBetter ? "faster" : "longer") : (lowerIsBetter ? "slower" : "shorter")}
                      </span>
                    </div>
                  )}

                  <button
                    onClick={() => setShowCalendar(true)}
                    className="rainbow-cta rounded-full px-5 py-2 text-sm font-semibold mt-4"
                    style={{ display: "block", margin: "16px auto 0" }}
                  >
                    Edit Past Days
                  </button>
                </div>
              ) : (
                <div>
                  <p style={{ fontFamily: "var(--font-inter), system-ui, sans-serif", fontSize: 20, color: "#0e0e0e", letterSpacing: 1, marginBottom: 12 }}>
                    Today&apos;s Check-in
                  </p>

                  {/* ── Timed input ── */}
                  {isTimed && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ marginBottom: 8 }}>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="0:00"
                          value={timeInput}
                          onChange={e => setTimeInput(formatTimeInput(e.target.value))}
                          style={{
                            width: "100%",
                            padding: "14px 16px",
                            fontSize: 28,
                            fontWeight: 700,
                            fontFamily: "var(--font-inter), system-ui, sans-serif",
                            letterSpacing: 2,
                            textAlign: "center",
                            borderRadius: 14,
                            border: timeInput && !timeInputValid
                              ? "2px solid #ef4444"
                              : "2px solid #e5e7eb",
                            background: "#fff",
                            outline: "none",
                            color: "#0e0e0e",
                          }}
                        />
                        {timeInput && !timeInputValid && (
                          <p style={{ fontSize: 11, color: "#ef4444", textAlign: "center", marginTop: 4 }}>
                            Use MM:SS or HH:MM:SS format
                          </p>
                        )}
                      </div>

                      {/* Previous best */}
                      {previousBestSeconds !== null ? (
                        <p style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", fontWeight: 600 }}>
                          {lowerIsBetter ? "🏆 Best time" : "🏆 Personal best"}: {secondsToDisplay(previousBestSeconds)}
                        </p>
                      ) : (
                        <p style={{ fontSize: 12, color: "#94a3b8", textAlign: "center" }}>
                          No previous entries — this will be your first!
                        </p>
                      )}
                    </div>
                  )}

                  {/* ── Reps / distance / weight input ── */}
                  {hasTarget && !isTimed && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: "#64748b" }}>
                          Target: <strong style={{ color: "#0e0e0e" }}>{effectiveTarget} {targetUnit}</strong>
                        </p>
                        <p style={{ fontSize: 12, fontWeight: 700, color: inputValue >= effectiveTarget ? "#48cfad" : inputValue >= effectiveTarget * 0.5 ? "#667eea" : "#94a3b8" }}>
                          {inputValue >= effectiveTarget
                            ? `🔥 100% · +${pointsMax} pts`
                            : inputValue >= effectiveTarget * 0.5
                            ? `✨ 50%+ · +${Math.round(pointsMax / 2)} pts`
                            : `😴 <50% · +0 pts`}
                        </p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                        <button
                          className="stepper-btn"
                          onClick={() => setInputValue(v => Math.max(0, v - 1))}
                        >−</button>
                        <input
                          type="number"
                          min={0}
                          value={inputValue}
                          onChange={e => setInputValue(Math.max(0, parseInt(e.target.value) || 0))}
                          className="edit-num-input"
                          style={{ flex: 1 }}
                        />
                        <button
                          className="stepper-btn"
                          onClick={() => setInputValue(v => v + 1)}
                        >+</button>
                      </div>
                      <div style={{ height: 5, borderRadius: 99, background: "#f1f5f9", overflow: "hidden" }}>
                        <div style={{
                          height: "100%", borderRadius: 99, transition: "width 0.2s ease",
                          width: `${Math.min(100, (inputValue / effectiveTarget) * 100)}%`,
                          background: inputValue >= effectiveTarget
                            ? "linear-gradient(90deg,#ff6b9d,#ff9f43,#ffdd59,#48cfad,#667eea)"
                            : inputValue >= effectiveTarget * 0.5
                            ? "linear-gradient(90deg,#48cfad,#667eea)"
                            : "#e5e7eb",
                        }} />
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleCheckIn}
                    disabled={
                      checkingIn ||
                      (hasTarget && inputValue === 0) ||
                      (isTimed && !timeInputValid) ||
                      (isTimed && !timeInput)
                    }
                    className="w-full rainbow-cta rounded-2xl py-3 font-semibold text-base disabled:opacity-50"
                    style={{ marginTop: hasTarget || isTimed ? 0 : 4 }}
                  >
                    {checkingIn ? "Saving…" : isTimed ? "Log Time" : "Log Check-in"}
                  </button>

                  <button
                    onClick={() => setShowCalendar(true)}
                    style={{ width: "100%", marginTop: 10, padding: "10px 0", fontSize: 13, fontWeight: 700, color: "#7b2d8b", background: "transparent", border: "none", cursor: "pointer" }}
                  >
                    + Edit Past Days
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Leaderboard ────────────────────────────────────────────────── */}
        {members.length > 0 && (
          <div className="neon-card rounded-2xl overflow-hidden">
            <div className="h-1 w-full rainbow-cta" />
            <div style={{ padding: "16px 20px" }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", color: "#94a3b8", textTransform: "uppercase", marginBottom: 12 }}>
                Leaderboard
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {sortedMembers.map((member, i) => {
                  const isMe = member.id === userId;
                  return (
                    <div
                      key={member.id}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "10px 14px", borderRadius: 14,
                        background: isMe
                          ? "linear-gradient(135deg,#ff6b9d,#667eea)"
                          : "rgba(0,0,0,0.03)",
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 900, width: 20, textAlign: "center", color: isMe ? "#fff" : i < 3 ? "#ff9f43" : "#94a3b8" }}>
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                      </span>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: isMe ? "#fff" : "#1e293b" }}>
                        {member.name || "Member"}{isMe && <span style={{ opacity: 0.6, fontWeight: 400 }}> (You)</span>}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 900, color: isMe ? "#fff" : "#334155" }}>
                        ⭐ {member.total_points ?? 0}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Chat ───────────────────────────────────────────────────────── */}
        <div className="neon-card rounded-2xl overflow-hidden">
          <div className="h-1 w-full rainbow-cta" />
          <div style={{ padding: "16px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", color: "#94a3b8", textTransform: "uppercase" }}>
                Live Chat
              </p>
              <span className="neon-chip rounded-full px-3 py-1 text-xs font-semibold">Streak squad 🏳️‍🌈</span>
            </div>

            <div style={{ maxHeight: 240, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, marginBottom: 12, paddingRight: 4 }}>
              {messages.length === 0 ? (
                <p style={{ fontSize: 13, color: "#94a3b8", textAlign: "center", padding: "16px 0" }}>
                  No messages yet. Start the hype! 🏳️‍🌈
                </p>
              ) : messages.map((msg: any) => (
                <div key={msg.id} style={{ display: "flex", gap: 10 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                    background: "linear-gradient(135deg,#ff6b9d,#667eea)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 900, color: "#fff",
                  }}>
                    {(msg.users?.name ?? "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 2 }}>
                      {msg.users?.name ?? "Member"}
                    </p>
                    <p style={{ fontSize: 13, color: "#1e293b", lineHeight: 1.4 }}>{msg.text}</p>
                  </div>
                </div>
              ))}
            </div>

            {isMember ? (
              <form onSubmit={handleSendMessage} style={{ display: "flex", gap: 8 }}>
                <input
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  placeholder="Send a message…"
                  style={{
                    flex: 1, padding: "10px 14px", borderRadius: 12,
                    border: "1.5px solid #e5e7eb", fontSize: 13, outline: "none",
                    background: "#fff",
                  }}
                />
                <button type="submit" className="rainbow-cta rounded-xl px-4 py-2 text-sm font-bold">
                  Send
                </button>
              </form>
            ) : (
              <p style={{ fontSize: 12, color: "#94a3b8", textAlign: "center" }}>
                Join the challenge to chat
              </p>
            )}
          </div>
        </div>

        {/* ── Join / Leave ───────────────────────────────────────────────── */}
        {!userId && (
          <div className="neon-card rounded-2xl p-6 text-center">
            <p className="text-slate-500 text-sm mb-4">Log in to join this challenge</p>
            <button onClick={() => router.push("/auth")} className="rainbow-cta rounded-full px-6 py-3 font-semibold">
              Log in / Sign up
            </button>
          </div>
        )}
        {userId && !isMember && (
          <div className="neon-card rounded-2xl p-6 text-center">
            <button onClick={handleJoin} className="rainbow-cta rounded-full px-6 py-3 font-semibold">
              Join Challenge
            </button>
          </div>
        )}
        {userId && isMember && (
          <div style={{ textAlign: "center" }}>
            <button
              onClick={handleLeave}
              style={{
                padding: "10px 24px", borderRadius: 99, fontSize: 13, fontWeight: 700,
                border: "1.5px solid #fca5a5", background: "#fff5f5", color: "#ef4444",
                cursor: "pointer",
              }}
            >
              Leave Challenge
            </button>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SHEET 1 — Month Calendar
      ══════════════════════════════════════════════════════════════════════ */}
      {showCalendar && (
        <div
          className="sheet-backdrop"
          onClick={e => {
            if (e.target === e.currentTarget) { setShowCalendar(false); setSelectedDays(new Set()); }
          }}
        >
          <div className="sheet-panel">
            <div className="sheet-handle" />

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <button
                className="stepper-btn"
                onClick={() => setCalMonth(p => {
                  const d = new Date(p.y, p.m - 1);
                  return { y: d.getFullYear(), m: d.getMonth() };
                })}
                disabled={challenge.start_date
                  ? toDateStr(calMonth.y, calMonth.m, 1) <= challenge.start_date.slice(0, 7) + "-01"
                  : false}
              >‹</button>
              <p style={{ fontFamily: "var(--font-inter), system-ui, sans-serif", fontSize: 22, color: "#0e0e0e", letterSpacing: 1 }}>
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

            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 8 }}>
              {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
                <p key={d} style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textAlign: "center" }}>{d}</p>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 20 }}>
              {buildCalendarDays().map((day, i) => {
                if (!day) return <div key={`empty-${i}`} />;
                const dateStr  = toDateStr(calMonth.y, calMonth.m, day);
                const hasLog   = !!logsByDate[dateStr];
                const selected = selectedDays.has(dateStr);
                const isFuture = dateStr > todayStr;
                const isToday  = dateStr === todayStr;
                return (
                  <button
                    key={dateStr}
                    onClick={() => toggleDay(dateStr)}
                    disabled={isFuture}
                    style={{
                      aspectRatio: "1", borderRadius: 10, fontSize: 12, fontWeight: 700,
                      border: "none", cursor: isFuture ? "default" : "pointer",
                      background: selected
                        ? "linear-gradient(135deg,#ff6b9d,#667eea)"
                        : hasLog ? "rgba(102,126,234,0.12)" : "rgba(0,0,0,0.04)",
                      color: selected ? "#fff" : isFuture ? "#cbd5e1" : isToday ? "#7b2d8b" : "#1e293b",
                      outline: isToday ? "2px solid #7b2d8b" : "none",
                      opacity: isFuture ? 0.4 : 1,
                    }}
                  >
                    {day}
                    {hasLog && !selected && (
                      <span style={{ display: "block", fontSize: 5, marginTop: 1, color: "#667eea" }}>●</span>
                    )}
                  </button>
                );
              })}
            </div>

            <p style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", marginBottom: 12 }}>
              {selectedDays.size === 0
                ? "Tap days to select them"
                : `${selectedDays.size} day${selectedDays.size > 1 ? "s" : ""} selected`}
            </p>
            <button
              className="rainbow-btn"
              onClick={openEditPanel}
              disabled={selectedDays.size === 0}
              style={{ opacity: selectedDays.size === 0 ? 0.4 : 1 }}
            >
              Edit Selected Days →
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SHEET 2 — Edit Panel
      ══════════════════════════════════════════════════════════════════════ */}
      {showEditPanel && (
        <div
          className="sheet-backdrop"
          onClick={e => {
            if (e.target === e.currentTarget && !saving) {
              setShowEditPanel(false);
            }
          }}
        >
          <div className="sheet-panel">
            <div className="sheet-handle" />

            <p style={{ fontFamily: "var(--font-inter), system-ui, sans-serif", fontSize: 22, letterSpacing: 1, color: "#0e0e0e", marginBottom: 4 }}>
              Edit Check-ins
            </p>
            <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 20 }}>
              {isTimed ? "Adjust your logged time for each selected day." : "Adjust your completed reps for each selected day."}
            </p>

            {saveSuccess ? (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <p style={{ fontSize: 36, marginBottom: 8 }}>✅</p>
                <p style={{ fontFamily: "var(--font-inter), system-ui, sans-serif", fontSize: 20, color: "#48cfad", letterSpacing: 1 }}>
                  Saved! Points updated.
                </p>
                <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>
                  Your total is now ⭐ {userTotalPoints}
                </p>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 20, maxHeight: "50vh", overflowY: "auto" }}>
                  {editCards.map((card, i) => {
                    // Timed card
                    if (isTimed) {
                      const displayVal = card.duration_seconds !== null
                        ? secondsToDisplay(card.duration_seconds)
                        : "";
                      return (
                        <div key={card.date} style={{ background: "rgba(0,0,0,0.03)", borderRadius: 16, padding: 16 }}>
                          <p style={{ fontSize: 13, fontWeight: 900, color: "#0e0e0e", marginBottom: 12 }}>{card.date}</p>
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="0:00"
                            value={displayVal}
                            onChange={e => {
                              const formatted = formatTimeInput(e.target.value);
                              const secs = displayToSeconds(formatted);
                              setEditCards(p => p.map((c, j) =>
                                j === i ? { ...c, duration_seconds: secs } : c
                              ));
                            }}
                            style={{
                              width: "100%",
                              padding: "12px 16px",
                              fontSize: 24,
                              fontWeight: 700,
                              letterSpacing: 2,
                              textAlign: "center",
                              borderRadius: 12,
                              border: "2px solid #e5e7eb",
                              background: "#fff",
                              outline: "none",
                              color: "#0e0e0e",
                            }}
                          />
                          {previousBestSeconds !== null && card.duration_seconds !== null && (
                            <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginTop: 6 }}>
                              Best: {secondsToDisplay(previousBestSeconds)}
                            </p>
                          )}
                        </div>
                      );
                    }

                    // Reps card
                    const pct     = card.target > 0 ? Math.min(100, Math.round((card.completed / card.target) * 100)) : 100;
                    const points  = calcPoints(card.completed, card.target, pointsMax);
                    const pctLabel = pct >= 100 ? "100%" : pct >= 50 ? "50%+" : "<50%";
                    return (
                      <div key={card.date} style={{ background: "rgba(0,0,0,0.03)", borderRadius: 16, padding: 16 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 900, color: "#0e0e0e" }}>{card.date}</p>
                            <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Target: {card.target} {targetUnit}</p>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <p style={{ fontSize: 18, fontWeight: 900, color: points > 0 ? "#7b2d8b" : "#cbd5e1" }}>+{points}</p>
                            <p style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700 }}>pts · {pctLabel}</p>
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                          <button
                            className="stepper-btn"
                            onClick={() => setEditCards(p => p.map((c, j) => j === i ? { ...c, completed: Math.max(0, c.completed - 1) } : c))}
                          >−</button>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, textAlign: "center", marginBottom: 4 }}>
                              Completed
                            </p>
                            <input
                              className="edit-num-input"
                              type="number" min={0}
                              value={card.completed}
                              onChange={e => setEditCards(p => p.map((c, j) => j === i ? { ...c, completed: Math.max(0, parseInt(e.target.value) || 0) } : c))}
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

                        <div style={{ height: 5, borderRadius: 99, background: "#f1f5f9", overflow: "hidden" }}>
                          <div style={{
                            height: "100%", borderRadius: 99, width: `${pct}%`, transition: "width 0.25s ease",
                            background: pct >= 100
                              ? "linear-gradient(90deg,#ff6b9d,#ff9f43,#ffdd59,#48cfad,#667eea)"
                              : pct >= 50 ? "linear-gradient(90deg,#48cfad,#667eea)" : "#e5e7eb",
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button className="rainbow-btn" onClick={handleSaveEdits} disabled={saving}>
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}