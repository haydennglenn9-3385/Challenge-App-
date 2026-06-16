"use server";

import { createServerClient } from "@supabase/ssr";
import { createClient }       from "@supabase/supabase-js";
import { cookies }            from "next/headers";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function updateMemberStats(
  memberId: string,
  points: number,
  streak: number
): Promise<{ success: boolean; error?: string }> {
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  );

  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data: profile } = await supabaseAdmin
    .from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { success: false, error: "Forbidden" };

  const { error } = await supabaseAdmin
    .from("users")
    .update({ total_points: points, streak })
    .eq("id", memberId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
