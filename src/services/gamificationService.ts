import AsyncStorage from '@react-native-async-storage/async-storage/lib/commonjs/index';

import {
  ACHIEVEMENT_DEFINITIONS,
  GAMIFICATION_EVENT_POINTS,
  MAX_GAMIFICATION_EVENTS,
  MAX_MOMENTUM_HISTORY,
  WEEKLY_MOMENTUM_GOAL,
} from '../constants/gamification';
import type { CompletedTripSession } from '../models/comparisonSession';
import { createDefaultGamificationProfile } from '../models/gamification';
import type {
  AchievementProgress,
  GamificationCelebration,
  GamificationEvent,
  GamificationLifetimeStats,
  GamificationProfile,
  GamificationSummary,
  WeeklyMomentumSnapshot,
  WeeklyGoal,
  WeeklyGoalType,
} from '../models/gamification';
import type { HouseholdFitVerdict } from '../models/householdFit';
import { getAuthSession } from '../store';
import {
  loadRemoteGamificationProfile,
  saveRemoteGamificationProfile,
} from './cloudUserDataService';
import {
  invalidateSessionResourceCache,
  loadSessionResource,
  primeSessionResourceCache,
  SESSION_CACHE_KEYS,
  type CachePolicy,
} from './sessionResourceCache';
import {
  getCanonicalIsoNow,
  getCanonicalNowMs,
} from './timeIntegrityService';
import {
  buildReplacementCandidates,
  type HistoryReplacementCandidate,
} from '../utils/historyPersonalization';
import { buildRecentTimelineEntries } from '../utils/productTimeline';
import { loadScanHistory, type ScanHistoryEntry } from './scanHistoryStorage';

const GAMIFICATION_STORAGE_KEY_PREFIX = 'inqoura/gamification/v1';

type RecordScanGamificationInput = {
  historyEntries?: ScanHistoryEntry[];
  householdFitVerdict: HouseholdFitVerdict | null;
  newEntry: ScanHistoryEntry;
};

type RecordTripGamificationInput = {
  historyEntries?: ScanHistoryEntry[];
  trip: CompletedTripSession;
};

type RecordTrustGamificationInput = {
  barcode: string;
  confirmationCount: number;
  historyEntries?: ScanHistoryEntry[];
  trustConfirmationType: 'looks-different' | 'matches-pack';
};

function getScopeId(uid?: string | null) {
  return uid ? `user:${uid}` : 'guest';
}

function getStorageKey(scopeId: string) {
  return `${GAMIFICATION_STORAGE_KEY_PREFIX}/${scopeId}`;
}

function getActiveScopeId() {
  return getScopeId(getAuthSession().user?.id);
}

function toLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getStartOfWeek(currentTimeMs: number) {
  const date = new Date(currentTimeMs);
  const currentDay = date.getDay();
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
  date.setDate(date.getDate() + mondayOffset);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getWeekKey(currentTimeMs: number) {
  return toLocalDateKey(getStartOfWeek(currentTimeMs));
}

function isGamificationEvent(value: unknown): value is GamificationEvent {
  return Boolean(
    value &&
      typeof value === 'object' &&
      typeof (value as GamificationEvent).id === 'string' &&
      typeof (value as GamificationEvent).createdAt === 'string' &&
      typeof (value as GamificationEvent).weekKey === 'string' &&
      typeof (value as GamificationEvent).points === 'number' &&
      ((value as GamificationEvent).type === 'scan-session' ||
        (value as GamificationEvent).type === 'swap-win' ||
        (value as GamificationEvent).type === 'trip-complete' ||
        (value as GamificationEvent).type === 'trust-helper')
  );
}

function mergeEvents(...groups: GamificationEvent[][]) {
  const byId = new Map<string, GamificationEvent>();

  groups.flat().forEach((event) => {
    const currentEvent = byId.get(event.id);

    if (!currentEvent || currentEvent.createdAt < event.createdAt) {
      byId.set(event.id, event);
    }
  });

  return [...byId.values()]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, MAX_GAMIFICATION_EVENTS);
}

function buildMomentumHistory(events: GamificationEvent[]) {
  const totalsByWeek = new Map<string, number>();

  events.forEach((event) => {
    totalsByWeek.set(event.weekKey, (totalsByWeek.get(event.weekKey) ?? 0) + event.points);
  });

  return [...totalsByWeek.entries()]
    .map(([weekKey, points]) => ({
      goalCompleted: points >= WEEKLY_MOMENTUM_GOAL,
      points,
      weekKey,
    }))
    .sort((left, right) => right.weekKey.localeCompare(left.weekKey))
    .slice(0, MAX_MOMENTUM_HISTORY);
}

function buildCurrentWeekSnapshot(
  weekKey: string,
  momentumHistory: GamificationProfile['momentumHistory']
): WeeklyMomentumSnapshot {
  const points = momentumHistory.find((entry) => entry.weekKey === weekKey)?.points ?? 0;

  return {
    goal: WEEKLY_MOMENTUM_GOAL,
    isComplete: points >= WEEKLY_MOMENTUM_GOAL,
    points,
    progressRatio: Math.min(points / WEEKLY_MOMENTUM_GOAL, 1),
    remainingPoints: Math.max(WEEKLY_MOMENTUM_GOAL - points, 0),
    weekKey,
  };
}

function buildLifetimeStats(events: GamificationEvent[], totalScans: number): GamificationLifetimeStats {
  const pointsByWeek = events.reduce((weeks, event) => {
    if (event.points > 0) {
      weeks.set(event.weekKey, (weeks.get(event.weekKey) ?? 0) + event.points);
    }

    return weeks;
  }, new Map<string, number>());
  const completedWeeks = [...pointsByWeek.values()].filter(
    (points) => points >= WEEKLY_MOMENTUM_GOAL
  ).length;

  return {
    completedWeeks,
    householdSafeSwaps: events.filter(
      (event) => event.type === 'swap-win' && event.householdSafe
    ).length,
    swapWins: events.filter((event) => event.type === 'swap-win').length,
    totalScans,
    tripCompletions: events.filter((event) => event.type === 'trip-complete').length,
    trustHelpers: events.filter((event) => event.type === 'trust-helper').length,
  };
}

function buildAchievementProgress(
  lifetimeStats: GamificationLifetimeStats,
  latestHistoryScanAt: string | null,
  events: GamificationEvent[]
): AchievementProgress[] {
  return ACHIEVEMENT_DEFINITIONS.map((definition) => {
    const current = lifetimeStats[definition.metric];
    const matchingEvent = [...events]
      .filter((event) => {
        if (definition.metric === 'swapWins') {
          return event.type === 'swap-win';
        }

        if (definition.metric === 'tripCompletions') {
          return event.type === 'trip-complete';
        }

        if (definition.metric === 'trustHelpers') {
          return event.type === 'trust-helper';
        }

        return event.type === 'scan-session';
      })
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
      .at(-1);

    return {
      achievementId: definition.id,
      current: Math.min(current, definition.target),
      family: definition.family,
      isUnlocked: current >= definition.target,
      target: definition.target,
      title: definition.title,
      unlockedAt:
        current >= definition.target
          ? definition.metric === 'totalScans'
            ? latestHistoryScanAt
            : matchingEvent?.createdAt ?? latestHistoryScanAt
          : null,
    };
  });
}

function buildWeeklyGoal(
  weekKey: string,
  currentWeekEvents: GamificationEvent[],
  replacementCandidate: HistoryReplacementCandidate | null,
  historyEntries: ScanHistoryEntry[]
): WeeklyGoal {
  const currentWeekCounts = {
    'scan-session': currentWeekEvents.filter((event) => event.type === 'scan-session').length,
    'swap-win': currentWeekEvents.filter((event) => event.type === 'swap-win').length,
    'trip-complete': currentWeekEvents.filter((event) => event.type === 'trip-complete').length,
    'trust-helper': currentWeekEvents.filter((event) => event.type === 'trust-helper').length,
  };
  const hasRecentChanges = buildRecentTimelineEntries(historyEntries, 1).length > 0;
  const shouldUseTripGoal = historyEntries.length >= 6;
  const goalType: WeeklyGoalType = replacementCandidate
    ? 'swap-win'
    : shouldUseTripGoal
      ? 'trip-complete'
      : hasRecentChanges
        ? 'trust-helper'
        : 'scan-session';
  const goalCopyByType: Record<WeeklyGoalType, { body: string; title: string }> = {
    'scan-session': {
      body: 'Log three distinct product scans this week.',
      title: 'Build your scan habit',
    },
    'swap-win': {
      body: replacementCandidate
        ? `Replace ${replacementCandidate.name} with one stronger repeat buy.`
        : 'Replace one weaker repeat buy with a better option.',
      title: 'Land one better swap',
    },
    'trip-complete': {
      body: 'Complete one comparison trip with two or more products.',
      title: 'Finish one comparison trip',
    },
    'trust-helper': {
      body: 'Confirm one changed or uncertain product this week.',
      title: 'Help with one trust check',
    },
  };

  return {
    body: goalCopyByType[goalType].body,
    completedAt: currentWeekCounts[goalType] >= 1 ? currentWeekEvents[0]?.createdAt ?? null : null,
    id: `goal:${weekKey}:${goalType}`,
    progress: Math.min(currentWeekCounts[goalType], 1),
    target: 1,
    title: goalCopyByType[goalType].title,
    type: goalType,
    weekKey,
  };
}

function buildGamificationProfileFromEvents(
  events: GamificationEvent[],
  historyEntries: ScanHistoryEntry[],
  currentTimeMs: number,
  updatedAt: string | null
): GamificationProfile {
  const weekKey = getWeekKey(currentTimeMs);
  const momentumHistory = buildMomentumHistory(events);
  const currentWeek = buildCurrentWeekSnapshot(weekKey, momentumHistory);
  const totalScans = historyEntries.reduce((sum, entry) => sum + entry.scanCount, 0);
  const latestHistoryScanAt = historyEntries[0]?.scannedAt ?? null;
  const lifetimeStats = buildLifetimeStats(events, totalScans);
  const replacementCandidate = buildReplacementCandidates(historyEntries)[0] ?? null;
  const currentWeekEvents = events.filter((event) => event.weekKey === weekKey);
  const badgeProgress = buildAchievementProgress(lifetimeStats, latestHistoryScanAt, events);

  return {
    activeGoal: buildWeeklyGoal(
      weekKey,
      currentWeekEvents,
      replacementCandidate,
      historyEntries
    ),
    badgeProgress,
    currentWeek,
    events,
    lastProcessedEventIds: events.map((event) => event.id),
    lifetimeStats,
    momentumHistory,
    streakCount: lifetimeStats.completedWeeks,
    updatedAt,
    version: 1,
  };
}

async function loadLocalGamificationProfile(scopeId: string) {
  const rawValue = await AsyncStorage.getItem(getStorageKey(scopeId));

  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as Partial<GamificationProfile>;
    return {
      ...createDefaultGamificationProfile(getWeekKey(Date.now()), WEEKLY_MOMENTUM_GOAL),
      ...parsedValue,
      events: Array.isArray(parsedValue.events)
        ? parsedValue.events.filter(isGamificationEvent)
        : [],
    } satisfies GamificationProfile;
  } catch {
    return null;
  }
}

async function saveLocalGamificationProfile(scopeId: string, profile: GamificationProfile) {
  await AsyncStorage.setItem(getStorageKey(scopeId), JSON.stringify(profile));
}

function getPrimaryCategory(entry: ScanHistoryEntry) {
  return (entry.product.categories[0] ?? '').trim().toLowerCase();
}

function findSwapCandidate(
  historyEntries: ScanHistoryEntry[],
  newEntry: ScanHistoryEntry
) {
  const nextCategory = getPrimaryCategory(newEntry);

  return historyEntries
    .filter((entry) => entry.id !== newEntry.id && entry.barcode !== newEntry.barcode)
    .find((entry) => {
      const currentCategory = getPrimaryCategory(entry);
      const matchingCategory =
        currentCategory.length > 0 &&
        nextCategory.length > 0 &&
        currentCategory === nextCategory;

      return (
        matchingCategory &&
        entry.scanCount >= 2 &&
        typeof entry.score === 'number' &&
        typeof newEntry.score === 'number' &&
        entry.score < 60 &&
        newEntry.score >= entry.score + 15
      );
    });
}

async function persistGamificationProfile(
  profile: GamificationProfile,
  scopeId = getActiveScopeId()
) {
  await saveLocalGamificationProfile(scopeId, profile);
  primeSessionResourceCache(SESSION_CACHE_KEYS.gamificationProfile, profile, 45_000);

  const sessionUser = getAuthSession().user;

  if (sessionUser && scopeId === getScopeId(sessionUser.id)) {
    void saveRemoteGamificationProfile(sessionUser.id, profile);
  }

  return profile;
}

function buildEvent(
  type: WeeklyGoalType,
  weekKey: string,
  createdAt: string,
  id: string,
  householdSafe = false
): GamificationEvent {
  return {
    createdAt,
    householdSafe,
    id,
    points: GAMIFICATION_EVENT_POINTS[type],
    type,
    weekKey,
  };
}

function getRecentUnlockedAchievements(profile: GamificationProfile) {
  return [...profile.badgeProgress]
    .filter((badge) => badge.isUnlocked && badge.unlockedAt)
    .sort((left, right) => (right.unlockedAt ?? '').localeCompare(left.unlockedAt ?? ''))
    .slice(0, 4);
}

function buildCelebration(
  type: WeeklyGoalType,
  profile: GamificationProfile,
  unlockedBadgeCount: number
): GamificationCelebration | null {
  if (unlockedBadgeCount > 0) {
    const latestBadge = getRecentUnlockedAchievements(profile)[0];

    if (latestBadge) {
      return {
        body: `${latestBadge.title} is now part of your progress history.`,
        title: 'New badge unlocked',
        tone: 'good',
        type: 'badge-unlocked',
      };
    }
  }

  if (profile.activeGoal?.completedAt) {
    return {
      body: profile.activeGoal.body,
      title: 'Weekly goal complete',
      tone: 'good',
      type: 'goal-complete',
    };
  }

  const celebrationCopy: Record<WeeklyGoalType, { body: string; title: string }> = {
    'scan-session': {
      body: 'Three distinct scans are now supporting this week’s progress.',
      title: 'This week is moving',
    },
    'swap-win': {
      body: 'You found a stronger option for a weaker repeat buy.',
      title: 'Better swap logged',
    },
    'trip-complete': {
      body: 'That completed comparison trip moved your weekly momentum forward.',
      title: 'Trip progress saved',
    },
    'trust-helper': {
      body: 'That trust confirmation now counts toward this week’s progress.',
      title: 'Trust helper logged',
    },
  };

  return {
    body: celebrationCopy[type].body,
    title: celebrationCopy[type].title,
    tone: 'good',
    type,
  };
}

function getNextAchievement(profile: GamificationProfile) {
  return (
    profile.badgeProgress.find((achievement) => !achievement.isUnlocked) ?? null
  );
}

export function toGamificationSummary(profile: GamificationProfile): GamificationSummary {
  return {
    activeGoal: profile.activeGoal,
    lifetimeStats: profile.lifetimeStats,
    momentum: profile.currentWeek,
    nextAchievement: getNextAchievement(profile),
    recentUnlockedAchievements: getRecentUnlockedAchievements(profile),
    streakCount: profile.streakCount,
  };
}

export function buildGamificationNotifications(summary: GamificationSummary) {
  if (summary.momentum.isComplete) {
    return [
      {
        body: `You reached this week's momentum target with a ${summary.streakCount}-week streak in progress.`,
        id: `gamification:complete:${summary.momentum.weekKey}`,
        kind: 'weekly-goal' as const,
        title: 'Weekly momentum reached',
        tone: 'good' as const,
      },
    ];
  }

  if (!summary.activeGoal) {
    return [];
  }

  return [
    {
      body: `${summary.activeGoal.body} ${summary.momentum.remainingPoints} point${summary.momentum.remainingPoints === 1 ? '' : 's'} left this week.`,
      id: `gamification:goal:${summary.activeGoal.id}`,
      kind: 'weekly-goal' as const,
      title: summary.activeGoal.title,
      tone: 'neutral' as const,
    },
  ];
}

export async function loadCurrentGamificationProfile(
  {
    historyEntries,
    policy = 'cache-first',
  }: {
    historyEntries?: ScanHistoryEntry[];
    policy?: CachePolicy;
  } = {}
) {
  return loadSessionResource<GamificationProfile>(
    SESSION_CACHE_KEYS.gamificationProfile,
    async () => {
      const currentTimeMs = await getCanonicalNowMs();
      const currentHistoryEntries = historyEntries ?? (await loadScanHistory());
      const sessionUser = getAuthSession().user;
      const currentScopeId = getScopeId(sessionUser?.id);
      const [localProfile, guestProfile, remoteProfile] = await Promise.all([
        loadLocalGamificationProfile(currentScopeId),
        sessionUser ? loadLocalGamificationProfile(getScopeId()) : Promise.resolve(null),
        sessionUser ? loadRemoteGamificationProfile(sessionUser.id) : Promise.resolve(null),
      ]);
      const mergedEvents = sessionUser
        ? mergeEvents(
            localProfile?.events ?? [],
            guestProfile?.events ?? [],
            remoteProfile?.events ?? []
          )
        : mergeEvents(localProfile?.events ?? []);
      const nextProfile = buildGamificationProfileFromEvents(
        mergedEvents,
        currentHistoryEntries,
        currentTimeMs,
        await getCanonicalIsoNow()
      );

      await persistGamificationProfile(nextProfile, currentScopeId);

      if (sessionUser && guestProfile?.events.length) {
        await AsyncStorage.removeItem(getStorageKey(getScopeId()));
      }

      return nextProfile;
    },
    { policy, ttlMs: 45_000 }
  );
}

async function appendEventsAndPersist(
  nextEvents: GamificationEvent[],
  historyEntries: ScanHistoryEntry[]
) {
  const currentTimeMs = await getCanonicalNowMs();
  const nextProfile = buildGamificationProfileFromEvents(
    nextEvents,
    historyEntries,
    currentTimeMs,
    await getCanonicalIsoNow()
  );

  await persistGamificationProfile(nextProfile);
  return nextProfile;
}

export async function recordGamificationForSavedScan(
  input: RecordScanGamificationInput
) {
  const historyEntries = input.historyEntries ?? (await loadScanHistory());
  const currentProfile = await loadCurrentGamificationProfile({
    historyEntries,
    policy: 'stale-while-revalidate',
  });
  const currentTimeMs = await getCanonicalNowMs();
  const createdAt = await getCanonicalIsoNow();
  const weekKey = getWeekKey(currentTimeMs);
  const nextEvents = [...currentProfile.events];
  const distinctScansThisWeek = historyEntries.filter(
    (entry) => new Date(entry.scannedAt).getTime() >= getStartOfWeek(currentTimeMs).getTime()
  ).length;

  if (
    distinctScansThisWeek >= 3 &&
    !currentProfile.lastProcessedEventIds.includes(`scan-session:${weekKey}`)
  ) {
    nextEvents.unshift(
      buildEvent('scan-session', weekKey, createdAt, `scan-session:${weekKey}`)
    );
  }

  const swapCandidate = findSwapCandidate(historyEntries, input.newEntry);

  if (swapCandidate) {
    const eventId = `swap-win:${weekKey}:${swapCandidate.barcode}:${input.newEntry.barcode}`;

    if (!currentProfile.lastProcessedEventIds.includes(eventId)) {
      nextEvents.unshift(
        buildEvent(
          'swap-win',
          weekKey,
          createdAt,
          eventId,
          input.householdFitVerdict === 'works-for-everyone'
        )
      );
    }
  }

  const mergedEvents = mergeEvents(nextEvents);
  const unlockedBefore = currentProfile.badgeProgress.filter((badge) => badge.isUnlocked).length;
  const nextProfile = await appendEventsAndPersist(mergedEvents, historyEntries);
  const unlockedAfter = nextProfile.badgeProgress.filter((badge) => badge.isUnlocked).length;

  return {
    celebration:
      mergedEvents.length > currentProfile.events.length
        ? buildCelebration(
            swapCandidate ? 'swap-win' : 'scan-session',
            nextProfile,
            unlockedAfter - unlockedBefore
          )
        : null,
    profile: nextProfile,
    summary: toGamificationSummary(nextProfile),
  };
}

export async function recordGamificationTripCompletion(
  input: RecordTripGamificationInput
) {
  if (input.trip.entries.length < 2) {
    return {
      celebration: null,
      profile: await loadCurrentGamificationProfile({
        historyEntries: input.historyEntries,
      }),
    };
  }

  const historyEntries = input.historyEntries ?? (await loadScanHistory());
  const currentProfile = await loadCurrentGamificationProfile({
    historyEntries,
    policy: 'stale-while-revalidate',
  });
  const currentTimeMs = await getCanonicalNowMs();
  const createdAt = await getCanonicalIsoNow();
  const weekKey = getWeekKey(currentTimeMs);
  const eventId = `trip-complete:${input.trip.id}`;

  if (currentProfile.lastProcessedEventIds.includes(eventId)) {
    return {
      celebration: null,
      profile: currentProfile,
    };
  }

  const nextEvents = mergeEvents([
    buildEvent('trip-complete', weekKey, createdAt, eventId),
    ...currentProfile.events,
  ]);
  const unlockedBefore = currentProfile.badgeProgress.filter((badge) => badge.isUnlocked).length;
  const nextProfile = await appendEventsAndPersist(nextEvents, historyEntries);
  const unlockedAfter = nextProfile.badgeProgress.filter((badge) => badge.isUnlocked).length;

  return {
    celebration: buildCelebration(
      'trip-complete',
      nextProfile,
      unlockedAfter - unlockedBefore
    ),
    profile: nextProfile,
  };
}

export async function recordGamificationTrustHelper(
  input: RecordTrustGamificationInput
) {
  const historyEntries = input.historyEntries ?? (await loadScanHistory());
  const currentProfile = await loadCurrentGamificationProfile({
    historyEntries,
    policy: 'stale-while-revalidate',
  });
  const currentTimeMs = await getCanonicalNowMs();
  const createdAt = await getCanonicalIsoNow();
  const weekKey = getWeekKey(currentTimeMs);
  const eventId = `trust-helper:${input.barcode}:${input.trustConfirmationType}:${input.confirmationCount}`;

  if (currentProfile.lastProcessedEventIds.includes(eventId)) {
    return {
      celebration: null,
      profile: currentProfile,
    };
  }

  const nextEvents = mergeEvents([
    buildEvent('trust-helper', weekKey, createdAt, eventId),
    ...currentProfile.events,
  ]);
  const unlockedBefore = currentProfile.badgeProgress.filter((badge) => badge.isUnlocked).length;
  const nextProfile = await appendEventsAndPersist(nextEvents, historyEntries);
  const unlockedAfter = nextProfile.badgeProgress.filter((badge) => badge.isUnlocked).length;

  return {
    celebration: buildCelebration(
      'trust-helper',
      nextProfile,
      unlockedAfter - unlockedBefore
    ),
    profile: nextProfile,
  };
}

export async function clearGamificationForUser(uid?: string | null) {
  await AsyncStorage.removeItem(getStorageKey(getScopeId(uid)));
  invalidateSessionResourceCache(SESSION_CACHE_KEYS.gamificationProfile);
}
