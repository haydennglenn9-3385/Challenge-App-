import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";
import { evaluateCheckIn } from "@/lib/scoring/evaluateCheckIn";
import { computeTeamScore } from "@/lib/scoring/computeTeamScore";

export async function POST(req: Request) {
  try {
    const { userId, challengeId, completedTasks } = await req.json();

    if (!userId || !challengeId) {
      return NextResponse.json(
        { error: "Missing userId or challengeId" },
        { status: 400 }
      );
    }

    // 1. Fetch challenge + scoring rules
    const { data: challenge, error: challengeError } = await supabase
      .from("Challenges")
      .select("*")
      .eq("id", challengeId)
      .single();

    if (challengeError || !challenge) {
      return NextResponse.json(
        { error: "Challenge not found" },
        { status: 404 }
      );
    }

    const scoringRules = challenge.scoringRules;

    // 2. Fetch previous streak + teamId
    const { data: memberData, error: memberError } = await supabase
      .from("ChallengeMembers")
      .select("streak, teamId")
      .eq("challengeId", challengeId)
      .eq("userId", userId)
      .single();

    if (memberError || !memberData) {
      return NextResponse.json(
        { error: "Challenge membership not found" },
        { status: 404 }
      );
    }

    const previousStreak = memberData.streak ?? 0;
    const teamId = memberData.teamId ?? null;

    // 3. Build payload for scoring engine
    const payload = {
      completedTasks,
      timestamp: new Date().toISOString(),
    };

    // 4. Run scoring engine
    const result = evaluateCheckIn(scoringRules, payload, previousStreak);

    // 5. Save check-in
    await supabase.from("CheckIns").insert({
      challengeId,
      userId,
      date: new Date().toISOString(),
      score: result.pointsEarned,
      metadata: { completedTasks },
    });

    // 6. Update streak
    await supabase
      .from("ChallengeMembers")
      .update({ streak: result.streak })
      .eq("challengeId", challengeId)
      .eq("userId", userId);

    // 7. Update team score (if applicable)
    if (teamId && challenge.teamScoring) {
      // Fetch all members of the same team
      const { data: teamMembers } = await supabase
        .from("ChallengeMembers")
        .select("userId")
        .eq("challengeId", challengeId)
        .eq("teamId", teamId);

      const memberIds = teamMembers.map((m) => m.userId);

      // Fetch all check-ins for those members
      const { data: memberCheckIns } = await supabase
        .from("CheckIns")
        .select("score")
        .in("userId", memberIds)
        .eq("challengeId", challengeId);

      const scores = memberCheckIns.map((c) => c.score);

      const teamScore = computeTeamScore(
        scores,
        challenge.teamScoring.method
      );

      await supabase
        .from("Teams")
        .update({ score: teamScore })
        .eq("id", teamId);
    }

    // 8. Return updated leaderboard
    const { data: leaderboard } = await supabase.rpc(
      "get_leaderboard_for_challenge",
      { challenge_id: challengeId }
    );

    return NextResponse.json({
      success: true,
      pointsEarned: result.pointsEarned,
      streak: result.streak,
      leaderboard,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
