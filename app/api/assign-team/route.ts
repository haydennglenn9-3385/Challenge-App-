import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function getAuthedUser(req: Request) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  return user ?? null;
}

export async function POST(req: Request) {
  const user = await getAuthedUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { challengeId, userId, teamId } = await req.json();
  if (!challengeId || !userId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Verify the requester is the challenge creator or an admin
  const { data: challenge } = await supabaseAdmin
    .from("challenges")
    .select("creator_id")
    .eq("id", challengeId)
    .single();

  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const isCreator = challenge?.creator_id === user.id;
  const isAdmin   = profile?.role === "admin";

  if (!isCreator && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Update challenge_members
  const { data: updated, error } = await supabaseAdmin
    .from("challenge_members")
    .update({ team_id: teamId ?? null })
    .eq("challenge_id", challengeId)
    .eq("user_id", userId)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!updated || updated.length === 0) {
    return NextResponse.json(
      { error: "No member record found. Member may not be in this challenge." },
      { status: 404 }
    );
  }

  // Sync team_members table
  await supabaseAdmin.from("team_members").delete().eq("user_id", userId);
  if (teamId) {
    await supabaseAdmin.from("team_members").insert({ team_id: teamId, user_id: userId });
  }

  return NextResponse.json({ success: true });
}