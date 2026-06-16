"use server";

import { createServerClient } from "@supabase/ssr";
import { createClient }       from "@supabase/supabase-js";
import { cookies }            from "next/headers";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/**
 * Post a community message to the activity feed.
 * Resolves the display name from the DB so the client can't spoof it.
 */
export async function postActivity(
  text: string
): Promise<{ success: boolean; error?: string }> {
  const trimmed = text.trim();
  if (!trimmed) return { success: false, error: "Text is required" };

  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  );

  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("name, avatar_emoji")
    .eq("id", user.id)
    .single();

  const { error } = await supabaseAdmin.from("activity_feed").insert({
    user_id:      user.id,
    user_name:    profile?.name || "Member",
    emoji_avatar: profile?.avatar_emoji ?? null,
    type:         "message",
    text:         trimmed,
    meta:         {},
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}
