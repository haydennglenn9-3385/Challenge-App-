"use server";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export interface RepairStreakResult {
  success: boolean;
  alreadyUsedThisMonth?: boolean;
  notNeeded?: boolean;
  error?: string;
  streak?: number;
}

export async function repairStreak(): Promise<RepairStreakResult> {
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  );

  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(yesterdayDate);

  const { data: profile, error: fetchError } = await supabaseAdmin
    .from("users")
    .select("streak, last_checkin_date, streak_repair_used_at, name, avatar_emoji")
    .eq("id", user.id)
    .single();

  if (fetchError || !profile) return { success: false, error: "Failed to load profile" };

  // Already checked in today — repair not needed
  if (profile.last_checkin_date === todayStr) {
    return { success: false, notNeeded: true };
  }

  // Streak is already intact for today's check-in
  if (profile.last_checkin_date === yesterdayStr) {
    return { success: false, notNeeded: true };
  }

  // Check monthly limit
  if (profile.streak_repair_used_at) {
    const usedMonth = profile.streak_repair_used_at.slice(0, 7); // "YYYY-MM"
    const thisMonth = todayStr.slice(0, 7);
    if (usedMonth === thisMonth) {
      return { success: false, alreadyUsedThisMonth: true };
    }
  }

  // Apply repair: set last_checkin_date to yesterday so today's check-in continues the streak
  const { error: updateError } = await supabaseAdmin
    .from("users")
    .update({
      last_checkin_date: yesterdayStr,
      streak_repair_used_at: todayStr,
    })
    .eq("id", user.id);

  if (updateError) return { success: false, error: updateError.message };

  // Activity feed entry
  await supabaseAdmin.from("activity_feed").insert({
    user_id: user.id,
    user_name: profile.name || "Member",
    emoji_avatar: profile.avatar_emoji ?? null,
    type: "streak",
    text: `used a streak repair to keep their ${profile.streak}-day streak alive! 🛡️🔥`,
    meta: { repair: true, streak: profile.streak },
  });

  return { success: true, streak: profile.streak };
}

export async function getRepairStatus(): Promise<{
  canRepair: boolean;
  alreadyUsedThisMonth: boolean;
  repairUsedAt: string | null;
}> {
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  );

  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return { canRepair: false, alreadyUsedThisMonth: false, repairUsedAt: null };

  const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(yesterdayDate);

  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("last_checkin_date, streak_repair_used_at")
    .eq("id", user.id)
    .single();

  if (!profile) return { canRepair: false, alreadyUsedThisMonth: false, repairUsedAt: null };

  const alreadyUsedThisMonth = profile.streak_repair_used_at
    ? profile.streak_repair_used_at.slice(0, 7) === todayStr.slice(0, 7)
    : false;

  const streakIntact =
    profile.last_checkin_date === todayStr ||
    profile.last_checkin_date === yesterdayStr;

  const canRepair = !alreadyUsedThisMonth && !streakIntact;

  return { canRepair, alreadyUsedThisMonth, repairUsedAt: profile.streak_repair_used_at ?? null };
}
