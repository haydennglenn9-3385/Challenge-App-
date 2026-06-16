"use server";

import { createServerClient } from "@supabase/ssr";
import { createClient }       from "@supabase/supabase-js";
import { cookies }            from "next/headers";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function validateAndJoinChallenge(
  challengeId: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  );

  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data: challenge, error: fetchError } = await supabaseAdmin
    .from("challenges")
    .select("join_code, is_public")
    .eq("id", challengeId)
    .single();

  if (fetchError || !challenge) return { success: false, error: "Challenge not found" };

  if (code.trim().toUpperCase() !== (challenge.join_code ?? "").toUpperCase()) {
    return { success: false, error: "Invalid join code. Check the code and try again." };
  }

  const { error: insertError } = await supabaseAdmin
    .from("challenge_members")
    .insert({ challenge_id: challengeId, user_id: user.id });

  if (insertError) {
    if (insertError.code === "23505") return { success: true }; // already a member
    return { success: false, error: "Something went wrong. Please try again." };
  }

  return { success: true };
}
