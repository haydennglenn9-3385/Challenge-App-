export type ScoringTask = {
  id: string;
  label: string;
  points: number;
  required?: boolean;
};

export type StreakRules = {
  enabled: boolean;
  resetOnMiss: boolean;
  bonusEvery?: number;
  bonusPoints?: number;
};

export type TeamScoringMethod =
  | "total"
  | "average"
  | "highest"
  | "median";

export type ScoringRules = {
  type: "points" | "boolean" | "multi-task" | "streak";
  tasks?: ScoringTask[];
  streakRules?: StreakRules;
  teamScoring?: {
    method: TeamScoringMethod;
  };
};

export type CheckInPayload = {
  completedTasks: string[];
  timestamp: string;
};

export type CheckInResult = {
  pointsEarned: number;
  streak: number;
  teamScoreContribution: number;
};
