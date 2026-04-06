export type GamificationEventType =
  | 'scan-session'
  | 'swap-win'
  | 'trip-complete'
  | 'trust-helper';

export type AchievementFamily =
  | 'better-swaps'
  | 'consistency'
  | 'trip-mode'
  | 'trust-helper'
  | 'household-fit'
  | 'scan-starter';

export type AchievementMetric =
  | 'completedWeeks'
  | 'householdSafeSwaps'
  | 'swapWins'
  | 'totalScans'
  | 'tripCompletions'
  | 'trustHelpers';

export type AchievementDefinition = {
  description: string;
  family: AchievementFamily;
  id: string;
  metric: AchievementMetric;
  target: number;
  title: string;
};

export type AchievementProgress = {
  achievementId: string;
  current: number;
  family: AchievementFamily;
  isUnlocked: boolean;
  target: number;
  title: string;
  unlockedAt: string | null;
};

export type WeeklyGoalType =
  | 'scan-session'
  | 'swap-win'
  | 'trip-complete'
  | 'trust-helper';

export type WeeklyGoal = {
  body: string;
  completedAt: string | null;
  id: string;
  progress: number;
  target: number;
  title: string;
  type: WeeklyGoalType;
  weekKey: string;
};

export type WeeklyMomentumSnapshot = {
  goal: number;
  isComplete: boolean;
  points: number;
  progressRatio: number;
  remainingPoints: number;
  weekKey: string;
};

export type GamificationEvent = {
  createdAt: string;
  householdSafe: boolean;
  id: string;
  points: number;
  type: GamificationEventType;
  weekKey: string;
};

export type MomentumHistoryEntry = {
  goalCompleted: boolean;
  points: number;
  weekKey: string;
};

export type GamificationLifetimeStats = {
  completedWeeks: number;
  householdSafeSwaps: number;
  swapWins: number;
  totalScans: number;
  tripCompletions: number;
  trustHelpers: number;
};

export type GamificationSummary = {
  activeGoal: WeeklyGoal | null;
  lifetimeStats: GamificationLifetimeStats;
  momentum: WeeklyMomentumSnapshot;
  nextAchievement: AchievementProgress | null;
  recentUnlockedAchievements: AchievementProgress[];
  streakCount: number;
};

export type GamificationProfile = {
  activeGoal: WeeklyGoal | null;
  badgeProgress: AchievementProgress[];
  currentWeek: WeeklyMomentumSnapshot;
  events: GamificationEvent[];
  lastProcessedEventIds: string[];
  lifetimeStats: GamificationLifetimeStats;
  momentumHistory: MomentumHistoryEntry[];
  streakCount: number;
  updatedAt: string | null;
  version: 1;
};

export type GamificationCelebration =
  | {
      body: string;
      title: string;
      tone: 'good' | 'neutral';
      type: 'badge-unlocked';
    }
  | {
      body: string;
      title: string;
      tone: 'good' | 'neutral';
      type: 'goal-complete' | 'scan-session' | 'swap-win' | 'trip-complete' | 'trust-helper';
    };

export function createDefaultWeeklyMomentumSnapshot(
  weekKey: string,
  goal: number
): WeeklyMomentumSnapshot {
  return {
    goal,
    isComplete: false,
    points: 0,
    progressRatio: 0,
    remainingPoints: goal,
    weekKey,
  };
}

export function createDefaultGamificationProfile(
  weekKey: string,
  goal: number
): GamificationProfile {
  return {
    activeGoal: null,
    badgeProgress: [],
    currentWeek: createDefaultWeeklyMomentumSnapshot(weekKey, goal),
    events: [],
    lastProcessedEventIds: [],
    lifetimeStats: {
      completedWeeks: 0,
      householdSafeSwaps: 0,
      swapWins: 0,
      totalScans: 0,
      tripCompletions: 0,
      trustHelpers: 0,
    },
    momentumHistory: [],
    streakCount: 0,
    updatedAt: null,
    version: 1,
  };
}
