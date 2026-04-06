import type { ScanHistoryEntry } from '../services/scanHistoryStorage';
import type { GamificationSummary } from '../models/gamification';
import type { HistoryNotificationKind } from '../models/historyNotification';
import type { ProductTimelineEntry } from '../models/productTimeline';
import { buildRecentTimelineEntries } from './productTimeline';

export type HistoryTrend = 'improving' | 'steady' | 'watch';

export type HistoryInsight = {
  body: string;
  id: string;
  tone: 'good' | 'neutral' | 'warning';
  title: string;
};

export type HistoryRepeatBuyCandidate = {
  id: string;
  name: string;
  riskSummary: string;
  scanCount: number;
};

export type HistoryReplacementCandidate = {
  id: string;
  name: string;
  reason: string;
};

export type HistoryNotification = {
  body: string;
  id: string;
  kind: HistoryNotificationKind;
  title: string;
  tone: HistoryInsight['tone'];
};

export type HistoryOverview = {
  gamificationSummary: GamificationSummary | null;
  insights: HistoryInsight[];
  notifications: HistoryNotification[];
  recentChanges: ProductTimelineEntry[];
  replaceFirstCandidate: HistoryReplacementCandidate | null;
  repeatBuyCandidates: HistoryRepeatBuyCandidate[];
  replacementCandidates: HistoryReplacementCandidate[];
  weeklyTrend: HistoryTrend;
};

type BuildHistoryInsightsOptions = {
  currentTimeMs?: number;
  gamificationSummary?: GamificationSummary | null;
  includePremiumPatterns?: boolean;
};

function getStartOfWeek(date = new Date()) {
  const nextDate = new Date(date);
  const currentDay = nextDate.getDay();
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
  nextDate.setDate(nextDate.getDate() + mondayOffset);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

function buildBasicInsights(historyEntries: ScanHistoryEntry[]) {
  const insights: HistoryInsight[] = [];
  const highestScoreEntry = historyEntries.find(
    (entry) => typeof entry.score === 'number' && entry.score >= 80
  );
  const lowestScoreEntry = historyEntries.find(
    (entry) => typeof entry.score === 'number' && entry.score < 50
  );
  const repeatEntry = [...historyEntries]
    .filter((entry) => entry.scanCount >= 2)
    .sort((left, right) => right.scanCount - left.scanCount)[0];

  if (highestScoreEntry) {
    insights.push({
      body: 'This was one of your stronger recent picks for regular use.',
      id: 'best-recent-choice',
      title: `Best recent pick: ${highestScoreEntry.name}`,
      tone: 'good',
    });
  }

  if (lowestScoreEntry) {
    insights.push({
      body: 'This one may be better as an occasional buy rather than a repeat habit.',
      id: 'reconsider-choice',
      title: `Item to reconsider: ${lowestScoreEntry.name}`,
      tone: 'warning',
    });
  }

  if (repeatEntry) {
    insights.push({
      body: `You came back to this ${repeatEntry.scanCount} times, so it may be worth comparing alternatives once.`,
      id: 'repeat-choice',
      title: `Frequent repeat: ${repeatEntry.name}`,
      tone:
        typeof repeatEntry.score === 'number' && repeatEntry.score >= 70
          ? 'good'
          : 'neutral',
    });
  }

  if (insights.length === 0) {
    insights.push({
      body: 'Your saved scans are building up. The more you scan, the more useful this becomes.',
      id: 'build-history',
      title: 'No strong pattern yet',
      tone: 'neutral',
    });
  }

  return insights;
}

function buildPremiumPatternInsights(
  historyEntries: ScanHistoryEntry[],
  currentTimeMs = Date.now()
) {
  const weekStart = getStartOfWeek(new Date(currentTimeMs));
  const weeklyEntries = historyEntries.filter(
    (entry) => new Date(entry.scannedAt).getTime() >= weekStart.getTime()
  );
  const harmfulCount = weeklyEntries.filter(
    (entry) => entry.riskLevel === 'high-risk'
  ).length;
  const strongPickCount = weeklyEntries.filter(
    (entry) => typeof entry.score === 'number' && entry.score >= 80
  ).length;
  const lowScoreCount = weeklyEntries.filter(
    (entry) => typeof entry.score === 'number' && entry.score < 50
  ).length;
  const categoryCounts = new Map<string, { count: number; totalScore: number }>();

  const insights: HistoryInsight[] = [];

  weeklyEntries.forEach((entry) => {
    const category = entry.product.categories[0] || 'Unsorted';
    const currentCategory = categoryCounts.get(category) || {
      count: 0,
      totalScore: 0,
    };
    categoryCounts.set(category, {
      count: currentCategory.count + 1,
      totalScore: currentCategory.totalScore + (entry.score ?? 0),
    });
  });

  if (harmfulCount > 0) {
    insights.push({
      body:
        harmfulCount === 1
          ? 'One scan this week landed in the stronger warning zone.'
          : `${harmfulCount} scans this week landed in the stronger warning zone.`,
      id: 'harmful-week',
      title: `You scanned ${harmfulCount} higher-risk product${harmfulCount > 1 ? 's' : ''} this week`,
      tone: 'warning',
    });
  }

  if (strongPickCount >= 3) {
    insights.push({
      body: 'That is a solid streak of higher-scoring products in your recent scans.',
      id: 'strong-week',
      title: `${strongPickCount} strong picks showed up this week`,
      tone: 'good',
    });
  }

  if (lowScoreCount >= 2) {
    insights.push({
      body: 'Try simpler ingredient lists or lower-sodium options on your next trip.',
      id: 'low-score-week',
      title: `${lowScoreCount} recent scans were not ideal for frequent use`,
      tone: 'warning',
    });
  }

  const bestCategory = [...categoryCounts.entries()]
    .filter(([, value]) => value.count >= 2)
    .sort(
      (left, right) =>
        right[1].totalScore / right[1].count - left[1].totalScore / left[1].count
    )[0];

  if (bestCategory) {
    insights.push({
      body: `Your recent ${bestCategory[0].toLowerCase()} scans are scoring better than the rest.`,
      id: 'best-category-week',
      title: `${bestCategory[0]} is your best-performing recent category`,
      tone: 'good',
    });
  }

  return insights;
}

export function buildHistoryNotifications(
  historyEntries: ScanHistoryEntry[],
  cadence: 'smart' | 'weekly' = 'weekly',
  currentTimeMs = Date.now()
) {
  if (historyEntries.length === 0) {
    return [] as HistoryNotification[];
  }

  const weekStart = getStartOfWeek(new Date(currentTimeMs));
  const weeklyEntries = historyEntries.filter(
    (entry) => new Date(entry.scannedAt).getTime() >= weekStart.getTime()
  );
  const highRiskCount = weeklyEntries.filter(
    (entry) => entry.riskLevel === 'high-risk'
  ).length;
  const strongPickCount = weeklyEntries.filter(
    (entry) => typeof entry.score === 'number' && entry.score >= 80
  ).length;
  const repeatLowScoreEntry = historyEntries.find(
    (entry) => entry.scanCount >= 2 && typeof entry.score === 'number' && entry.score < 55
  );

  const cautionNotification: HistoryNotification | null =
    highRiskCount > 0
      ? {
          body:
            highRiskCount === 1
              ? 'One recent scan landed in the stronger warning zone.'
              : `${highRiskCount} recent scans landed in the stronger warning zone.`,
          id: 'weekly-warning',
          kind: 'caution-streak',
          title: 'Caution streak this week',
          tone: 'warning',
        }
      : null;
  const healthyNotification: HistoryNotification | null =
    strongPickCount >= 3
      ? {
          body: 'You have a healthy streak going in your recent scans.',
          id: 'weekly-strong',
          kind: 'healthy-streak',
          title: 'Stronger picks are building up',
          tone: 'good',
        }
      : null;
  const repeatLowScoreNotification: HistoryNotification | null =
    repeatLowScoreEntry
      ? {
          body: `${repeatLowScoreEntry.name} keeps showing up as a lower-scoring repeat buy.`,
          id: 'repeat-low-score',
          kind: 'repeat-low-score',
          title: 'One repeat buy may be worth replacing',
          tone: 'warning',
        }
      : null;

  const smartNotifications = [
    repeatLowScoreNotification,
    cautionNotification,
    healthyNotification,
  ].filter((notification): notification is HistoryNotification => notification !== null);

  if (cadence === 'smart') {
    return smartNotifications.slice(0, 1);
  }

  return [
    cautionNotification,
    repeatLowScoreNotification,
    healthyNotification,
  ]
    .filter((notification): notification is HistoryNotification => notification !== null)
    .slice(0, 2);
}

export function buildHistoryInsights(
  historyEntries: ScanHistoryEntry[],
  options: BuildHistoryInsightsOptions = {}
) {
  if (historyEntries.length === 0) {
    return [] as HistoryInsight[];
  }

  const basicInsights = buildBasicInsights(historyEntries);

  if (!options.includePremiumPatterns) {
    return basicInsights.slice(0, 3);
  }

  return [...basicInsights, ...buildPremiumPatternInsights(historyEntries, options.currentTimeMs)].slice(
    0,
    4
  );
}

export function buildRepeatBuyCandidates(historyEntries: ScanHistoryEntry[]) {
  return [...historyEntries]
    .filter((entry) => entry.scanCount >= 2)
    .sort((left, right) => right.scanCount - left.scanCount)
    .slice(0, 3)
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      riskSummary: entry.riskSummary,
      scanCount: entry.scanCount,
    }));
}

export function buildReplacementCandidates(historyEntries: ScanHistoryEntry[]) {
  return [...historyEntries]
    .filter((entry) => typeof entry.score === 'number' && entry.score < 60)
    .sort((left, right) => (left.score ?? 0) - (right.score ?? 0))
    .slice(0, 3)
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      reason: entry.riskSummary,
    }));
}

export function buildWeeklyTrend(
  historyEntries: ScanHistoryEntry[],
  currentTimeMs = Date.now()
): HistoryTrend {
  const weekStart = getStartOfWeek(new Date(currentTimeMs));
  const weeklyEntries = historyEntries.filter(
    (entry) => new Date(entry.scannedAt).getTime() >= weekStart.getTime()
  );
  const weeklyAverage =
    weeklyEntries
      .filter((entry) => typeof entry.score === 'number')
      .reduce((sum, entry) => sum + (entry.score ?? 0), 0) /
    Math.max(
      weeklyEntries.filter((entry) => typeof entry.score === 'number').length,
      1
    );

  if (weeklyAverage >= 75) {
    return 'improving';
  }

  if (weeklyAverage >= 55) {
    return 'steady';
  }

  return 'watch';
}

export function buildHistoryOverview(
  historyEntries: ScanHistoryEntry[],
  options: BuildHistoryInsightsOptions = {}
): HistoryOverview {
  const replacementCandidates = buildReplacementCandidates(historyEntries);

  return {
    gamificationSummary: options.gamificationSummary ?? null,
    insights: buildHistoryInsights(historyEntries, options),
    notifications: buildHistoryNotifications(
      historyEntries,
      'weekly',
      options.currentTimeMs
    ),
    recentChanges: buildRecentTimelineEntries(historyEntries),
    replaceFirstCandidate: replacementCandidates[0] ?? null,
    repeatBuyCandidates: buildRepeatBuyCandidates(historyEntries),
    replacementCandidates,
    weeklyTrend: buildWeeklyTrend(historyEntries, options.currentTimeMs),
  };
}
