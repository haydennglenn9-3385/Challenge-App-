import {
  ScoringRules,
  CheckInPayload,
  CheckInResult,
} from "./scoringTypes";
import { applyScoringRules } from "./applyScoringRules";
import { computeStreak, computeStreakBonus } from "./computeStreak";

export function evaluateCheckIn(
  rules: ScoringRules,
  payload: CheckInPayload,
  previousStreak: number
): CheckInResult {
  const didCheckIn = payload.completedTasks.length > 0;

  // 1. Base points from tasks
  const basePoints = applyScoringRules(rules, payload);

  // 2. Streak calculation
  const streak = computeStreak(previousStreak, didCheckIn, rules.streakRules);

  // 3. Streak bonus
  const streakBonus = computeStreakBonus(streak, rules.streakRules);

  // 4. Total points
  const totalPoints = basePoints + streakBonus;

  return {
    pointsEarned: totalPoints,
    streak,
    teamScoreContribution: totalPoints, // can be customized later
  };
}
