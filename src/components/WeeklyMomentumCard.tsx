import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useI18n } from './AppLanguageProvider';
import type { GamificationSummary } from '../models/gamification';
import { useAppTheme } from './AppThemeProvider';

type WeeklyMomentumCardProps = {
  premium?: boolean;
  summary: GamificationSummary;
};

function formatBadgeProgress(summary: GamificationSummary) {
  if (!summary.nextAchievement) {
    return 'All current badges unlocked';
  }

  return `${summary.nextAchievement.current}/${summary.nextAchievement.target}`;
}

export default function WeeklyMomentumCard({
  premium = false,
  summary,
}: WeeklyMomentumCardProps) {
  const { t } = useI18n();
  const { colors, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const progressWidth = `${Math.max(summary.momentum.progressRatio, 0.06) * 100}%` as const;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.copyBlock}>
          <Text style={styles.label}>{t('This Week')}</Text>
          <Text style={styles.title}>
            {t('{points}/{goal} momentum', {
              goal: summary.momentum.goal,
              points: summary.momentum.points,
            })}
          </Text>
          <Text style={styles.body}>
            {t(
              summary.activeGoal?.body ??
                'Keep scanning and stronger choices will start shaping your week.'
            )}
          </Text>
        </View>
        <View style={styles.streakPill}>
          <Text style={styles.streakValue}>{summary.streakCount}</Text>
          <Text style={styles.streakLabel}>{t('week streak')}</Text>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: progressWidth }]} />
      </View>
      <Text style={styles.progressCaption}>
        {summary.momentum.isComplete
          ? t('Weekly goal reached. Keep the streak moving.')
          : t('{count} points left to finish this week.', {
              count: summary.momentum.remainingPoints,
            })}
      </Text>

      <View style={styles.goalRow}>
        <View style={styles.goalBlock}>
          <Text style={styles.goalLabel}>{t('Weekly goal')}</Text>
          <Text style={styles.goalTitle}>
            {t(summary.activeGoal?.title ?? 'Keep building momentum')}
          </Text>
        </View>
        <View style={styles.goalProgressPill}>
          <Text style={styles.goalProgressText}>
            {summary.activeGoal
              ? `${summary.activeGoal.progress}/${summary.activeGoal.target}`
              : '0/1'}
          </Text>
        </View>
      </View>

      <View style={styles.footerRow}>
        <View style={styles.footerBlock}>
          <Text style={styles.goalLabel}>{t('Next badge')}</Text>
          <Text style={styles.goalTitle}>
            {t(summary.nextAchievement?.title ?? 'More soon')}
          </Text>
        </View>
        <Text style={styles.footerMeta}>{t(formatBadgeProgress(summary))}</Text>
      </View>

      {premium ? (
        <View style={styles.premiumRow}>
          <View style={styles.premiumMetric}>
            <Text style={styles.goalLabel}>{t('Completed weeks')}</Text>
            <Text style={styles.premiumValue}>{summary.lifetimeStats.completedWeeks}</Text>
          </View>
          <View style={styles.premiumMetric}>
            <Text style={styles.goalLabel}>{t('Swap wins')}</Text>
            <Text style={styles.premiumValue}>{summary.lifetimeStats.swapWins}</Text>
          </View>
          <View style={styles.premiumMetric}>
            <Text style={styles.goalLabel}>{t('Trips')}</Text>
            <Text style={styles.premiumValue}>{summary.lifetimeStats.tripCompletions}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (
  colors: ReturnType<typeof useAppTheme>['colors'],
  typography: ReturnType<typeof useAppTheme>['typography']
) =>
  StyleSheet.create({
    body: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 14,
      lineHeight: 21,
    },
    card: {
      backgroundColor: colors.surface,
      borderBottomColor: colors.border,
      borderBottomWidth: 1,
      borderColor: colors.border,
      borderRadius: 28,
      borderWidth: 1,
      gap: 14,
      padding: 22,
    },
    copyBlock: {
      flex: 1,
      gap: 4,
    },
    footerBlock: {
      flex: 1,
      gap: 2,
    },
    footerMeta: {
      color: colors.primary,
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '800',
    },
    footerRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 12,
    },
    goalBlock: {
      flex: 1,
      gap: 2,
    },
    goalLabel: {
      color: colors.primary,
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    goalProgressPill: {
      backgroundColor: colors.primaryMuted,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    goalProgressText: {
      color: colors.primary,
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '800',
    },
    goalRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 12,
    },
    goalTitle: {
      color: colors.text,
      fontFamily: typography.bodyFontFamily,
      fontSize: 14,
      fontWeight: '700',
      lineHeight: 19,
    },
    headerRow: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      gap: 18,
    },
    label: {
      color: colors.primary,
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    premiumMetric: {
      flex: 1,
      gap: 4,
    },
    premiumRow: {
      borderTopColor: colors.border,
      borderTopWidth: 1,
      flexDirection: 'row',
      gap: 12,
      paddingTop: 14,
    },
    premiumValue: {
      color: colors.text,
      fontFamily: typography.headingFontFamily,
      fontSize: 18,
      fontWeight: '800',
    },
    progressCaption: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 13,
    },
    progressFill: {
      backgroundColor: colors.primary,
      borderRadius: 999,
      height: '100%',
    },
    progressTrack: {
      backgroundColor: colors.primaryMuted,
      borderRadius: 999,
      height: 14,
      overflow: 'hidden',
    },
    streakLabel: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 11,
      textAlign: 'center',
    },
    streakPill: {
      alignItems: 'center',
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: 22,
      borderWidth: 1,
      gap: 2,
      minWidth: 92,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    streakValue: {
      color: colors.text,
      fontFamily: typography.headingFontFamily,
      fontSize: 28,
      fontWeight: '800',
      lineHeight: 28,
    },
    title: {
      color: colors.text,
      fontFamily: typography.headingFontFamily,
      fontSize: 24,
      fontWeight: '800',
      lineHeight: 30,
    },
  });
