import { StreakRules } from "./scoringTypes";

export function computeStreak(
  previousStreak: number,
  didCheckIn: boolean,
  rules?: StreakRules
): number {
  if (!rules?.enabled) return previousStreak;

  if (!didCheckIn) {
    return rules.resetOnMiss ? 0 : previousStreak;
  }

  const newStreak = previousStreak + 1;

  return newStreak;
}

export function computeStreakBonus(
  streak: number,
  rules?: StreakRules
): number {
  if (!rules?.enabled) return 0;

  if (rules.bonusEvery && rules.bonusPoints) {
    if (streak % rules.bonusEvery === 0) {
      return rules.bonusPoints;
    }
  }

  return 0;
}
