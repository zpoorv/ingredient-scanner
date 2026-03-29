import type { ScanHistoryEntry } from '../services/scanHistoryStorage';

export type HistoryInsight = {
  body: string;
  id: string;
  tone: 'good' | 'neutral' | 'warning';
  title: string;
};

function getStartOfWeek(date = new Date()) {
  const nextDate = new Date(date);
  const currentDay = nextDate.getDay();
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
  nextDate.setDate(nextDate.getDate() + mondayOffset);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

export function buildHistoryInsights(historyEntries: ScanHistoryEntry[]) {
  if (historyEntries.length === 0) {
    return [] as HistoryInsight[];
  }

  const weekStart = getStartOfWeek();
  const weeklyEntries = historyEntries.filter(
    (entry) => new Date(entry.scannedAt).getTime() >= weekStart.getTime()
  );
  const harmfulCount = weeklyEntries.filter(
    (entry) => entry.riskLevel === 'high-risk'
  ).length;
  const cautionCount = weeklyEntries.filter(
    (entry) => entry.riskLevel === 'caution'
  ).length;
  const strongPickCount = weeklyEntries.filter(
    (entry) => typeof entry.score === 'number' && entry.score >= 80
  ).length;
  const lowScoreCount = weeklyEntries.filter(
    (entry) => typeof entry.score === 'number' && entry.score < 50
  ).length;

  const insights: HistoryInsight[] = [];

  if (harmfulCount > 0) {
    insights.push({
      body:
        harmfulCount === 1
          ? 'One of your scans showed multiple stronger warning signals.'
          : `${harmfulCount} scans this week landed in the stronger warning zone.`,
      id: 'harmful-week',
      title: `You scanned ${harmfulCount} harmful product${harmfulCount > 1 ? 's' : ''} this week`,
      tone: 'warning',
    });
  }

  if (strongPickCount >= 3) {
    insights.push({
      body: 'That is a solid streak of higher-scoring products in your recent scans.',
      id: 'strong-picks',
      title: `${strongPickCount} strong picks showed up this week`,
      tone: 'good',
    });
  }

  if (cautionCount > 0) {
    insights.push({
      body: 'A few products had moderate flags, so compare labels before repurchasing them.',
      id: 'caution-week',
      title: `${cautionCount} scans carried caution-level ingredient flags`,
      tone: 'neutral',
    });
  }

  if (lowScoreCount >= 2) {
    insights.push({
      body: 'Try checking simpler ingredient lists or lower-sodium options next time.',
      id: 'low-score-week',
      title: `${lowScoreCount} recent scans were not ideal for frequent use`,
      tone: 'warning',
    });
  }

  if (insights.length === 0) {
    insights.push({
      body: 'Your recent scan history looks fairly balanced so far.',
      id: 'balanced-week',
      title: 'No strong history pattern yet',
      tone: 'good',
    });
  }

  return insights.slice(0, 3);
}
