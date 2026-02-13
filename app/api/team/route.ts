import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const challengeId = searchParams.get("challengeId");

  if (!challengeId) {
    return NextResponse.json({ error: "Missing challengeId" }, { status: 400 });
  }

  // Get challenge → team_id
  const { data: challenge, error: challengeError } = await supabase
    .from("challenges")
    .select("team_id")
    .eq("id", challengeId)
    .single();

  if (challengeError) {
    return NextResponse.json({ error: challengeError.message }, { status: 500 });
  }

  const teamId = challenge.team_id;

  // Get team info
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("*")
    .eq("id", teamId)
    .single();

  if (teamError) {
    return NextResponse.json({ error: teamError.message }, { status: 500 });
  }

  // Get team points
  const { data: points, error: pointsError } = await supabase
    .from("daily_logs")
    .select("points_earned")
    .eq("challenge_id", challengeId);

  if (pointsError) {
    return NextResponse.json({ error: pointsError.message }, { status: 500 });
  }

  const totalPoints = points.reduce((sum, p) => sum + p.points_earned, 0);

  return NextResponse.json({
    team,
    totalPoints
  });
}
