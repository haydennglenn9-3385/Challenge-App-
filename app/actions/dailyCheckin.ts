"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const GLOBAL_POINTS = 5;
const STREAK_MILESTONES: Record<number, number> = { 7: 25, 30: 100, 100: 500 };

export interface CheckInResult {
  success: boolean;
  alreadyDone?: boolean;
  streak?: number;
  pointsEarned?: number;
  streakBonus?: number;
  error?: string;
}

export async function dailyCheckin(): Promise<CheckInResult> {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const today = new Date().toISOString().split("T")[0];

  const { data: profile } = await supabase
    .from("users")
    .select("streak, total_points, global_points, last_checkin_date, name, display_name, emoji_avatar")
    .eq("id", user.id)
    .single();

  if (!profile) return { success: false, error: "User not found" };

  // ── Already checked in today ─────────────────────────────────────────────
  if (profile.last_checkin_date === today) {
    return { success: false, alreadyDone: true, streak: profile.streak ?? 0 };
  }

  // ── Streak calculation ───────────────────────────────────────────────────
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  const newStreak =
    profile.last_checkin_date === yesterdayStr
      ? (profile.streak ?? 0) + 1
      : 1;

  const streakBonus  = STREAK_MILESTONES[newStreak] ?? 0;
  const totalPoints  = GLOBAL_POINTS + streakBonus;

  // ── Update user ──────────────────────────────────────────────────────────
  await supabase
    .from("users")
    .update({
      streak:            newStreak,
      total_points:      (profile.total_points  ?? 0) + totalPoints,
      global_points:     (profile.global_points ?? 0) + totalPoints,
      last_checkin_date: today,
    })
    .eq("id", user.id);

  // ── Activity feed ────────────────────────────────────────────────────────
  const userName = profile.display_name || profile.name || "Member";

  await supabase.from("activity_feed").insert({
    user_id:      user.id,
    user_name:    userName,
    emoji_avatar: profile.emoji_avatar ?? null,
    type:         "streak",
    text:         streakBonus > 0
      ? `hit a ${newStreak}-day streak! 🔥 +${streakBonus} bonus pts`
      : "checked in for the day! 💪",
    meta: {
      days:   newStreak,
      points: totalPoints,
      bonus:  streakBonus,
    },
  });

  return {
    success:      true,
    streak:       newStreak,
    pointsEarned: GLOBAL_POINTS,
    streakBonus,
  };
}

/**
 * Lightweight fetch — used on mount to check if the user already
 * checked in today and to load their current streak.
 */
export async function getCheckinStatus(): Promise<{
  checkedInToday: boolean;
  streak: number;
}> {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { checkedInToday: false, streak: 0 };

  const today = new Date().toISOString().split("T")[0];

  const { data } = await supabase
    .from("users")
    .select("streak, last_checkin_date")
    .eq("id", user.id)
    .single();

  return {
    checkedInToday: data?.last_checkin_date === today,
    streak:         data?.streak ?? 0,
  };
}