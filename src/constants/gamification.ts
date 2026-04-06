import type { AchievementDefinition, WeeklyGoalType } from '../models/gamification';

export const WEEKLY_MOMENTUM_GOAL = 5;
export const MAX_GAMIFICATION_EVENTS = 240;
export const MAX_MOMENTUM_HISTORY = 12;

export const GAMIFICATION_EVENT_POINTS: Record<WeeklyGoalType, number> = {
  'scan-session': 1,
  'swap-win': 3,
  'trip-complete': 2,
  'trust-helper': 1,
};

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    description: 'Log your first product scan.',
    family: 'scan-starter',
    id: 'scan-starter-1',
    metric: 'totalScans',
    target: 1,
    title: 'First Scan',
  },
  {
    description: 'Build up ten scans.',
    family: 'scan-starter',
    id: 'scan-starter-10',
    metric: 'totalScans',
    target: 10,
    title: 'Scan Starter',
  },
  {
    description: 'Build up fifty scans.',
    family: 'scan-starter',
    id: 'scan-starter-50',
    metric: 'totalScans',
    target: 50,
    title: 'Scan Habit',
  },
  {
    description: 'Replace one weak repeat buy with a better swap.',
    family: 'better-swaps',
    id: 'swap-win-1',
    metric: 'swapWins',
    target: 1,
    title: 'Better Swap',
  },
  {
    description: 'Log three swap wins.',
    family: 'better-swaps',
    id: 'swap-win-3',
    metric: 'swapWins',
    target: 3,
    title: 'Swap Builder',
  },
  {
    description: 'Log ten swap wins.',
    family: 'better-swaps',
    id: 'swap-win-10',
    metric: 'swapWins',
    target: 10,
    title: 'Swap Leader',
  },
  {
    description: 'Hit your weekly momentum goal twice.',
    family: 'consistency',
    id: 'consistency-2',
    metric: 'completedWeeks',
    target: 2,
    title: 'Two-Week Streak',
  },
  {
    description: 'Hit your weekly momentum goal four times.',
    family: 'consistency',
    id: 'consistency-4',
    metric: 'completedWeeks',
    target: 4,
    title: 'Four-Week Streak',
  },
  {
    description: 'Hit your weekly momentum goal eight times.',
    family: 'consistency',
    id: 'consistency-8',
    metric: 'completedWeeks',
    target: 8,
    title: 'Eight-Week Streak',
  },
  {
    description: 'Complete your first comparison trip.',
    family: 'trip-mode',
    id: 'trip-mode-1',
    metric: 'tripCompletions',
    target: 1,
    title: 'Trip Starter',
  },
  {
    description: 'Complete five comparison trips.',
    family: 'trip-mode',
    id: 'trip-mode-5',
    metric: 'tripCompletions',
    target: 5,
    title: 'Trip Regular',
  },
  {
    description: 'Log your first trust confirmation.',
    family: 'trust-helper',
    id: 'trust-helper-1',
    metric: 'trustHelpers',
    target: 1,
    title: 'Trust Helper',
  },
  {
    description: 'Log five trust confirmations.',
    family: 'trust-helper',
    id: 'trust-helper-5',
    metric: 'trustHelpers',
    target: 5,
    title: 'Trust Regular',
  },
  {
    description: 'Make one swap that works for the household.',
    family: 'household-fit',
    id: 'household-fit-1',
    metric: 'householdSafeSwaps',
    target: 1,
    title: 'Household-Safe Swap',
  },
];
