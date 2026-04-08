"use server";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function addChallengeMember({
  challengeId,
  userId,
  teamId,
}: {
  challengeId: string;
  userId: string;
  teamId?: string | null;
}): Promise<{ error?: string }> {
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  );

  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Check caller is admin or challenge creator
  const [{ data: profile }, { data: challenge }] = await Promise.all([
    supabaseAdmin.from("users").select("role").eq("id", user.id).single(),
    supabaseAdmin.from("challenges").select("creator_id").eq("id", challengeId).single(),
  ]);

  const isAdmin = profile?.role === "admin";
  const isCreator = challenge?.creator_id === user.id;

  if (!isAdmin && !isCreator) {
    return { error: "You don't have permission to add members to this challenge." };
  }

  const { error: memberError } = await supabaseAdmin
    .from("challenge_members")
    .insert({ challenge_id: challengeId, user_id: userId, team_id: teamId ?? null });

  if (memberError) return { error: memberError.message };

  if (teamId) {
    const { error: teamError } = await supabaseAdmin
      .from("team_members")
      .insert({ team_id: teamId, user_id: userId });

    if (teamError) return { error: teamError.message };
  }

  return {};
}
