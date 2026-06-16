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
 * Atomically toggle a user's emoji reaction on an activity_feed item.
 * Calls the `toggle_reaction` PostgreSQL function (see supabase/migrations/20260615_toggle_reaction.sql).
 * Returns the new reactions object, or null on failure.
 */
export async function toggleReaction(
  feedId: string,
  emoji:  string
): Promise<Record<string, string[]> | null> {
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  );

  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabaseAdmin.rpc("toggle_reaction", {
    p_feed_id: feedId,
    p_emoji:   emoji,
    p_user_id: user.id,
  });

  if (error) {
    console.error("toggleReaction RPC failed:", error.message);
    return null;
  }

  return data as Record<string, string[]>;
}
