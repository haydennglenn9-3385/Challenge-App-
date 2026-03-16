"use server";

import { createServerClient } from "@supabase/ssr";
import { createClient }       from "@supabase/supabase-js";
import { cookies }            from "next/headers";

const GLOBAL_POINTS = 5;
const STREAK_MILESTONES: Record<number, number> = { 7: 25, 30: 100, 100: 500 };

// Service-role client — bypasses RLS, safe here because we verify identity first
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export interface CheckInResult {
  success: boolean;
  alreadyDone?: boolean;
  streak?: number;
  pointsEarned?: number;
  streakBonus?: number;
  newTotalPoints?: number;
  error?: string;
}

export async function dailyCheckin(): Promise<CheckInResult> {
  // ── Verify identity via session cookie ───────────────────────────────────
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  );

  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const today = new Date().toISOString().split("T")[0];

  // ── Fetch or create profile (admin client — no RLS interference) ─────────
  let { data: profile } = await supabaseAdmin
    .from("users")
    .select("streak, total_points, global_points, last_checkin_date, name, display_name, emoji_avatar")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    const { error: insertError } = await supabaseAdmin.from("users").insert({
      id:            user.id,
      email:         user.email ?? "",
      streak:        0,
      total_points:  0,
      global_points: 0,
    });

    if (insertError) {
      console.error("dailyCheckin: failed to create user row:", insertError);
      return { success: false, error: insertError.message };
    }

    const { data: newProfile } = await supabaseAdmin
      .from("users")
      .select("streak, total_points, global_points, last_checkin_date, name, display_name, emoji_avatar")
      .eq("id", user.id)
      .single();

    if (!newProfile) return { success: false, error: "Failed to initialize user" };
    profile = newProfile;
  }

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
  const newTotalPts  = (profile.total_points  ?? 0) + totalPoints;
  const newGlobalPts = (profile.global_points ?? 0) + totalPoints;

  // ── Update user ──────────────────────────────────────────────────────────
  const { error: updateError } = await supabaseAdmin
    .from("users")
    .update({
      streak:            newStreak,
      total_points:      newTotalPts,
      global_points:     newGlobalPts,
      last_checkin_date: today,
    })
    .eq("id", user.id);

  if (updateError) {
    console.error("dailyCheckin update failed:", updateError);
    return { success: false, error: updateError.message };
  }

  // ── Activity feed ────────────────────────────────────────────────────────
  const userName = profile.display_name || profile.name || "Member";

  await supabaseAdmin.from("activity_feed").insert({
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
    success:       true,
    streak:        newStreak,
    pointsEarned:  GLOBAL_POINTS,
    streakBonus,
    newTotalPoints: newTotalPts,
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
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  );

  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return { checkedInToday: false, streak: 0 };

  const today = new Date().toISOString().split("T")[0];

  const { data } = await supabaseAdmin
    .from("users")
    .select("streak, last_checkin_date")
    .eq("id", user.id)
    .maybeSingle();

  return {
    checkedInToday: data?.last_checkin_date === today,
    streak:         data?.streak ?? 0,
  };
}