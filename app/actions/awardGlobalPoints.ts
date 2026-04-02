"use server";

import { createServerClient } from "@supabase/ssr";
import { createClient }       from "@supabase/supabase-js";
import { cookies }            from "next/headers";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function getAuthUser() {
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  );
  const { data: { user } } = await supabaseAuth.auth.getUser();
  return user ?? null;
}

/** Award global points for setting a new personal record. */
export async function awardPRPoints(
  label: string,
  value: number,
  unit: string,
  formattedValue: string,
): Promise<{ success: boolean }> {
  const user = await getAuthUser();
  if (!user) return { success: false };

  const PR_POINTS = 10;

  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("total_points, global_points, name, avatar_emoji")
    .eq("id", user.id)
    .single();

  if (!profile) return { success: false };

  await supabaseAdmin.from("users").update({
    total_points:  (profile.total_points  ?? 0) + PR_POINTS,
    global_points: (profile.global_points ?? 0) + PR_POINTS,
  }).eq("id", user.id);

  await supabaseAdmin.from("activity_feed").insert({
    user_id:      user.id,
    user_name:    profile.name || "Member",
    emoji_avatar: profile.avatar_emoji ?? null,
    type:         "pr",
    text:         `set a new ${label} PR: ${formattedValue} ${unit}! 🏆`,
    meta: { label, value, unit, points: PR_POINTS },
  });

  return { success: true };
}

/** Award global points to the winner of a completed challenge. Idempotent. */
export async function awardChallengeWinPoints(
  challengeId: string,
  challengeName: string,
): Promise<{ success: boolean; alreadyAwarded?: boolean }> {
  const user = await getAuthUser();
  if (!user) return { success: false };

  const WINNER_POINTS = 50;

  // Idempotency check via activity_feed
  const { data: existing } = await supabaseAdmin
    .from("activity_feed")
    .select("id")
    .eq("user_id", user.id)
    .eq("type", "challenge_win")
    .contains("meta", { challenge_id: challengeId })
    .maybeSingle();

  if (existing) return { success: true, alreadyAwarded: true };

  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("total_points, global_points, name, avatar_emoji")
    .eq("id", user.id)
    .single();

  if (!profile) return { success: false };

  await supabaseAdmin.from("users").update({
    total_points:  (profile.total_points  ?? 0) + WINNER_POINTS,
    global_points: (profile.global_points ?? 0) + WINNER_POINTS,
  }).eq("id", user.id);

  await supabaseAdmin.from("activity_feed").insert({
    user_id:      user.id,
    user_name:    profile.name || "Member",
    emoji_avatar: profile.avatar_emoji ?? null,
    type:         "challenge_win",
    text:         `won the ${challengeName} challenge! 🏆 +${WINNER_POINTS} pts`,
    meta: { challenge_id: challengeId, challenge_name: challengeName, points: WINNER_POINTS },
  });

  return { success: true };
}
