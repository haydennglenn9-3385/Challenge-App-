import { TeamScoringMethod } from "./scoringTypes";

export function computeTeamScore(
  scores: number[],
  method: TeamScoringMethod
): number {
  if (scores.length === 0) return 0;

  switch (method) {
    case "total":
      return scores.reduce((a, b) => a + b, 0);

    case "average":
      return scores.reduce((a, b) => a + b, 0) / scores.length;

    case "highest":
      return Math.max(...scores);

    case "median":
      const sorted = [...scores].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];

    default:
      return 0;
  }
}
