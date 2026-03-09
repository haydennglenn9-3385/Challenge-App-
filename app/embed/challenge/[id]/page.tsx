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
import ChatPanel from "@/components/chat/ChatPanel";

// ─── Constants ────────────────────────────────────────────────────────────────

const GLOBAL_POINTS_PER_CHECKIN = 5;

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const NYE_EXERCISES: Record<number, string> = {
  0: "Jumping Jacks",
  1: "Lunges",
  2: "Push-ups",
  3: "Glute Bridges",
  4: "Crunches",
  5: "Squats",
  6: "Bird Dogs",
};

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
  return Math.max(1, Math.floor(ms / (7 * 86400000)) + 1);
}

function getMonthNum(date: string, start: string): number {
  const d = new Date(date);
  const s = new Date(start);
  return (d.getFullYear() - s.getFullYear()) * 12 + (d.getMonth() - s.getMonth()) + 1;
}

function getSundayOfWeek(date: Date): string {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().split("T")[0];
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
    case "weekly":  return dailyTarget * getWeekNum(date, challengeStart);
    case "monthly": return dailyTarget * Math.max(1, getMonthNum(date, challengeStart));
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

function computeStreak(logs: { date: string; log_type?: string }[]): number {
  const dailyLogs = logs.filter(l => !l.log_type || l.log_type === "daily");
  if (!dailyLogs.length) return 0;
  const sorted = [...dailyLogs].sort((a, b) => a.date.localeCompare(b.date));
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

type CompletionLevel = "50%+" | "100%";
type LeaderboardView = "individual" | "team";

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

interface TeamStanding {
  id:           string;
  name:         string;
  color?:       string;
  total_points: number;
  member_count: number;
  avg_points:   number;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ChallengeDetailPage() {
  const params      = useParams<{ id: string }>();
  const router      = useRouter();
  const challengeId = typeof params?.id === "string" ? params.id : "";

  // ── Core state ───────────────────────────────────────────────────────────────
  const [challenge,    setChallenge]    = useState<any>(null);
  const [members,      setMembers]      = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [notFound,     setNotFound]     = useState(false);

  // ── Teams ────────────────────────────────────────────────────────────────────
  const [teams,            setTeams]            = useState<any[]>([]);
  const [teamMemberships,  setTeamMemberships]  = useState<{ team_id: string; user_id: string }[]>([]);
  const [leaderboardView,  setLeaderboardView]  = useState<LeaderboardView>("individual");

  // ── User state ───────────────────────────────────────────────────────────────
  const [userId,          setUserId]          = useState("");
  const [userName,        setUserName]        = useState(""); 
  const [isMember,        setIsMember]        = useState(false);
  const [userTeam,        setUserTeam]        = useState("");
  const [userTotalPoints, setUserTotalPoints] = useState(0);
  const [challengeLogs,   setChallengeLogs]   = useState<any[]>([]);
  const [challengeStreak, setChallengeStreak] = useState(0);
  const [challengePoints, setChallengePoints] = useState(0);

  // ── Check-in state ───────────────────────────────────────────────────────────
  const [checkedInToday,    setCheckedInToday]    = useState(false);
  const [todayPoints,       setTodayPoints]       = useState(0);
  const [checkingIn,        setCheckingIn]        = useState(false);
  const [inputValue,        setInputValue]        = useState(0);
  const [timeInput,         setTimeInput]         = useState("");
  const [deltaResult,       setDeltaResult]       = useState<DeltaResult | null>(null);

  // ── Progressive state ────────────────────────────────────────────────────────
  const [selectedDaily,        setSelectedDaily]        = useState<CompletionLevel | null>(null);
  const [selectedCardio,       setSelectedCardio]       = useState<CompletionLevel | null>(null);
  const [cardioLoggedThisWeek, setCardioLoggedThisWeek] = useState(false);
  const [cardioPoints,         setCardioPoints]         = useState(0);
  const [savingCardio,         setSavingCardio]         = useState(false);

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

  // ── Chat edit/delete state ────────────────────────────────────────────────────
  

  // ─── Derived values ───────────────────────────────────────────────────────────
  const today    = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const sundayStr = getSundayOfWeek(today);
  const todayDow  = today.getDay();

  const scoringType     = challenge?.scoring_type              ?? "task_completion";
  const isTimed         = scoringType === "time" || scoringType === "timed";
  const isProgressive   = scoringType === "progressive";
  const lowerIsBetter   = challenge?.scoring_direction === "asc";
  const dailyTarget     = Number(challenge?.daily_target       ?? 0);
  const targetUnit      = challenge?.target_unit               ?? "reps";
  const pointsMax       = challenge?.local_points_per_checkin  ?? 2;
  const progressionType = challenge?.progression_type          ?? "daily";
  const everyXDays      = challenge?.progression_interval_days ?? null;
  const hasTarget       = dailyTarget > 0 && !isTimed && !isProgressive;
  const hasTeams        = challenge?.has_teams ?? false;

  const startDate = challenge?.start_date ?? todayStr;
  const endDate   = challenge?.end_date   // allow null

  // ── End state ─────────────────────────────────────────────────────────────────
  const isEnded = endDate ? endDate < todayStr : false;

  const daysLeft = endDate
  ? Math.max(0, Math.ceil(
      (new Date(endDate).getTime() - today.getTime()) / 86400000
    ))
  : null; // ongoing

  const currentWeek = getWeekNum(todayStr, startDate);

  // Progressive targets
  const weeklyRepTarget    = isProgressive ? dailyTarget * currentWeek : 0;
  const weeklyCardioTarget = isProgressive ? 5 * currentWeek : 0;
  const todayExercise      = NYE_EXERCISES[todayDow] ?? "Exercise";

  const effectiveTarget = challenge
    ? getEffectiveTarget(todayStr, startDate, dailyTarget, scoringType, progressionType)
    : dailyTarget;

  const previousBestSeconds = useMemo(() => {
    if (!isTimed) return null;
    const times = challengeLogs
      .filter(l => !l.log_type || l.log_type === "daily")
      .map(l => l.duration_seconds)
      .filter((v): v is number => typeof v === "number" && v > 0);
    if (!times.length) return null;
    return lowerIsBetter ? Math.min(...times) : Math.max(...times);
  }, [challengeLogs, isTimed, lowerIsBetter]);

  const logsByDate = useMemo(() => {
    const map: Record<string, any> = {};
    for (const log of challengeLogs) {
      if (!log.log_type || log.log_type === "daily") map[log.date] = log;
    }
    return map;
  }, [challengeLogs]);

  const sortedMembers = useMemo(
    () => [...members].sort((a, b) => (b.total_points ?? 0) - (a.total_points ?? 0)),
    [members]
  );

  // ── Team standings (computed from loaded data) ─────────────────────────────
  const teamStandings = useMemo((): TeamStanding[] => {
    if (!teams.length) return [];
    return teams.map(team => {
      const memberIds = teamMemberships
        .filter(tm => tm.team_id === team.id)
        .map(tm => tm.user_id);
      const teamMembers = members.filter(m => memberIds.includes(m.id));
      const total = teamMembers.reduce((s: number, m: any) => s + (m.total_points ?? 0), 0);
      return {
        id:           team.id,
        name:         team.name,
        color:        team.color,
        total_points: total,
        member_count: teamMembers.length,
        avg_points:   teamMembers.length > 0 ? total / teamMembers.length : 0,
      };
    }).sort((a, b) => b.total_points - a.total_points);
  }, [teams, teamMemberships, members]);

  const parsedSeconds  = isTimed ? displayToSeconds(timeInput) : null;
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
    const streak = computeStreak(rows);
    setChallengeStreak(streak);
    const pts = rows.reduce((s, l) => s + (l.points_earned ?? 0), 0);
    setChallengePoints(pts);
    const todayLogged = rows.some(l =>
      l.date === todayStr && (!l.log_type || l.log_type === "daily")
    );
    setCheckedInToday(todayLogged);
    if (todayLogged) {
      const todayLog = rows.find(l => l.date === todayStr && (!l.log_type || l.log_type === "daily"));
      setTodayPoints(todayLog?.points_earned ?? 0);
    }

    // Check cardio for progressive
    const cardioThisWeek = rows.filter(l =>
      l.log_type === "cardio" && l.date >= sundayStr
    );
    setCardioLoggedThisWeek(cardioThisWeek.length > 0);
    setCardioPoints(cardioThisWeek.reduce((s, l) => s + (l.points_earned ?? 0), 0));

    return rows;
  }

  // ─── useEffect ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!challengeId) return;

    async function load() {
      // Load challenge
      const { data: ch } = await supabase
        .from("challenges").select("*").eq("id", challengeId).single();
      if (!ch) { setNotFound(true); setLoading(false); return; }
      setChallenge(ch);

      // Load members
      const { data: membersData } = await supabase
        .from("challenge_members")
        .select("user_id, users(id, name, total_points, streak, avatar_emoji)")
        .eq("challenge_id", challengeId);
      if (membersData) {
        setMembers(membersData.map((m: any) => ({ ...m.users })).filter(Boolean));
      }

      // Load teams if applicable
      if (ch.has_teams) {
        const { data: teamsData } = await supabase
          .from("teams")
          .select("id, name, color")
          .eq("challenge_id", challengeId)
          .order("name");
        if (teamsData) {
          setTeams(teamsData);
          if (teamsData.length > 0) {
            const { data: tmData } = await supabase
              .from("team_members")
              .select("team_id, user_id")
              .in("team_id", teamsData.map((t: any) => t.id));
            if (tmData) setTeamMemberships(tmData);
          }
        }
      }

      // Auth + membership
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: profile } = await supabase
          .from("users")
          .select("name")
          .eq("id", user.id)
          .single();
      if (profile?.name) setUserName(profile.name);
        
      const { data: memberCheck } = await supabase
          .from("challenge_members").select("id")
          .eq("challenge_id", challengeId).eq("user_id", user.id).maybeSingle();
        const member = !!memberCheck;
        setIsMember(member);

        if (member) {
          const logs = await loadLogs(user.id);
          const computed = logs.reduce((s, l) => s + (l.global_points_earned ?? 0), 0);
          setUserTotalPoints(computed);
          await supabase.from("users").update({ total_points: computed }).eq("id", user.id);

          const { data: teamRow } = await supabase
            .from("team_members").select("team_id, teams(name)")
            .eq("user_id", user.id).maybeSingle();
          if (teamRow?.teams) setUserTeam((teamRow.teams as any).name);
        }
      }

      setLoading(false);
    }

    load();
  }, [challengeId]);
  // ─── Join ─────────────────────────────────────────────────────────────────────
  async function handleJoin() {
    if (!userId || !challenge) return;

    let assignedTeamId: string | null = null;

    if (challenge.has_teams && challenge.auto_assign_teams) {
      const { data: teams } = await supabase
        .from("teams")
        .select("id")
        .eq("challenge_id", challenge.id);

      if (teams && teams.length > 0) {
        const teamCounts = await Promise.all(
          teams.map(async (team) => {
            const { count } = await supabase
              .from("challenge_members")
              .select("id", { count: "exact", head: true })
              .eq("challenge_id", challenge.id)
              .eq("team_id", team.id);
            return { teamId: team.id, count: count ?? 0 };
          })
        );
        teamCounts.sort((a, b) => a.count - b.count);
        assignedTeamId = teamCounts[0].teamId;
      }
    }

    await supabase.from("challenge_members").insert({
      challenge_id: challenge.id,
      user_id:      userId,
      team_id:      assignedTeamId,
    });

    setIsMember(true);
    const logs     = await loadLogs(userId);
    const computed = logs.reduce((s, l) => s + (l.global_points_earned ?? 0), 0);
    setUserTotalPoints(computed);
    
    if (assignedTeamId) {
      const { data: teamRow } = await supabase
        .from("teams").select("name").eq("id", assignedTeamId).single();
      if (teamRow) setUserTeam(teamRow.name);
    }
  }

  // ─── Leave ────────────────────────────────────────────────────────────────────
  async function handleLeave() {
    if (!confirm("Leave this challenge?")) return;
    await supabase.from("challenge_members")
      .delete().eq("challenge_id", challengeId).eq("user_id", userId);
    setIsMember(false);
    setChallengeLogs([]);
    setChallengeStreak(0);
    setCheckedInToday(false);
  }
  
  // ─── Standard check-in ───────────────────────────────────────────────────────
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
      log_type:             "daily",
      reps_completed:       isTimed ? 0 : completed,
      reps_target:          isTimed ? 0 : target,
      duration_seconds:     durationSecs,
      points_earned:        points,
      global_points_earned: GLOBAL_POINTS_PER_CHECKIN,
    });

    if (!error) {
      if (isTimed && durationSecs !== null && previousBestSeconds !== null) {
        setDeltaResult(timeDelta(durationSecs, previousBestSeconds, lowerIsBetter));
        setTimeout(() => setDeltaResult(null), 4000);
      }

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];
      const hadYesterday = challengeLogs.some(l =>
        l.date === yesterdayStr && (!l.log_type || l.log_type === "daily")
      );
      const newStreak = hadYesterday ? challengeStreak + 1 : 1;

      const STREAK_MILESTONES: Record<number, number> = { 7: 25, 30: 100, 100: 500 };
      const streakBonus    = STREAK_MILESTONES[newStreak] ?? 0;
      const totalNewPoints = GLOBAL_POINTS_PER_CHECKIN + streakBonus;
      const newGlobal      = userTotalPoints + totalNewPoints;

      await supabase.from("users")
        .update({ total_points: newGlobal, streak: newStreak })
        .eq("id", userId);

      
        const { data: uProfile } = await supabase
          .from("users").select("name, emoji_avatar").eq("id", userId).maybeSingle();
        await supabase.from("activity_feed").insert({
          user_id:      userId,
          user_name:    uProfile?.name ?? "Member",
          emoji_avatar: uProfile?.emoji_avatar ?? null,
          type:         "streak",
          text:         streakBonus > 0
            ? `hit a ${newStreak}-day streak! 🎉 +${streakBonus} bonus pts`
            : "checked in!",
          meta: {
            challenge_id:   challengeId,
            challenge_name: challenge?.name ?? null,
            days:           newStreak,
            points:         totalNewPoints,
            bonus:          streakBonus,
          },
        });

      setCheckedInToday(true);
      setTodayPoints(points);
      setUserTotalPoints(newGlobal);
      setChallengeStreak(newStreak);
      setChallengePoints(prev => prev + points);
      setChallengeLogs(prev => [...prev, {
        date:                 todayStr,
        log_type:             "daily",
        reps_completed:       isTimed ? 0 : completed,
        reps_target:          isTimed ? 0 : target,
        duration_seconds:     durationSecs,
        points_earned:        points,
        global_points_earned: GLOBAL_POINTS_PER_CHECKIN,
      }]);
    }
    setCheckingIn(false);
  }

  // ─── Progressive check-in ────────────────────────────────────────────────────
  async function handleProgressiveCheckIn() {
    if (!userId || !challengeId || checkedInToday || checkingIn || !selectedDaily) return;
    setCheckingIn(true);

    const points    = selectedDaily === "100%" ? 2 : 1;
    const completed = selectedDaily === "100%" ? weeklyRepTarget : Math.ceil(weeklyRepTarget * 0.5);

    const { error } = await supabase.from("daily_logs").insert({
      user_id:              userId,
      challenge_id:         challengeId,
      date:                 todayStr,
      log_type:             "daily",
      reps_completed:       completed,
      reps_target:          weeklyRepTarget,
      points_earned:        points,
      global_points_earned: GLOBAL_POINTS_PER_CHECKIN,
      exercise:             todayExercise,
      completion_level:     selectedDaily,
    });

    if (!error) {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];
      const hadYesterday = challengeLogs.some(l =>
        l.date === yesterdayStr && (!l.log_type || l.log_type === "daily")
      );
      const newStreak    = hadYesterday ? challengeStreak + 1 : 1;
      const STREAK_MILESTONES: Record<number, number> = { 7: 25, 30: 100, 100: 500 };
      const streakBonus    = STREAK_MILESTONES[newStreak] ?? 0;
      const totalNewPoints = GLOBAL_POINTS_PER_CHECKIN + streakBonus;
      const newGlobal      = userTotalPoints + totalNewPoints;

      await supabase.from("users")
        .update({ total_points: newGlobal, streak: newStreak })
        .eq("id", userId);

      const { data: uProfile } = await supabase
        .from("users").select("name, emoji_avatar").eq("id", userId).maybeSingle();
      await supabase.from("activity_feed").insert({
        user_id:      userId,
        user_name:    uProfile?.name ?? "Member",
        emoji_avatar: uProfile?.emoji_avatar ?? null,
        type:         "streak",
        text:         streakBonus > 0
          ? `hit a ${newStreak}-day streak! 🎉 +${streakBonus} bonus pts`
          : "checked in!",
        meta: {
          challenge_id:   challengeId,
          challenge_name: challenge?.name ?? null,
          days:           newStreak,
          points:         totalNewPoints,
          bonus:          streakBonus,
        },
      });

      setCheckedInToday(true);
      setTodayPoints(points);
      setUserTotalPoints(newGlobal);
      setChallengeStreak(newStreak);
      setChallengeLogs(prev => [...prev, {
        date: todayStr, log_type: "daily",
        reps_completed: completed, reps_target: weeklyRepTarget,
        points_earned: points, global_points_earned: GLOBAL_POINTS_PER_CHECKIN,
      }]);
    }
    setCheckingIn(false);
  }

  async function handleProgressiveCardio() {
    if (!userId || !challengeId || cardioLoggedThisWeek || savingCardio || !selectedCardio) return;
    setSavingCardio(true);

    const points   = selectedCardio === "100%" ? 2 : 1;
    const duration = selectedCardio === "100%" ? weeklyCardioTarget * 60 : Math.ceil(weeklyCardioTarget * 60 * 0.5);

    const { error } = await supabase.from("daily_logs").insert({
      user_id:              userId,
      challenge_id:         challengeId,
      date:                 todayStr,
      log_type:             "cardio",
      reps_completed:       0,
      reps_target:          weeklyCardioTarget,
      duration_seconds:     duration,
      points_earned:        points,
      global_points_earned: 0,
      completion_level:     selectedCardio,
    });

    if (!error) {
      setCardioLoggedThisWeek(true);
      setCardioPoints(points);
    }
    setSavingCardio(false);
  }

  // ─── Calendar helpers ─────────────────────────────────────────────────────────
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

  function openEditPanel() {
    if (!challenge) return;
    const cards: EditCard[] = Array.from(selectedDays).sort().map(dateStr => {
      const existing = logsByDate[dateStr];
      const target = getEffectiveTarget(
        dateStr, startDate, dailyTarget, scoringType, progressionType
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

  async function handleSaveEdits() {
    if (!userId || !challenge) return;
    setSaving(true);

    for (const card of editCards) {
      const points  = isTimed ? pointsMax : calcPoints(card.completed, card.target, pointsMax);
      const payload = {
        user_id:              userId,
        challenge_id:         challengeId,
        date:                 card.date,
        log_type:             "daily",
        reps_completed:       isTimed ? 0 : card.completed,
        reps_target:          isTimed ? 0 : card.target,
        duration_seconds:     isTimed ? card.duration_seconds : null,
        points_earned:        points,
        global_points_earned: GLOBAL_POINTS_PER_CHECKIN,
      };

      if (card.log_id) {
        await supabase.from("daily_logs").update(payload).eq("id", card.log_id);
      } else {
        await supabase.from("daily_logs").insert(payload);
      }
    }

    const logs    = await loadLogs(userId);
    const computed = logs.reduce((s, l) => s + (l.global_points_earned ?? 0), 0);
    setUserTotalPoints(computed);
    await supabase.from("users").update({ total_points: computed }).eq("id", userId);

    setSaving(false);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setShowEditPanel(false);
      setShowCalendar(false);
      setSelectedDays(new Set());
    }, 2000);
  }

  // ─── Loading / not found ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
        <div style={{ fontSize: 52 }}>🏳️‍🌈</div>
        <div style={{ fontFamily: "var(--font-inter), system-ui, sans-serif", fontSize: 18, color: "#7b2d8b", letterSpacing: 2 }}>LOADING...</div>
      </div>
    );
  }

  if (notFound || !challenge) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5">
        <div className="neon-card rounded-2xl p-12 text-center max-w-sm w-full">
          <p className="text-3xl mb-3">⚡</p>
          <p className="font-extrabold text-slate-900 text-lg mb-2">Challenge Not Found</p>
          <button onClick={() => router.push("/embed/challenges")} className="rainbow-cta px-6 py-3 rounded-xl font-bold text-sm w-full mt-4">
            Browse Challenges
          </button>
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-28">

      {/* ── Nav ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px 0" }}>
        <button
          onClick={() => router.back()}
          className="neon-card rounded-full px-4 py-2 text-sm font-semibold text-slate-700 flex items-center gap-1.5"
        >
          ← Back
        </button>
        <div style={{ display: "flex", gap: 8 }}>
          {userId && isMember && (
            <button
              onClick={() => router.push(`/embed/challenge/${challengeId}/manage`)}
              className="neon-card rounded-full px-4 py-2 text-sm font-semibold text-slate-700"
            >
              ⚙️ Manage
            </button>
          )}
          <button
            onClick={() => router.push("/embed/dashboard")}
            className="neon-card rounded-full px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Dashboard
          </button>
        </div>
      </div>

      <div style={{ padding: "16px 20px", maxWidth: 600, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>

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
            {/* Dates */}
            {challenge.end_date === null ? (
              <span>📅 {formatDate(challenge.start_date)} → Ongoing</span>
            ) : (
              <span>📅 {formatDate(challenge.start_date)} → {formatDate(challenge.end_date)}</span>
            )}

            {/* Status */}
            {challenge.end_date === null ? (
              <span>⏳ Ongoing</span>
            ) : isEnded ? (
              <span style={{ color: "#94a3b8" }}>✅ Ended</span>
            ) : (
              <span>⏳ {daysLeft}d left</span>
            )}

            {/* Week */}
            <span>📆 Week {currentWeek}</span>

            {/* Join Code */}
            {challenge.join_code && (
              <span className="neon-chip rounded-full px-3 py-0.5">
                Code: {challenge.join_code}
              </span>
            )}
          </div>
          </div>
        </div>

        {/* ── END STATE BANNER ────────────────────────────────────────────── */}
        {isEnded && (
          <div style={{
            borderRadius: 20, overflow: "hidden",
            border: "1.5px solid rgba(102,126,234,0.2)",
            background: "linear-gradient(135deg, rgba(255,107,157,0.06), rgba(102,126,234,0.06))",
          }}>
            <div style={{ height: 4, background: "linear-gradient(90deg,#ff6b9d,#ff9f43,#ffdd59,#48cfad,#667eea)" }} />
            <div style={{ padding: "20px 24px", textAlign: "center" }}>
              <p style={{ fontSize: 32, marginBottom: 8 }}>🏁</p>
              <p style={{ fontFamily: "var(--font-inter), system-ui, sans-serif", fontSize: 20, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>
                Challenge Complete!
              </p>
              <p style={{ fontSize: 14, color: "#64748b" }}>
                This challenge ended on {formatDate(endDate)}. Final results are below.
              </p>
              {isMember && sortedMembers.length > 0 && sortedMembers[0].id === userId && (
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  marginTop: 12, padding: "8px 16px", borderRadius: 99,
                  background: "linear-gradient(90deg,#ff6b9d,#ff9f43,#ffdd59,#48cfad,#667eea)",
                }}>
                  <span style={{ fontSize: 18 }}>🥇</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>You won this challenge!</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Challenge rules ─────────────────────────────────────────────── */}
        <details className="neon-card rounded-2xl px-5 py-4 cursor-pointer">
          <summary className="font-semibold text-slate-800 text-sm list-none flex items-center gap-2">
            ▶ 📋 Challenge Rules
          </summary>
          <div className="mt-3 space-y-1.5 text-sm text-slate-600">
            {challenge.rules ? (
              <p className="whitespace-pre-wrap">{challenge.rules}</p>
            ) : isProgressive ? (
              <>
                <p>🏋️ <strong>Daily Exercise:</strong> {frequencyLabel(progressionType, everyXDays)}</p>
                <p>📈 <strong>Progressive reps:</strong> Week {currentWeek} = {weeklyRepTarget} reps/day</p>
                <p>🚴 <strong>Weekly Cardio:</strong> {weeklyCardioTarget} min this week</p>
                <p>✅ <strong>Completion:</strong> 100% = 2pts, 50%+ = 1pt</p>
              </>
            ) : hasTarget ? (
              <>
                <p>🎯 <strong>Daily target:</strong> {dailyTarget} {targetUnit}</p>
                <p>📊 <strong>Scoring:</strong> {frequencyLabel(progressionType, everyXDays)}</p>
              </>
            ) : (
              <p>Check in daily to earn points and maintain your streak.</p>
            )}
          </div>
        </details>

        {/* ── Your stats ──────────────────────────────────────────────────── */}
        {isMember && (
          <div className="neon-card rounded-2xl overflow-hidden">
            <div className="h-1 w-full rainbow-cta" />
            <div style={{ padding: "16px 20px" }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", color: "#94a3b8", textTransform: "uppercase", marginBottom: 12 }}>
                Your Stats
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {[
                  { value: `⭐ ${challengePoints}`, label: "Challenge Pts" },
                  { value: `🔥 ${challengeStreak}`, label: "Streak" },
                  isTimed && previousBestSeconds !== null
                    ? { value: `⏱ ${secondsToDisplay(previousBestSeconds)}`, label: lowerIsBetter ? "Best Time" : "Longest" }
                    : isProgressive
                    ? { value: `🏃 ${cardioPoints > 0 ? "✓" : "—"}`, label: "Cardio This Wk" }
                    : { value: `${challengeLogs.filter(l => !l.log_type || l.log_type === "daily").length}`, label: "Check-ins" },
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

        {/* ── Check-in card (hidden when ended) ───────────────────────────── */}
        {isMember && !isEnded && (
          <div className="neon-card rounded-2xl overflow-hidden">
            <div className="h-1 w-full rainbow-cta" />
            <div style={{ padding: "20px" }}>

              {/* ══ PROGRESSIVE CHECK-IN ══ */}
              {isProgressive ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {/* Daily exercise */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <p style={{ fontFamily: "var(--font-inter), system-ui, sans-serif", fontSize: 18, color: "#0e0e0e", letterSpacing: 0.5, fontWeight: 700 }}>
                        💪 {todayExercise}
                      </p>
                      {checkedInToday && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#48cfad", background: "rgba(72,207,173,0.12)", padding: "3px 10px", borderRadius: 99 }}>
                          ✓ Done · +{todayPoints}pts
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12 }}>
                      Week {currentWeek} target: {weeklyRepTarget} reps
                    </p>
                    {checkedInToday ? (
                      <div style={{ background: "rgba(72,207,173,0.08)", borderRadius: 14, padding: "12px 16px", textAlign: "center" }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#48cfad" }}>✅ Today logged!</p>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                          {(["50%+", "100%"] as CompletionLevel[]).map(lvl => (
                            <button
                              key={lvl}
                              onClick={() => setSelectedDaily(lvl)}
                              style={{
                                flex: 1, padding: "10px 0", borderRadius: 12, fontWeight: 700, fontSize: 13,
                                border: selectedDaily === lvl ? "none" : "1.5px solid #e5e7eb",
                                background: selectedDaily === lvl
                                  ? "linear-gradient(90deg,#48cfad,#667eea)" : "#fff",
                                color: selectedDaily === lvl ? "#fff" : "#64748b",
                                cursor: "pointer",
                              }}
                            >
                             {lvl === "100%" ? `✓ ${weeklyRepTarget} reps` : `${Math.ceil(weeklyRepTarget * 0.5)}+ reps`}
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={handleProgressiveCheckIn}
                          disabled={checkingIn || !selectedDaily}
                          className="w-full rainbow-cta rounded-2xl py-3 font-semibold text-base disabled:opacity-50"
                        >
                          {checkingIn ? "Saving…" : "Log Check-in"}
                        </button>
                      </>
                    )}
                  </div>

                  {/* Cardio */}
                  <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <p style={{ fontFamily: "var(--font-inter), system-ui, sans-serif", fontSize: 18, color: "#0e0e0e", letterSpacing: 0.5, fontWeight: 700 }}>
                        🚴 Weekly Cardio
                      </p>
                      {cardioLoggedThisWeek && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#48cfad", background: "rgba(72,207,173,0.12)", padding: "3px 10px", borderRadius: 99 }}>
                          ✓ Done · +{cardioPoints}pts
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12 }}>
                      Week {currentWeek} target: {weeklyCardioTarget} min
                    </p>
                    {cardioLoggedThisWeek ? (
                      <div style={{ background: "rgba(72,207,173,0.08)", borderRadius: 14, padding: "12px 16px", textAlign: "center" }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#48cfad" }}>✅ Cardio logged this week!</p>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                          {(["50%+", "100%"] as CompletionLevel[]).map(lvl => (
                            <button
                              key={lvl}
                              onClick={() => setSelectedCardio(lvl)}
                              style={{
                                flex: 1, padding: "10px 0", borderRadius: 12, fontWeight: 700, fontSize: 13,
                                border: selectedCardio === lvl ? "none" : "1.5px solid #e5e7eb",
                                background: selectedCardio === lvl
                                  ? "linear-gradient(90deg,#ff6b9d,#ff9f43)" : "#fff",
                                color: selectedCardio === lvl ? "#fff" : "#64748b",
                                cursor: "pointer",
                              }}
                            >
                              {lvl === "100%" ? `✓ ${weeklyCardioTarget} min` : `${Math.ceil(weeklyCardioTarget * 0.5)}+ min`}
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={handleProgressiveCardio}
                          disabled={savingCardio || !selectedCardio}
                          style={{
                            width: "100%", padding: "12px 0", borderRadius: 16, fontWeight: 700, fontSize: 14,
                            background: "linear-gradient(90deg,#ff6b9d,#ff9f43)", color: "#fff",
                            border: "none", cursor: savingCardio || !selectedCardio ? "default" : "pointer",
                            opacity: savingCardio || !selectedCardio ? 0.5 : 1,
                          }}
                        >
                          {savingCardio ? "Saving…" : "Log Cardio"}
                        </button>
                      </>
                    )}
                  </div>

              
                </div>

              ) : 
              
              /* ══ STANDARD CHECK-IN ══ */ (
                <>
                  {checkedInToday ? (
                    <div style={{ textAlign: "center", padding: "8px 0 4px" }}>
                      <p style={{ fontSize: 28, marginBottom: 4 }}>✅</p>
                      <p style={{ fontFamily: "var(--font-inter), system-ui, sans-serif", fontSize: 18, color: "#48cfad", letterSpacing: 0.5, fontWeight: 700 }}>
                        Logged! +{todayPoints}pts
                      </p>
                      {deltaResult && (
                        <p style={{ fontSize: 13, color: deltaResult.improved ? "#48cfad" : "#f59e0b", marginTop: 4, fontWeight: 600 }}>
                          {deltaResult.improved ? "🏆 " : "📊 "}{deltaResult.delta}
                        </p>
                      )}
                    </div>
                  ) : (
                    <>
                      {isTimed ? (
                        <div style={{ marginBottom: 16 }}>
                          <label style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                            Your time (m:ss)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="0:00"
                            value={timeInput}
                            onChange={e => setTimeInput(formatTimeInput(e.target.value))}
                            style={{
                              width: "100%", padding: "12px 16px", borderRadius: 14,
                              border: "1.5px solid #e5e7eb", fontSize: 20, fontWeight: 700,
                              outline: "none", textAlign: "center", boxSizing: "border-box",
                            }}
                          />
                          {previousBestSeconds !== null && (
                            <p style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", marginTop: 6 }}>
                              {lowerIsBetter ? "Best" : "Longest"}: {secondsToDisplay(previousBestSeconds)}
                            </p>
                          )}
                        </div>
                      ) : hasTarget ? (
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                            <button
                              className="stepper-btn"
                              onClick={() => setInputValue(v => Math.max(0, v - 1))}
                            >−</button>
                            <div style={{ flex: 1, textAlign: "center" }}>
                              <p style={{ fontFamily: "var(--font-inter), system-ui, sans-serif", fontSize: 40, fontWeight: 900, color: "#0e0e0e", lineHeight: 1 }}>
                                {inputValue}
                              </p>
                              <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                                / {effectiveTarget} {targetUnit}
                              </p>
                            </div>
                            <button
                              className="stepper-btn"
                              onClick={() => setInputValue(v => v + 1)}
                            >+</button>
                          </div>
                          <div style={{ height: 6, borderRadius: 99, background: "#f1f5f9", overflow: "hidden" }}>
                            <div style={{
                              height: "100%", borderRadius: 99,
                              width: `${Math.min(100, (inputValue / effectiveTarget) * 100)}%`,
                              transition: "width 0.2s ease",
                              background: inputValue >= effectiveTarget
                                ? "linear-gradient(90deg,#ff6b9d,#ff9f43,#ffdd59,#48cfad,#667eea)"
                                : "linear-gradient(90deg,#48cfad,#667eea)",
                            }} />
                          </div>
                        </div>
                      ) : null}
                      <button
                        onClick={handleCheckIn}
                        disabled={checkingIn || (hasTarget && inputValue === 0)}
                        className="w-full rainbow-cta rounded-2xl py-3 font-semibold text-base disabled:opacity-50"
                      >
                        {checkingIn ? "Saving…" : "Log Check-in"}
                      </button>
                      
                    </>
                  )}
                </>
              )}
              <button
                onClick={() => router.push(`/embed/challenge/${challengeId}/edit`)}
                style={{ width: "100%", marginTop: 12, padding: "10px 0", fontSize: 13,
                  fontWeight: 700, color: "#7b2d8b", background: "transparent",
                  border: "none", cursor: "pointer" }}
              >
                ✏️ Edit Past Entries
              </button>
            </div>
          </div>
        )}

        {/* ── Leaderboard ─────────────────────────────────────────────────── */}
        {members.length > 0 && (
          <div className="neon-card rounded-2xl overflow-hidden">
            <div className="h-1 w-full rainbow-cta" />
            <div style={{ padding: "16px 20px" }}>

              {/* Header + team toggle */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", color: "#94a3b8", textTransform: "uppercase" }}>
                  {isEnded ? "🏁 Final Results" : "Leaderboard"}
                </p>
                {hasTeams && teamStandings.length > 0 && (
                  <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 99, padding: 3, gap: 2 }}>
                    {(["individual", "team"] as LeaderboardView[]).map(v => (
                      <button
                        key={v}
                        onClick={() => setLeaderboardView(v)}
                        style={{
                          padding: "4px 12px", borderRadius: 99, fontSize: 11, fontWeight: 700,
                          border: "none", cursor: "pointer", transition: "all 0.15s",
                          background: leaderboardView === v
                            ? "linear-gradient(90deg,#ff6b9d,#667eea)" : "transparent",
                          color: leaderboardView === v ? "#fff" : "#94a3b8",
                        }}
                      >
                        {v === "individual" ? "👤" : "👥"} {v.charAt(0).toUpperCase() + v.slice(1)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Individual leaderboard */}
              {leaderboardView === "individual" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {sortedMembers.map((member, i) => {
                    const isMe = member.id === userId;
                    return (
                      <div
                        key={member.id}
                        onClick={() => member.id && router.push(`/embed/profile/${member.id}`)}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "10px 14px", borderRadius: 14, cursor: "pointer",
                          background: isMe
                            ? "linear-gradient(135deg,#ff6b9d,#667eea)"
                            : "rgba(0,0,0,0.03)",
                          transition: "opacity 0.15s",
                        }}
                        onMouseEnter={e => { if (!isMe) (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.06)"; }}
                        onMouseLeave={e => { if (!isMe) (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.03)"; }}
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
              )}

              {/* Team leaderboard */}
              {leaderboardView === "team" && teamStandings.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {teamStandings.map((team, i) => {
                    const isMyTeam = userTeam === team.name;
                    return (
                      <div
                        key={team.id}
                        style={{
                          display: "flex", alignItems: "center", gap: 12,
                          padding: "12px 16px", borderRadius: 16,
                          background: isMyTeam
                            ? "linear-gradient(135deg,rgba(255,107,157,0.1),rgba(102,126,234,0.1))"
                            : "rgba(0,0,0,0.03)",
                          border: isMyTeam ? "1.5px solid rgba(102,126,234,0.2)" : "1.5px solid transparent",
                        }}
                      >
                        <span style={{ fontSize: 13, fontWeight: 900, width: 20, textAlign: "center", color: i < 3 ? "#ff9f43" : "#94a3b8" }}>
                          {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                        </span>
                        <div style={{
                          width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                          background: team.color || "linear-gradient(135deg,#ff6b9d,#667eea)",
                        }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: 6 }}>
                            {team.name}
                            {isMyTeam && <span style={{ fontSize: 10, fontWeight: 700, color: "#7b2d8b", background: "rgba(123,45,139,0.1)", padding: "2px 8px", borderRadius: 99 }}>Your Team</span>}
                          </p>
                          <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>
                            {team.member_count} members · avg {Math.round(team.avg_points)} pts
                          </p>
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 900, color: "#334155" }}>
                          ⭐ {team.total_points}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Chat ────────────────────────────────────────────────────────── */}
        {userId && isMember && (
          <div className="neon-card rounded-2xl overflow-hidden" style={{ height: 480 }}>
            <ChatPanel
              context={{ type: "challenge", id: challengeId }}
              currentUserId={userId}
              currentUserName={userName}
              title="Challenge Chat"
            />
          </div>
        )}
        {userId && !isMember && (
          <div className="neon-card rounded-2xl overflow-hidden">
            <div className="h-1 w-full rainbow-cta" />
            <div className="px-5 py-6 text-center">
              <p className="text-xs font-bold tracking-widest uppercase text-slate-400 mb-2">
                Challenge Chat
              </p>
              <p className="text-sm text-slate-500">Join the challenge to chat 💬</p>
            </div>
          </div>
        )}

        {/* ── Join / Leave ─────────────────────────────────────────────────── */}
        {!userId && (
          <div className="neon-card rounded-2xl p-6 text-center">
            <p className="text-slate-500 text-sm mb-4">Log in to join this challenge</p>
            <button onClick={() => router.push("/auth")} className="rainbow-cta rounded-full px-6 py-3 font-semibold">
              Log in / Sign up
            </button>
          </div>
        )}
        {userId && !isMember && !isEnded && (
          <div className="neon-card rounded-2xl p-6 text-center">
            <p className="text-sm text-slate-500 mb-4">Ready to join?</p>
            <button onClick={handleJoin} className="rainbow-cta rounded-full px-6 py-3 font-semibold">
              Join Challenge
            </button>
          </div>
        )}
        {userId && !isMember && isEnded && (
          <div className="neon-card rounded-2xl p-5 text-center">
            <p style={{ fontSize: 13, color: "#94a3b8" }}>This challenge has ended and is no longer accepting new members.</p>
          </div>
        )}
        {userId && isMember && (
          <div style={{ textAlign: "center" }}>
            <button
              onClick={handleLeave}
              style={{
                padding: "10px 24px", borderRadius: 99, fontSize: 13, fontWeight: 700,
                border: "1.5px solid #fca5a5", background: "#fff5f5", color: "#ef4444", cursor: "pointer",
              }}
            >
              Leave Challenge
            </button>
          </div>
        )}
      </div>

      {/* ══ SHEET 1 — Month Calendar ══════════════════════════════════════════ */}
      {showCalendar && (
        <div
          className="sheet-backdrop"
          onClick={e => { if (e.target === e.currentTarget) { setShowCalendar(false); setSelectedDays(new Set()); } }}
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
                  ? toDateStr(calMonth.y, calMonth.m, 1) <= challenge.start_date
                  : false
                }
              >
                ←
              </button>
              <p style={{ fontFamily: "var(--font-inter), system-ui, sans-serif", fontSize: 18, fontWeight: 700, color: "#0e0e0e" }}>
                {MONTH_NAMES[calMonth.m]} {calMonth.y}
              </p>
              <button
                className="stepper-btn"
                onClick={() => setCalMonth(p => {
                  const d = new Date(p.y, p.m + 1);
                  return { y: d.getFullYear(), m: d.getMonth() };
                })}
                disabled={toDateStr(calMonth.y, calMonth.m, 1) >= toDateStr(today.getFullYear(), today.getMonth(), 1)}
              >
                →
              </button>
            </div>

            {/* Day headers */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 4 }}>
              {["S","M","T","W","T","F","S"].map((d, i) => (
                <div key={i} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "#94a3b8", padding: "4px 0" }}>{d}</div>
              ))}
            </div>

            {/* Calendar days */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 20 }}>
              {buildCalendarDays().map((day, i) => {
                if (!day) return <div key={`e${i}`} />;
                const dateStr  = toDateStr(calMonth.y, calMonth.m, day);
                const isLogged = !!logsByDate[dateStr];
                const isSel    = selectedDays.has(dateStr);
                const isFuture = dateStr > todayStr;
                return (
                  <button
                    key={dateStr}
                    onClick={() => !isFuture && toggleDay(dateStr)}
                    disabled={isFuture}
                    style={{
                      aspectRatio: "1", borderRadius: 10, fontSize: 12, fontWeight: 700,
                      border: "none", cursor: isFuture ? "default" : "pointer",
                      background: isSel
                        ? "linear-gradient(135deg,#ff6b9d,#667eea)"
                        : isLogged ? "rgba(72,207,173,0.15)" : "rgba(0,0,0,0.03)",
                      color: isSel ? "#fff" : isFuture ? "#cbd5e1" : isLogged ? "#0f766e" : "#334155",
                      opacity: isFuture ? 0.4 : 1,
                    }}
                  >
                    {day}
                    {isLogged && !isSel && <span style={{ display: "block", width: 4, height: 4, borderRadius: "50%", background: "#48cfad", margin: "2px auto 0" }} />}
                  </button>
                );
              })}
            </div>

            <p style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", marginBottom: 12 }}>
              {selectedDays.size === 0 ? "Tap days to select them" : `${selectedDays.size} day${selectedDays.size > 1 ? "s" : ""} selected`}
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

      {/* ══ SHEET 2 — Edit Panel ══════════════════════════════════════════════ */}
      {showEditPanel && (
        <div
          className="sheet-backdrop"
          onClick={e => { if (e.target === e.currentTarget && !saving) setShowEditPanel(false); }}
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
                <p style={{ fontFamily: "var(--font-inter), system-ui, sans-serif", fontSize: 20, color: "#48cfad", letterSpacing: 1 }}>Saved! Points updated.</p>
                <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>Your total is now ⭐ {userTotalPoints}</p>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 20, maxHeight: "50vh", overflowY: "auto" }}>
                  {editCards.map((card, i) => {
                    if (isTimed) {
                      const displayVal = card.duration_seconds !== null ? secondsToDisplay(card.duration_seconds) : "";
                      return (
                        <div key={card.date} style={{ background: "rgba(0,0,0,0.03)", borderRadius: 16, padding: 16 }}>
                          <p style={{ fontSize: 13, fontWeight: 900, color: "#0e0e0e", marginBottom: 12 }}>{card.date}</p>
                          <input
                            type="text" inputMode="numeric" placeholder="0:00" value={displayVal}
                            onChange={e => {
                              const formatted = formatTimeInput(e.target.value);
                              const secs      = displayToSeconds(formatted);
                              setEditCards(p => p.map((c, j) => j === i
                                ? { ...c, duration_seconds: secs ?? null }
                                : c
                              ));
                            }}
                            style={{
                              width: "100%", padding: "10px 14px", borderRadius: 12,
                              border: "1.5px solid #e5e7eb", fontSize: 20, fontWeight: 700,
                              outline: "none", textAlign: "center", boxSizing: "border-box",
                            }}
                          />
                        </div>
                      );
                    }

                    const pct = card.target > 0 ? Math.min(100, Math.round((card.completed / card.target) * 100)) : 0;
                    return (
                      <div key={card.date} style={{ background: "rgba(0,0,0,0.03)", borderRadius: 16, padding: 16 }}>
                        <p style={{ fontSize: 13, fontWeight: 900, color: "#0e0e0e", marginBottom: 12 }}>{card.date}</p>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                          <button className="stepper-btn" onClick={() => setEditCards(p => p.map((c, j) => j === i ? { ...c, completed: Math.max(0, c.completed - 1) } : c))}>−</button>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, textAlign: "center", marginBottom: 4 }}>Completed</p>
                            <input
                              className="edit-num-input" type="number" min={0} value={card.completed}
                              onChange={e => setEditCards(p => p.map((c, j) => j === i ? { ...c, completed: Math.max(0, parseInt(e.target.value) || 0) } : c))}
                            />
                          </div>
                          <button className="stepper-btn" onClick={() => setEditCards(p => p.map((c, j) => j === i ? { ...c, completed: c.completed + 1 } : c))}>+</button>
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