import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import FeaturePageLayout from '../components/FeaturePageLayout';
import HistoryInsightsCard from '../components/HistoryInsightsCard';
import HistoryNotificationsCard from '../components/HistoryNotificationsCard';
import ProductChangeAlertsCard from '../components/ProductChangeAlertsCard';
import ProductTimelineCard from '../components/ProductTimelineCard';
import ScreenLoadingView from '../components/ScreenLoadingView';
import { useAppTheme } from '../components/AppThemeProvider';
import { createDefaultPremiumEntitlement } from '../models/premium';
import { toGamificationSummary } from '../services/gamificationService';
import {
  loadSessionGamificationProfile,
  loadSessionPremiumEntitlement,
  loadSessionProductChangeAlerts,
  loadSessionScanHistory,
  loadSessionUserProfile,
} from '../services/sessionDataService';
import { getCanonicalNowMs } from '../services/timeIntegrityService';
import { openMainRoute } from '../navigation/navigationRef';
import type { RootStackParamList } from '../navigation/types';
import { buildHistoryOverview } from '../utils/historyPersonalization';

type AlertsScreenProps = NativeStackScreenProps<RootStackParamList, 'Alerts'>;

export default function AlertsScreen({ navigation }: AlertsScreenProps) {
  const { colors, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const [isLoading, setIsLoading] = useState(true);
  const [alertsState, setAlertsState] = useState<ReturnType<typeof buildHistoryOverview> | null>(
    null
  );
  const [changeAlerts, setChangeAlerts] = useState<Awaited<
    ReturnType<typeof loadSessionProductChangeAlerts>
  >>([]);
  const [historyEntries, setHistoryEntries] = useState<Awaited<
    ReturnType<typeof loadSessionScanHistory>
  >>([]);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      void Promise.all([
        loadSessionScanHistory('stale-while-revalidate'),
        loadSessionUserProfile('cache-first'),
        loadSessionPremiumEntitlement('cache-first'),
        loadSessionProductChangeAlerts('stale-while-revalidate'),
        loadSessionGamificationProfile('cache-first'),
        getCanonicalNowMs(),
      ])
        .then(([nextEntries, profile, entitlement, nextChangeAlerts, gamificationProfile, nowMs]) => {
          if (!isMounted) {
            return;
          }

          setHistoryEntries(nextEntries);
          setChangeAlerts(nextChangeAlerts ?? []);
          setAlertsState(
            buildHistoryOverview(nextEntries, {
              currentTimeMs: nowMs,
              gamificationSummary: gamificationProfile
                ? toGamificationSummary(gamificationProfile)
                : null,
              includePremiumPatterns:
                (entitlement ?? createDefaultPremiumEntitlement()).isPremium &&
                (profile?.historyInsightsEnabled ?? true),
            })
          );
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

  if (isLoading && !alertsState) {
    return (
      <ScreenLoadingView
        subtitle="Pulling together changed products, watch-outs, and recent signals..."
        title="Loading alerts"
      />
    );
  }

  const handleOpenChangedProduct = (alertId: string) => {
    const matchingEntry = historyEntries.find((entry) => entry.barcode === alertId);

    if (!matchingEntry) {
      openMainRoute('Search');
      return;
    }

    navigation.push('Result', {
      barcode: matchingEntry.barcode,
      barcodeType: matchingEntry.barcodeType,
      persistToHistory: false,
      profileId: matchingEntry.profileId,
      product: matchingEntry.product,
    });
  };

  return (
    <FeaturePageLayout
      eyebrow="Alerts"
      subtitle="Changes, watch-outs, and repeat-buy nudges now have a dedicated page."
      title="Watch this first"
    >
      {alertsState ? (
        <>
          <HistoryNotificationsCard notifications={alertsState.notifications.slice(0, 3)} />
          <HistoryInsightsCard colors={colors} insights={alertsState.insights.slice(0, 3)} />
          <ProductChangeAlertsCard
            alerts={changeAlerts}
            onOpenAlert={(alert) => handleOpenChangedProduct(alert.barcode)}
          />
          <ProductTimelineCard entries={alertsState.recentChanges.slice(0, 4)} title="Recent changes" />
          {alertsState.replaceFirstCandidate ? (
            <View style={styles.replaceCard}>
              <Text style={styles.replaceLabel}>Replace first</Text>
              <Text style={styles.replaceTitle}>{alertsState.replaceFirstCandidate.name}</Text>
              <Text style={styles.replaceBody}>{alertsState.replaceFirstCandidate.reason}</Text>
              {alertsState.replacementCandidates.slice(0, 2).map((candidate) => (
                <Text key={candidate.id} style={styles.replaceHint}>
                  {candidate.name}: {candidate.reason}
                </Text>
              ))}
            </View>
          ) : null}
        </>
      ) : (
        <View style={styles.replaceCard}>
          <Text style={styles.replaceTitle}>No active watch-outs yet</Text>
          <Text style={styles.replaceBody}>
            Product changes and repeat-buy cautions will gather here after a few scans.
          </Text>
        </View>
      )}
    </FeaturePageLayout>
  );
}

const createStyles = (
  colors: ReturnType<typeof useAppTheme>['colors'],
  typography: ReturnType<typeof useAppTheme>['typography']
) =>
  StyleSheet.create({
    replaceBody: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 14,
      lineHeight: 21,
    },
    replaceCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 24,
      borderWidth: 1,
      gap: 8,
      padding: 20,
    },
    replaceHint: {
      color: colors.primary,
      fontFamily: typography.bodyFontFamily,
      fontSize: 13,
      fontWeight: '700',
    },
    replaceLabel: {
      color: colors.primary,
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    replaceTitle: {
      color: colors.text,
      fontFamily: typography.headingFontFamily,
      fontSize: 20,
      fontWeight: '800',
    },
  });
