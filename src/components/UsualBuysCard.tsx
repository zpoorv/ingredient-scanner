import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useI18n } from './AppLanguageProvider';
import { useAppTheme } from './AppThemeProvider';

export type UsualBuyCardItem = {
  id: string;
  isFavorite: boolean;
  name: string;
  score: number | null;
  summary: string;
  usageCount: number;
};

type UsualBuysCardProps = {
  hideHistoryAction?: boolean;
  items: UsualBuyCardItem[];
  onOpenHistory: () => void;
  onOpenSearch: () => void;
};

function getStatusLabel(score: number | null) {
  if (score === null) {
    return 'Needs another look';
  }

  if (score >= 80) {
    return 'Solid repeat';
  }

  if (score >= 60) {
    return 'Keep comparing';
  }

  return 'Worth replacing';
}

export default function UsualBuysCard({
  hideHistoryAction = false,
  items,
  onOpenHistory,
  onOpenSearch,
}: UsualBuysCardProps) {
  const { t } = useI18n();
  const { colors, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);

  if (items.length === 0) {
    return null;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{t('Usual Buys')}</Text>
      <Text style={styles.title}>{t('What you reach for most')}</Text>
      {items.map((item) => (
        <View key={item.id} style={styles.row}>
          <View style={styles.copy}>
            <Text style={styles.name}>
              {item.name}
              {item.isFavorite ? ` • ${t('Favorite')}` : ''}
            </Text>
            <Text style={styles.meta}>
              {t('{count} scans', { count: item.usageCount })} • {t(item.summary)}
            </Text>
          </View>
          <Text style={styles.status}>{t(getStatusLabel(item.score))}</Text>
        </View>
      ))}
      <View style={styles.actions}>
        <Pressable onPress={onOpenSearch} style={styles.actionChip}>
          <Text style={styles.actionText}>{t('Search usual buys')}</Text>
        </Pressable>
        {!hideHistoryAction ? (
          <Pressable onPress={onOpenHistory} style={styles.actionChip}>
            <Text style={styles.actionText}>{t('Open history')}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const createStyles = (
  colors: ReturnType<typeof useAppTheme>['colors'],
  typography: ReturnType<typeof useAppTheme>['typography']
) =>
  StyleSheet.create({
    actionChip: {
      alignItems: 'center',
      backgroundColor: colors.primaryMuted,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    actionText: {
      color: colors.primary,
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '800',
    },
    actions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 24,
      borderWidth: 1,
      gap: 14,
      padding: 20,
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
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    meta: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 13,
      lineHeight: 19,
    },
    name: {
      color: colors.text,
      fontFamily: typography.headingFontFamily,
      fontSize: 15,
      fontWeight: '700',
    },
    row: {
      flexDirection: 'row',
      gap: 12,
      justifyContent: 'space-between',
    },
    status: {
      color: colors.primary,
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '800',
      maxWidth: 90,
      textAlign: 'right',
    },
    title: {
      color: colors.text,
      fontFamily: typography.headingFontFamily,
      fontSize: 22,
      fontWeight: '800',
      lineHeight: 27,
    },
  });
