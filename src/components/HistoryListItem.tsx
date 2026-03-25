import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../constants/colors';
import type { ScanHistoryEntry } from '../services/scanHistoryStorage';
import { getDietProfileDefinition } from '../utils/dietProfiles';
import { getGradeTone } from '../utils/gradeTone';
import { formatProductName } from '../utils/productDisplay';

type HistoryListItemProps = {
  entry: ScanHistoryEntry;
  isSelected?: boolean;
  onDelete: () => void;
  onLongPress?: () => void;
  onPress: () => void;
  selectionMode?: boolean;
};

function formatTimestamp(value: string) {
  const date = new Date(value);

  return date.toLocaleString(undefined, {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  });
}

function HistoryListItem({
  entry,
  isSelected = false,
  onDelete,
  onLongPress,
  onPress,
  selectionMode = false,
}: HistoryListItemProps) {
  const gradeTone = getGradeTone(entry.gradeLabel);
  const profile = getDietProfileDefinition(entry.profileId);

  return (
    <Pressable
      onLongPress={onLongPress}
      onPress={onPress}
      style={[
        styles.card,
        isSelected && {
          borderColor: colors.primary,
          backgroundColor: colors.primaryMuted,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <Text numberOfLines={2} style={styles.name}>
          {formatProductName(entry.name)}
        </Text>
        <View
          style={[
            styles.scoreBadge,
            { backgroundColor: gradeTone.backgroundColor },
          ]}
        >
          <Text style={[styles.scoreText, { color: gradeTone.color }]}>
            {entry.score === null ? 'N/A' : `${entry.score}/100`}
          </Text>
        </View>
      </View>

      <Text style={styles.metaText}>
        {entry.barcode} • {profile.label}
      </Text>
      <Text style={styles.summaryText}>{entry.riskSummary}</Text>

      <View style={styles.footerRow}>
        <Text style={styles.timestampText}>{formatTimestamp(entry.scannedAt)}</Text>
        <View style={styles.footerActions}>
          {selectionMode ? (
            <View
              style={[
                styles.selectionChip,
                isSelected && styles.selectionChipSelected,
              ]}
            >
              <Text
                style={[
                  styles.selectionChipText,
                  isSelected && styles.selectionChipTextSelected,
                ]}
              >
                {isSelected ? 'Selected' : 'Select'}
              </Text>
            </View>
          ) : (
            <Pressable onPress={onDelete} style={styles.deleteChip}>
              <Text style={styles.deleteChipText}>Delete</Text>
            </Pressable>
          )}
          <Text style={[styles.gradeText, { color: gradeTone.color }]}>
            {entry.gradeLabel ? `Grade ${entry.gradeLabel}` : 'Not Scored'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default memo(HistoryListItem);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
    padding: 18,
  },
  deleteChip: {
    backgroundColor: colors.dangerMuted,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  deleteChipText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '700',
  },
  footerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
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
  selectionChip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  selectionChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  selectionChipText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  selectionChipTextSelected: {
    color: colors.surface,
  },
  timestampText: {
    color: colors.textMuted,
    fontSize: 13,
  },
});
