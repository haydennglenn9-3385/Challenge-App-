"use server";

import { createServerClient } from "@/lib/supabase/server";

export async function markOnboarded(avatarEmoji?: string): Promise<void> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const update: Record<string, string> = { onboarded_at: new Date().toISOString() };
  if (avatarEmoji) update.avatar_emoji = avatarEmoji;

  await supabase.from("users").update(update).eq("id", user.id);
}
