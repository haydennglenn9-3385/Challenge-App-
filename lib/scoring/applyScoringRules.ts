import { ScoringRules, CheckInPayload } from "./scoringTypes";

export function applyScoringRules(
  rules: ScoringRules,
  payload: CheckInPayload
): number {
  if (!rules.tasks) return 0;

  let total = 0;

  for (const task of rules.tasks) {
    const completed = payload.completedTasks.includes(task.id);

    if (task.required && !completed) {
      return 0; // required task missed → zero points
    }

    if (completed) {
      total += task.points;
    }
  }

  return total;
}
