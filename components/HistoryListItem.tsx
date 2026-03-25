import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../constants/colors';
import type { ScanHistoryEntry } from '../services/scanHistoryStorage';

type HistoryListItemProps = {
  entry: ScanHistoryEntry;
  onPress: () => void;
};

function getRiskTone(riskLevel: ScanHistoryEntry['riskLevel']) {
  switch (riskLevel) {
    case 'high-risk':
      return {
        backgroundColor: colors.dangerMuted,
        color: colors.danger,
      };
    case 'caution':
      return {
        backgroundColor: colors.warningMuted,
        color: colors.warning,
      };
    default:
      return {
        backgroundColor: colors.successMuted,
        color: colors.success,
      };
  }
}

function formatTimestamp(value: string) {
  const date = new Date(value);

  return date.toLocaleString(undefined, {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  });
}

export default function HistoryListItem({
  entry,
  onPress,
}: HistoryListItemProps) {
  const riskTone = getRiskTone(entry.riskLevel);

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.headerRow}>
        <Text numberOfLines={2} style={styles.name}>
          {entry.name}
        </Text>
        <View
          style={[
            styles.scoreBadge,
            { backgroundColor: riskTone.backgroundColor },
          ]}
        >
          <Text style={[styles.scoreText, { color: riskTone.color }]}>
            {entry.score}/100
          </Text>
        </View>
      </View>

      <Text style={styles.metaText}>{entry.barcode}</Text>
      <Text style={styles.summaryText}>{entry.riskSummary}</Text>

      <View style={styles.footerRow}>
        <Text style={styles.timestampText}>{formatTimestamp(entry.scannedAt)}</Text>
        <Text style={[styles.gradeText, { color: riskTone.color }]}>
          Grade {entry.gradeLabel}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
    padding: 18,
  },
  footerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gradeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
  },
  metaText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  name: {
    color: colors.text,
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  scoreBadge: {
    borderRadius: 999,
    minWidth: 74,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  scoreText: {
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  summaryText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  timestampText: {
    color: colors.textMuted,
    fontSize: 13,
  },
});
