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
  const cookieStore = await cookies();
  
  // ADD THESE:
  console.log("SERVER: SUPABASE_URL =", process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log("SERVER: ANON_KEY set?", !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  console.log("SERVER: SERVICE_KEY set?", !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  );

  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
  
  // ADD THIS:
  console.log("SERVER: auth.getUser result — user:", user?.id ?? "null", "error:", authError?.message ?? "none");
  
  if (!user) return { success: false, error: "Not authenticated" };

  const today = new Date().toISOString().split("T")[0];

  // ── Fetch or create profile (admin client — bypasses RLS) ────────────────
let { data: profile } = await supabaseAdmin
  .from("users")
  .select("streak, total_points, global_points, last_checkin_date, name, display_name, emoji_avatar")
  .eq("id", user.id)
  .maybeSingle();

if (!profile) {
  const { error: upsertError } = await supabaseAdmin.from("users").upsert({
    id:            user.id,
    email:         user.email ?? "",
    name:          user.user_metadata?.display_name
                   ?? user.user_metadata?.name
                   ?? user.email?.split("@")[0]
                   ?? "Member",
    streak:        0,
    total_points:  0,
    global_points: 0,
  }, { onConflict: "id" });  // removed ignoreDuplicates — we need to know if it fails

  if (upsertError) {
    console.error("dailyCheckin: failed to create user profile:", upsertError);
    return { success: false, error: `Profile creation failed: ${upsertError.message}` };
  }

  const { data: newProfile, error: refetchError } = await supabaseAdmin
    .from("users")
    .select("streak, total_points, global_points, last_checkin_date, name, display_name, emoji_avatar")
    .eq("id", user.id)
    .single();

  if (refetchError || !newProfile) {
    console.error("dailyCheckin: refetch after upsert failed:", refetchError);
    return { success: false, error: "Failed to load user profile after creation" };
  }
  
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