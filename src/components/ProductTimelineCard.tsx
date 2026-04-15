import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useI18n } from './AppLanguageProvider';
import { useAppTheme } from './AppThemeProvider';
import type { ProductTimelineEntry } from '../models/productTimeline';

type ProductTimelineCardProps = {
  entries: ProductTimelineEntry[];
  title?: string;
};

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString(undefined, {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  });
}

export default function ProductTimelineCard({
  entries,
  title = 'Product timeline',
}: ProductTimelineCardProps) {
  const { t } = useI18n();
  const { colors, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);

  if (entries.length === 0) {
    return null;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{t(title)}</Text>
      {entries.map((entry) => (
        <View key={entry.id} style={styles.row}>
          <View style={styles.copy}>
            <Text style={styles.title}>{entry.productName}</Text>
            <Text style={styles.summary}>{t(entry.summary)}</Text>
          </View>
          <Text style={styles.time}>{formatTimestamp(entry.detectedAt)}</Text>
        </View>
      ))}
    </View>
  );
}

const createStyles = (
  colors: ReturnType<typeof useAppTheme>['colors'],
  typography: ReturnType<typeof useAppTheme>['typography']
) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 22,
      borderWidth: 1,
      gap: 12,
      padding: 18,
    },
    copy: {
      flex: 1,
      gap: 4,
    },
    label: {
      color: colors.primary,
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    row: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      gap: 12,
    },
    summary: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 13,
      lineHeight: 19,
    },
    time: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 12,
      minWidth: 72,
      textAlign: 'right',
    },
    title: {
      color: colors.text,
      fontFamily: typography.bodyFontFamily,
      fontSize: 14,
      fontWeight: '700',
    },
  });
