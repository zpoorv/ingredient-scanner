import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import AchievementBadgeStrip from '../components/AchievementBadgeStrip';
import FeaturePageLayout from '../components/FeaturePageLayout';
import QuestActionCard from '../components/QuestActionCard';
import ScreenLoadingView from '../components/ScreenLoadingView';
import WeeklyMomentumCard from '../components/WeeklyMomentumCard';
import { useAppTheme } from '../components/AppThemeProvider';
import { createDefaultPremiumEntitlement } from '../models/premium';
import { toGamificationSummary } from '../services/gamificationService';
import {
  loadSessionGamificationProfile,
  loadSessionPremiumEntitlement,
} from '../services/sessionDataService';
import type { RootStackParamList } from '../navigation/types';

type ProgressScreenProps = NativeStackScreenProps<RootStackParamList, 'Progress'>;

export default function ProgressScreen({ navigation }: ProgressScreenProps) {
  const { colors, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [summary, setSummary] = useState<ReturnType<typeof toGamificationSummary> | null>(
    null
  );

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      void Promise.all([
        loadSessionGamificationProfile('stale-while-revalidate'),
        loadSessionPremiumEntitlement('cache-first'),
      ])
        .then(([profile, entitlement]) => {
          if (!isMounted) {
            return;
          }

          setSummary(toGamificationSummary(profile));
          setIsPremium((entitlement ?? createDefaultPremiumEntitlement()).isPremium);
        })
        .finally(() => {
          if (isMounted) {
            setIsLoading(false);
          }
        });

      return () => {
        isMounted = false;
      };
    }, [])
  );

  if (isLoading && !summary) {
    return (
      <ScreenLoadingView
        subtitle="Pulling together your weekly momentum and badge progress..."
        title="Loading progress"
      />
    );
  }

  if (!summary) {
    return (
      <FeaturePageLayout
        eyebrow="Progress"
        subtitle="Your weekly habit loop will appear after a few meaningful scans."
        title="This week"
      >
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Nothing to show yet</Text>
          <Text style={styles.emptyBody}>
            Scan a few products and Inqoura will start tracking momentum, goals, and quiet wins.
          </Text>
        </View>
      </FeaturePageLayout>
    );
  }

  return (
    <FeaturePageLayout
      eyebrow="Progress"
      subtitle="Momentum, streaks, and badges now live here instead of crowding Home and History."
      title="This week"
    >
      <WeeklyMomentumCard premium={isPremium} summary={summary} />
      <AchievementBadgeStrip badges={summary.recentUnlockedAchievements} />

      <View style={styles.statsCard}>
        <Text style={styles.statsLabel}>Lifetime</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>{summary.lifetimeStats.totalScans}</Text>
            <Text style={styles.statTitle}>scan sessions</Text>
          </View>
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>{summary.lifetimeStats.swapWins}</Text>
            <Text style={styles.statTitle}>better swaps</Text>
          </View>
          <View style={styles.statBlock}>
            <Text style={styles.statValue}>{summary.lifetimeStats.tripCompletions}</Text>
            <Text style={styles.statTitle}>completed trips</Text>
          </View>
        </View>
      </View>

      {!isPremium ? (
        <QuestActionCard
          badge="Premium"
          icon="sparkles-outline"
          onPress={() => navigation.navigate('Premium', { featureId: 'weekly-history-insights' })}
          subtitle="Unlock deeper history patterns and richer progress breakdowns."
          title="Go further with premium"
        />
      ) : null}
    </FeaturePageLayout>
  );
}

const createStyles = (
  colors: ReturnType<typeof useAppTheme>['colors'],
  typography: ReturnType<typeof useAppTheme>['typography']
) =>
  StyleSheet.create({
    emptyBody: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 15,
      lineHeight: 22,
    },
    emptyCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 24,
      borderWidth: 1,
      gap: 8,
      padding: 20,
    },
    emptyTitle: {
      color: colors.text,
      fontFamily: typography.headingFontFamily,
      fontSize: 20,
      fontWeight: '800',
    },
    statBlock: {
      flex: 1,
      gap: 4,
    },
    statTitle: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 13,
    },
    statValue: {
      color: colors.text,
      fontFamily: typography.displayFontFamily,
      fontSize: 26,
      fontWeight: '800',
    },
    statsCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 24,
      borderWidth: 1,
      gap: 14,
      padding: 20,
    },
    statsLabel: {
      color: colors.primary,
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    statsRow: {
      flexDirection: 'row',
      gap: 12,
    },
  });
