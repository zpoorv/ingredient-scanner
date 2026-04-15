import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useI18n } from './AppLanguageProvider';
import type { AchievementProgress } from '../models/gamification';
import { useAppTheme } from './AppThemeProvider';

type AchievementBadgeStripProps = {
  badges: AchievementProgress[];
};

export default function AchievementBadgeStrip({
  badges,
}: AchievementBadgeStripProps) {
  const { t } = useI18n();
  const { colors, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const visibleBadges = badges
    .filter((badge) => badge.isUnlocked)
    .sort((left, right) => (right.unlockedAt ?? '').localeCompare(left.unlockedAt ?? ''))
    .slice(0, 6);

  if (visibleBadges.length === 0) {
    return null;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{t('Badges')}</Text>
      <Text style={styles.title}>{t('Quiet wins worth keeping')}</Text>
      <ScrollView
        contentContainerStyle={styles.row}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {visibleBadges.map((badge) => (
          <View key={badge.achievementId} style={styles.badge}>
            <Text style={styles.badgeTitle}>{t(badge.title)}</Text>
            <Text style={styles.badgeMeta}>
              {badge.target}/{badge.target}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const createStyles = (
  colors: ReturnType<typeof useAppTheme>['colors'],
  typography: ReturnType<typeof useAppTheme>['typography']
) =>
  StyleSheet.create({
    badge: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: 18,
      borderWidth: 1,
      gap: 6,
      minWidth: 132,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    badgeMeta: {
      color: colors.primary,
      fontFamily: typography.accentFontFamily,
      fontSize: 11,
      fontWeight: '800',
    },
    badgeTitle: {
      color: colors.text,
      fontFamily: typography.bodyFontFamily,
      fontSize: 13,
      fontWeight: '700',
      lineHeight: 18,
    },
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 24,
      borderWidth: 1,
      gap: 12,
      paddingVertical: 18,
    },
    label: {
      color: colors.primary,
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '800',
      paddingHorizontal: 18,
      textTransform: 'uppercase',
    },
    row: {
      gap: 10,
      paddingHorizontal: 18,
    },
    title: {
      color: colors.text,
      fontFamily: typography.headingFontFamily,
      fontSize: 18,
      fontWeight: '800',
      lineHeight: 23,
      paddingHorizontal: 18,
    },
  });
