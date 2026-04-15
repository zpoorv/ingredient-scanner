import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import FeatureTipCard from '../components/FeatureTipCard';
import FeaturePageLayout from '../components/FeaturePageLayout';
import PrimaryButton from '../components/PrimaryButton';
import ScreenLoadingView from '../components/ScreenLoadingView';
import { useI18n } from '../components/AppLanguageProvider';
import { useAppTheme } from '../components/AppThemeProvider';
import type { ComparisonSession } from '../models/comparisonSession';
import type { RootStackParamList } from '../navigation/types';
import { loadSessionComparisonSession } from '../services/sessionDataService';
import { buildShelfComparisonSummary } from '../utils/shelfComparison';
import { useFeatureTutorial } from '../utils/useFeatureTutorial';

type TripsScreenProps = NativeStackScreenProps<RootStackParamList, 'Trips'>;

export default function TripsScreen({ navigation }: TripsScreenProps) {
  const { t } = useI18n();
  const { colors, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const [isLoading, setIsLoading] = useState(true);
  const [comparisonSession, setComparisonSession] = useState<ComparisonSession | null>(null);
  const tripsTutorial = useFeatureTutorial('trips');

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      void loadSessionComparisonSession('stale-while-revalidate')
        .then((session) => {
          if (isMounted) {
            setComparisonSession(session);
          }
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

  if (isLoading && !comparisonSession) {
    return (
      <ScreenLoadingView
        subtitle="Gathering your active comparisons and recent trip recaps..."
        title="Loading trips"
      />
    );
  }

  const currentEntries = comparisonSession?.entries ?? [];
  const recentTrips = comparisonSession?.recentTrips ?? [];
  const activeSummary =
    currentEntries.length > 0 ? buildShelfComparisonSummary(currentEntries) : null;

  return (
    <FeaturePageLayout
      eyebrow="Trips"
      subtitle="Comparison sessions and recaps now live together instead of being scattered through Home."
      tutorialTargetId="trips-hero"
      title="Shopping trips"
    >
      <FeatureTipCard
        body="Trips is for shopping comparisons: start Shelf Mode, compare products, then finish with a recap."
        icon="bag-handle-outline"
        onDismiss={tripsTutorial.dismiss}
        title="Compare during a store trip"
        visible={tripsTutorial.isVisible}
      />

      <View style={styles.card}>
        <Text style={styles.label}>{t('Active trip')}</Text>
        <Text style={styles.title}>
          {currentEntries.length > 0
            ? t('{count} products in play', { count: currentEntries.length })
            : t('No active comparison yet')}
        </Text>
        <Text style={styles.body}>
          {t(
            activeSummary?.tripRecapLine ??
              'Start Shelf Mode when you want to compare products during a store trip.'
          )}
        </Text>
        <PrimaryButton
          label={currentEntries.length > 0 ? 'Continue Shelf Mode' : 'Start Shelf Mode'}
          onPress={() => navigation.navigate('ShelfMode')}
        />
      </View>

      {activeSummary ? (
        <View style={styles.card}>
          <Text style={styles.label}>{t('Current suggestions')}</Text>
          <Text style={styles.listItem}>{t(activeSummary.whyThisWins)}</Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.label}>{t('Recent recaps')}</Text>
        {recentTrips.length > 0 ? (
          recentTrips.slice(0, 4).map((trip) => (
            <View key={trip.id} style={styles.tripRow}>
              <View style={styles.tripCopy}>
                <Text style={styles.tripTitle}>{trip.summary.recapLine}</Text>
                <Text style={styles.tripMeta}>
                  {new Date(trip.endedAt).toLocaleDateString()} •{' '}
                  {t('{count} products', { count: trip.entries.length })}
                </Text>
              </View>
              <Pressable
                onPress={() => navigation.navigate('ShelfMode')}
                style={styles.linkChip}
              >
                <Text style={styles.linkText}>{t('Open')}</Text>
              </Pressable>
            </View>
          ))
        ) : (
          <Text style={styles.body}>
            {t('Finish one comparison trip and its recap will show up here.')}
          </Text>
        )}
      </View>
    </FeaturePageLayout>
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
      borderColor: colors.border,
      borderRadius: 24,
      borderWidth: 1,
      gap: 12,
      padding: 20,
    },
    label: {
      color: colors.primary,
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    linkChip: {
      alignItems: 'center',
      backgroundColor: colors.primaryMuted,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    linkText: {
      color: colors.primary,
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '800',
    },
    listItem: {
      color: colors.text,
      fontFamily: typography.bodyFontFamily,
      fontSize: 14,
      lineHeight: 21,
    },
    title: {
      color: colors.text,
      fontFamily: typography.headingFontFamily,
      fontSize: 22,
      fontWeight: '800',
    },
    tripCopy: {
      flex: 1,
      gap: 4,
    },
    tripMeta: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 13,
    },
    tripRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 12,
    },
    tripTitle: {
      color: colors.text,
      fontFamily: typography.bodyFontFamily,
      fontSize: 14,
      fontWeight: '700',
      lineHeight: 20,
    },
  });
