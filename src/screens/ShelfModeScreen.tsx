import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useI18n } from '../components/AppLanguageProvider';
import { useAppTheme } from '../components/AppThemeProvider';
import FeatureTipCard from '../components/FeatureTipCard';
import MicroCelebrationBanner from '../components/MicroCelebrationBanner';
import PrimaryButton from '../components/PrimaryButton';
import type { ComparisonSessionEntry } from '../models/comparisonSession';
import type { GamificationCelebration } from '../models/gamification';
import type { PremiumEntitlement } from '../models/premium';
import type { RootStackParamList } from '../navigation/types';
import {
  clearComparisonSession,
  finishComparisonTrip,
  loadComparisonSession,
  removeComparisonSessionEntry,
} from '../services/comparisonSessionStorage';
import { recordGamificationTripCompletion } from '../services/gamificationService';
import { loadSessionPremiumEntitlement } from '../services/sessionDataService';
import { buildShelfComparisonSummary } from '../utils/shelfComparison';
import { useFeatureTutorial } from '../utils/useFeatureTutorial';

type ShelfModeScreenProps = NativeStackScreenProps<RootStackParamList, 'ShelfMode'>;

function formatVerdict(value: string) {
  switch (value) {
    case 'good-regular-pick':
      return 'Good regular pick';
    case 'okay-occasionally':
      return 'Okay occasionally';
    case 'not-ideal-often':
      return 'Not ideal often';
    default:
      return 'Need better data';
  }
}

function formatHouseholdFit(value: ComparisonSessionEntry['householdFitVerdict']) {
  switch (value) {
    case 'works-for-everyone':
      return 'Works for everyone';
    case 'works-for-you-only':
      return 'Works for you only';
    case 'one-household-caution':
      return 'One caution';
    default:
      return 'Needs a household check';
  }
}

function formatTripDecision(value: ComparisonSessionEntry['tripDecision']) {
  switch (value) {
    case 'buy':
      return 'Buy';
    case 'changed-product':
      return 'Changed';
    case 'usual-buy':
      return 'Usual buy';
    case 'skip':
      return 'Skip';
    default:
      return 'Compare';
  }
}

export default function ShelfModeScreen({ navigation }: ShelfModeScreenProps) {
  const { t } = useI18n();
  const { colors, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const [entries, setEntries] = useState<ComparisonSessionEntry[]>([]);
  const [recentTripSummaries, setRecentTripSummaries] = useState<
    { id: string; recapLine: string; startedAt: string }[]
  >([]);
  const [premiumEntitlement, setPremiumEntitlement] = useState<PremiumEntitlement | null>(
    null
  );
  const [gamificationCelebration, setGamificationCelebration] =
    useState<GamificationCelebration | null>(null);
  const shelfModeTutorial = useFeatureTutorial('shelf-mode');

  useEffect(() => {
    if (!gamificationCelebration) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setGamificationCelebration(null);
    }, 4200);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [gamificationCelebration]);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const restoreSession = async () => {
        const [session, entitlement] = await Promise.all([
          loadComparisonSession(),
          loadSessionPremiumEntitlement('stale-while-revalidate'),
        ]);

        if (!isMounted) {
          return;
        }

        setEntries(session.entries);
        setRecentTripSummaries(
          session.recentTrips.map((trip) => ({
            id: trip.id,
            recapLine: trip.summary.recapLine,
            startedAt: trip.startedAt,
          }))
        );
        setPremiumEntitlement(entitlement);
      };

      void restoreSession();
      return () => {
        isMounted = false;
      };
    }, [])
  );

  const summary = useMemo(() => buildShelfComparisonSummary(entries), [entries]);

  const handleRemoveEntry = async (barcode: string) => {
    const nextSession = await removeComparisonSessionEntry(barcode);
    setEntries(nextSession.entries);
    setRecentTripSummaries(
      nextSession.recentTrips.map((trip) => ({
        id: trip.id,
        recapLine: trip.summary.recapLine,
        startedAt: trip.startedAt,
      }))
    );
  };

  const handleClear = async () => {
    const nextSession = await clearComparisonSession();
    setEntries(nextSession.entries);
    setRecentTripSummaries(
      nextSession.recentTrips.map((trip) => ({
        id: trip.id,
        recapLine: trip.summary.recapLine,
        startedAt: trip.startedAt,
      }))
    );
  };

  const handleFinishTrip = async () => {
    const nextSession = await finishComparisonTrip();
    const completedTrip = nextSession.recentTrips[0] ?? null;

    if (completedTrip) {
      const gamificationResult = await recordGamificationTripCompletion({
        trip: completedTrip,
      });
      setGamificationCelebration(gamificationResult.celebration);
    }

    setEntries(nextSession.entries);
    setRecentTripSummaries(
      nextSession.recentTrips.map((trip) => ({
        id: trip.id,
        recapLine: trip.summary.recapLine,
        startedAt: trip.startedAt,
      }))
    );
  };

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>{t('Trip Mode')}</Text>
          <Text style={styles.title}>{t('Keep the best shelf decision in view')}</Text>
          <Text style={styles.body}>
            {t(
              'Scan a few similar products, keep the strongest fit for your household, and finish the trip with one clear recap.'
            )}
          </Text>
          <Text style={styles.highlight}>{t(summary.whyThisWins)}</Text>
        </View>

        <FeatureTipCard
          body="Use Shelf Mode when comparing similar products. Progress is awarded when a real trip is finished."
          icon="basket-outline"
          onDismiss={shelfModeTutorial.dismiss}
          title="Make one clear shelf decision"
          visible={shelfModeTutorial.isVisible}
        />

        <MicroCelebrationBanner celebration={gamificationCelebration} />

        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{t('Compared now')}</Text>
            <Text style={styles.summaryValue}>{entries.length}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{t('Best regular-use pick')}</Text>
            <Text style={styles.summaryValue}>
              {summary.rows.find((row) => row.barcode === summary.bestForRegularUseBarcode)?.name ??
                t('Scan more')}
            </Text>
          </View>
        </View>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{t('Best household fit')}</Text>
            <Text style={styles.summaryValue}>
              {summary.rows.find((row) => row.barcode === summary.bestHouseholdFitBarcode)?.name ??
                t('Need more scans')}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{t('Best lower-impact option')}</Text>
            <Text style={styles.summaryValue}>
              {summary.rows.find((row) => row.barcode === summary.bestLowerImpactBarcode)?.name ??
                t('No eco data yet')}
            </Text>
          </View>
        </View>

        {summary.rows.length > 0 ? (
          <View style={styles.tableCard}>
            <Text style={styles.sectionTitle}>{t('Trip comparison')}</Text>
            {summary.rows.map((row) => (
              <View key={row.barcode} style={styles.rowCard}>
                <View style={styles.rowHeader}>
                  <View style={styles.rowTextBlock}>
                    <Text style={styles.rowTitle}>{row.name}</Text>
                    <Text style={styles.rowMeta}>
                      {t(formatVerdict(row.decisionVerdict))} • {t(row.confidence)}
                    </Text>
                  </View>
                  {typeof row.score === 'number' ? (
                    <Text style={styles.scorePill}>{Math.round(row.score)}</Text>
                  ) : null}
                </View>
                <View style={styles.tripBadgeRow}>
                  <Text style={styles.tripBadge}>{t(formatTripDecision(row.tripDecision))}</Text>
                  <Text style={styles.tripDetailText}>
                    {t(formatHouseholdFit(row.householdFitVerdict))}
                  </Text>
                  {row.ecoScore ? (
                    <Text style={styles.tripDetailText}>
                      {t('Eco {score}', { score: row.ecoScore.toUpperCase() })}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.rowBody}>{t(row.decisionSummary)}</Text>
                {row.topConcern ? (
                  <Text style={styles.concernText}>
                    {t('Main issue: {topConcern}', { topConcern: row.topConcern })}
                  </Text>
                ) : null}
                <View style={styles.rowActions}>
                  <Pressable
                    onPress={() => {
                      const entry = entries.find((item) => item.barcode === row.barcode);

                      if (!entry) {
                        return;
                      }

                      navigation.push('Result', {
                        barcode: row.barcode,
                        persistToHistory: false,
                        profileId: entry.profileId,
                        product: entry.product,
                      });
                    }}
                    style={styles.actionChip}
                  >
                    <Text style={styles.actionChipText}>{t('Open')}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => void handleRemoveEntry(row.barcode)}
                    style={styles.actionChip}
                  >
                    <Text style={styles.actionChipText}>{t('Remove')}</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.sectionTitle}>{t('No active trip yet')}</Text>
            <Text style={styles.body}>
              {t(
                'Open the scanner, scan two or more products from the same shelf, and this trip will fill itself in automatically.'
              )}
            </Text>
          </View>
        )}

        {recentTripSummaries.length > 0 ? (
          <View style={styles.tableCard}>
            <Text style={styles.sectionTitle}>{t('Recent trips')}</Text>
            {recentTripSummaries.slice(0, 3).map((trip, index) => (
              <View key={trip.id} style={styles.rowCard}>
                <Text style={styles.rowTitle}>
                  {t('Trip {index}', { index: index + 1 })}
                </Text>
                <Text style={styles.rowBody}>{t(trip.recapLine)}</Text>
                <Text style={styles.rowMeta}>
                  {t('Started {date}', {
                    date: new Date(trip.startedAt).toLocaleDateString(),
                  })}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {premiumEntitlement?.isPremium ? (
          <View style={styles.premiumCard}>
            <Text style={styles.sectionTitle}>{t('Premium compare edge')}</Text>
            <Text style={styles.body}>
              {t(
                'Premium keeps favorites ready, preserves comparison slots, and adds deeper swap guidance on each product result.'
              )}
            </Text>
          </View>
        ) : (
          <View style={styles.premiumCard}>
            <Text style={styles.sectionTitle}>{t('Want a stronger compare workflow?')}</Text>
            <Text style={styles.body}>
              {t(
                'Premium saves favorites, keeps comparison slots ready, and adds deeper “why this wins” guidance.'
              )}
            </Text>
            <PrimaryButton
              label="See Premium"
              onPress={() => navigation.navigate('Premium', { featureId: 'favorites-and-comparisons' })}
            />
          </View>
        )}

        {entries.length > 0 ? (
          <>
            <PrimaryButton label="Finish This Trip" onPress={() => void handleFinishTrip()} />
            <PrimaryButton label="Clear Active Tray" onPress={() => void handleClear()} />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (
  colors: ReturnType<typeof useAppTheme>['colors'],
  typography: ReturnType<typeof useAppTheme>['typography']
) =>
  StyleSheet.create({
    actionChip: {
      backgroundColor: colors.primaryMuted,
      borderColor: colors.border,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    actionChipText: {
      color: colors.primary,
      fontFamily: typography.bodyFontFamily,
      fontWeight: '700',
    },
    body: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 14,
      lineHeight: 21,
    },
    concernText: {
      color: colors.warning,
      fontFamily: typography.bodyFontFamily,
      fontSize: 13,
      fontWeight: '700',
    },
    content: { gap: 18, padding: 24 },
    emptyCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 24,
      borderWidth: 1,
      gap: 10,
      padding: 20,
    },
    eyebrow: {
      color: colors.primary,
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.3,
      textTransform: 'uppercase',
    },
    heroCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 28,
      borderWidth: 1,
      gap: 10,
      padding: 22,
    },
    highlight: {
      color: colors.text,
      fontFamily: typography.bodyFontFamily,
      fontSize: 15,
      fontWeight: '700',
      lineHeight: 22,
    },
    premiumCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 24,
      borderWidth: 1,
      gap: 12,
      padding: 20,
    },
    rowActions: { flexDirection: 'row', gap: 10 },
    rowBody: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 14,
      lineHeight: 20,
    },
    rowCard: {
      borderColor: colors.border,
      borderRadius: 18,
      borderWidth: 1,
      gap: 10,
      padding: 16,
    },
    rowHeader: { alignItems: 'center', flexDirection: 'row', gap: 12 },
    rowMeta: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 13,
    },
    tripBadge: {
      color: colors.primary,
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    tripBadgeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    tripDetailText: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 12,
      fontWeight: '600',
    },
    rowTextBlock: { flex: 1, gap: 4 },
    rowTitle: {
      color: colors.text,
      fontFamily: typography.headingFontFamily,
      fontSize: 16,
      fontWeight: '800',
    },
    safeArea: { backgroundColor: colors.background, flex: 1 },
    scorePill: {
      backgroundColor: colors.primaryMuted,
      borderRadius: 999,
      color: colors.primary,
      fontFamily: typography.numericFontFamily,
      fontSize: 16,
      fontWeight: '800',
      overflow: 'hidden',
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    sectionTitle: {
      color: colors.text,
      fontFamily: typography.headingFontFamily,
      fontSize: 20,
      fontWeight: '800',
    },
    summaryCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 20,
      borderWidth: 1,
      flex: 1,
      gap: 6,
      padding: 18,
    },
    summaryGrid: { flexDirection: 'row', gap: 14 },
    summaryLabel: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    summaryValue: {
      color: colors.text,
      fontFamily: typography.headingFontFamily,
      fontSize: 18,
      fontWeight: '800',
    },
    tableCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 24,
      borderWidth: 1,
      gap: 12,
      padding: 20,
    },
    title: {
      color: colors.text,
      fontFamily: typography.headingFontFamily,
      fontSize: 28,
      fontWeight: '800',
      lineHeight: 34,
    },
  });
