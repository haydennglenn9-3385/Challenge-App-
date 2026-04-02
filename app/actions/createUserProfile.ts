"use server";

import { createClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS so we can create the profile
// immediately after signup, even before email confirmation.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function createUserProfile({
  id,
  email,
  name,
}: {
  id: string;
  email: string;
  name: string;
}): Promise<{ success: boolean; error?: string }> {
  // Verify the user actually exists in auth.users before touching public data
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(id);
  if (authError || !authUser.user) {
    return { success: false, error: "User not found." };
  }

  const { error } = await supabaseAdmin.from("users").upsert(
    {
      id,
      email,
      name,
      total_points:  0,
      streak:        0,
      global_points: 0,
    },
    { onConflict: "id" }
  );

  if (error) {
    console.error("createUserProfile failed:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
