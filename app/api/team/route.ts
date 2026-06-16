import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  );

  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const challengeId = searchParams.get("challengeId");

  if (!challengeId) {
    return NextResponse.json({ error: "Missing challengeId" }, { status: 400 });
  }

  // Verify the caller is a member of this challenge
  const { data: membership } = await supabaseAdmin
    .from("challenge_members")
    .select("id")
    .eq("challenge_id", challengeId)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: challenge, error: challengeError } = await supabaseAdmin
    .from("challenges")
    .select("team_id")
    .eq("id", challengeId)
    .single();

  if (challengeError) {
    return NextResponse.json({ error: challengeError.message }, { status: 500 });
  }

  const teamId = challenge.team_id;

  const { data: team, error: teamError } = await supabaseAdmin
    .from("teams")
    .select("*")
    .eq("id", teamId)
    .single();

  if (teamError) {
    return NextResponse.json({ error: teamError.message }, { status: 500 });
  }

  const { data: points, error: pointsError } = await supabaseAdmin
    .from("daily_logs")
    .select("points_earned")
    .eq("challenge_id", challengeId);

  if (pointsError) {
    return NextResponse.json({ error: pointsError.message }, { status: 500 });
  }

  const totalPoints = points.reduce((sum, p) => sum + p.points_earned, 0);

  return NextResponse.json({ team, totalPoints });
}
