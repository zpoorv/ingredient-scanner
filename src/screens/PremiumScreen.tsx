import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import type { CustomerInfo, PurchasesOffering } from 'react-native-purchases';

import PopupSheetLayout from '../components/PopupSheetLayout';
import PrimaryButton from '../components/PrimaryButton';
import SubscriptionOptionCard from '../components/SubscriptionOptionCard';
import { useAppTheme } from '../components/AppThemeProvider';
import {
  PREMIUM_FEATURE_COPY,
  PREMIUM_PRIMARY_VALUE_FEATURES,
  PREMIUM_PRICE_PREVIEW_COPY,
} from '../constants/premium';
import {
  createDefaultPremiumEntitlement,
  type PremiumEntitlement,
  type PremiumFeatureId,
} from '../models/premium';
import type { RevenueCatPackageOption } from '../services/revenueCatService';
import {
  getRevenueCatErrorMessage,
  getRevenueCatPremiumState,
  isRevenueCatAvailable,
  isRevenueCatNetworkError,
  isRevenueCatPurchaseCancelled,
  loadRevenueCatCustomerInfo,
  loadRevenueCatOfferings,
  loadRevenueCatPackageOptions,
  presentRevenueCatCustomerCenter,
  presentRevenueCatPaywall,
  purchaseRevenueCatPackage,
  restoreRevenueCatPurchases,
} from '../services/revenueCatService';
import { loadSessionPremiumEntitlement } from '../services/sessionDataService';
import { getPremiumSession, subscribePremiumSession } from '../store';
import { useDelayedVisibility } from '../utils/useDelayedVisibility';

type PremiumSheetProps = {
  featureId?: PremiumFeatureId;
  onClose: () => void;
};

export function PremiumSheet({ featureId, onClose }: PremiumSheetProps) {
  const { colors, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [currentOffering, setCurrentOffering] = useState<PurchasesOffering | null>(null);
  const [entitlement, setEntitlement] = useState<PremiumEntitlement>(getPremiumSession());
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isLoadingPremium, setIsLoadingPremium] = useState(true);
  const [isOfflineStateVisible, setIsOfflineStateVisible] = useState(false);
  const [packageOptions, setPackageOptions] = useState<RevenueCatPackageOption[]>([]);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const shouldShowLoadingScreen = useDelayedVisibility(
    isLoadingPremium && !hasLoadedOnce
  );
  const highlightedFeature = featureId ? PREMIUM_FEATURE_COPY[featureId] : null;
  const revenueCatAvailable = isRevenueCatAvailable();
  const billingState = getRevenueCatPremiumState(customerInfo);
  const activeProductLabel =
    entitlement.billingProductIdentifier || billingState.productIdentifier || 'No active plan';
  const hasBillingAccess = revenueCatAvailable && packageOptions.length > 0;
  const billingPlaceholderCopy = useMemo(() => {
    if (!revenueCatAvailable) {
      return {
        subtitle:
          'Billing is not configured in this build yet. Add the RevenueCat Android key and rebuild the app.',
        title: 'Billing setup needed',
      };
    }

    if (!currentOffering) {
      return {
        subtitle:
          'Plans are not available on this device yet. Open the Play test build for this account and try again.',
        title: 'Plans not available yet',
      };
    }

    return {
      subtitle: 'We could not load plans on this device right now. Try again in a moment.',
      title: 'Plans will appear here soon',
    };
  }, [currentOffering, revenueCatAvailable]);
  const sheetTitle = shouldShowLoadingScreen
    ? 'Premium'
    : entitlement.isPremium
      ? 'Premium active'
      : 'Go Premium';
  const sheetSubtitle = shouldShowLoadingScreen
    ? 'Checking your access and available plans.'
    : isOfflineStateVisible
      ? 'Reconnect to refresh plans and verify your subscription.'
      : highlightedFeature?.shortLabel
        ? `${highlightedFeature.shortLabel} highlighted`
        : entitlement.isPremium
          ? 'Premium is active on this account.'
          : 'Pick a plan when you want deeper guidance and unlimited OCR.';

  const loadPremiumState = useCallback(async () => {
    const latestCustomerInfo = await loadRevenueCatCustomerInfo();
    const [latestEntitlement, latestOffering] = await Promise.all([
      loadSessionPremiumEntitlement('stale-while-revalidate'),
      loadRevenueCatOfferings(),
    ]);
    const nextPackageOptions = await loadRevenueCatPackageOptions(
      latestOffering,
      latestCustomerInfo
    );
    const nextEntitlement = latestEntitlement ?? createDefaultPremiumEntitlement();

    setCustomerInfo(latestCustomerInfo);
    setCurrentOffering(latestOffering);
    setEntitlement(nextEntitlement);
    setPackageOptions(nextPackageOptions);
    setHasLoadedOnce(true);
    setIsOfflineStateVisible(false);
  }, []);

  const refreshPremiumState = useCallback(
    async (options?: { showLoadingScreen?: boolean }) => {
      if (options?.showLoadingScreen && !hasLoadedOnce) {
        setIsLoadingPremium(true);
      }

      try {
        await loadPremiumState();
      } catch (error) {
        if (isRevenueCatNetworkError(error)) {
          setIsOfflineStateVisible(true);
          setHasLoadedOnce(true);
          return;
        }

        Alert.alert(
          'Premium unavailable',
          getRevenueCatErrorMessage(error, 'We could not load premium right now.')
        );
      } finally {
        setIsLoadingPremium(false);
      }
    },
    [hasLoadedOnce, loadPremiumState]
  );

  useEffect(() => {
    let isMounted = true;
    const unsubscribe = subscribePremiumSession((nextEntitlement) => {
      if (isMounted) {
        setEntitlement(nextEntitlement ?? createDefaultPremiumEntitlement());
      }
    });

    void refreshPremiumState({ showLoadingScreen: !hasLoadedOnce });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [hasLoadedOnce, refreshPremiumState]);

  const handlePurchasePackage = async (selectedPackage: RevenueCatPackageOption) => {
    setPendingActionId(selectedPackage.id);

    try {
      await purchaseRevenueCatPackage(selectedPackage.packageRef);
      await loadPremiumState();
      Alert.alert('Premium updated', `${selectedPackage.title} is now active.`);
    } catch (error) {
      if (!isRevenueCatPurchaseCancelled(error)) {
        Alert.alert(
          'Purchase failed',
          getRevenueCatErrorMessage(error, 'We could not start that subscription right now.')
        );
      }
    } finally {
      setPendingActionId(null);
    }
  };

  return (
    <PopupSheetLayout onClose={onClose} subtitle={sheetSubtitle} title={sheetTitle}>
      {shouldShowLoadingScreen ? (
        <View style={styles.stateCard}>
          <ActivityIndicator color={colors.primary} size="small" />
          <View style={styles.stateCopy}>
            <Text style={styles.stateTitle}>Loading premium</Text>
            <Text style={styles.stateText}>
              Checking your subscription status and available plans.
            </Text>
          </View>
        </View>
      ) : isOfflineStateVisible ? (
        <View style={styles.flow}>
          <View style={styles.stateCard}>
            <View style={styles.stateCopy}>
              <Text style={styles.stateTitle}>Premium needs a connection</Text>
              <Text style={styles.stateText}>
                Premium plans need internet to verify your subscription and load offers.
              </Text>
            </View>
          </View>
          <PrimaryButton label="Try Again" onPress={() => void refreshPremiumState()} />
        </View>
      ) : (
        <View style={styles.flow}>
          <View style={styles.heroCard}>
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusBadge,
                  entitlement.isPremium ? styles.statusBadgeActive : styles.statusBadgeInactive,
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    entitlement.isPremium
                      ? styles.statusBadgeTextActive
                      : styles.statusBadgeTextInactive,
                  ]}
                >
                  {entitlement.isPremium ? 'Premium active' : 'Free plan'}
                </Text>
              </View>
              <View style={styles.planPill}>
                <Text style={styles.planPillText}>{activeProductLabel}</Text>
              </View>
            </View>
            <Text style={styles.subtitle}>
              {highlightedFeature?.description ||
                `Deeper guidance, smarter history, better trips, and unlimited OCR. ${PREMIUM_PRICE_PREVIEW_COPY}`}
            </Text>
          </View>

          <View style={styles.featureCard}>
            <Text style={styles.sectionTitle}>Why upgrade</Text>
            {PREMIUM_PRIMARY_VALUE_FEATURES.slice(0, 4).map((item) => (
              <View key={item} style={styles.featureRow}>
                <View style={styles.featureDot} />
                <Text style={styles.featureText}>{item}</Text>
              </View>
            ))}
          </View>

          {packageOptions.length > 0 ? (
            <View style={styles.subscriptionSection}>
              <Text style={styles.sectionTitle}>Plans</Text>
              {packageOptions.map((option) => (
                <SubscriptionOptionCard
                  key={option.id}
                  badge={option.id === 'yearly' ? 'Best value' : undefined}
                  buttonLabel={`Choose ${option.title}`}
                  description={option.description}
                  disabled={Boolean(pendingActionId)}
                  isCurrent={option.productIdentifier === activeProductLabel}
                  onPress={() => void handlePurchasePackage(option)}
                  periodLabel={option.periodLabel}
                  priceLabel={option.priceLabel}
                  title={option.title}
                />
              ))}
            </View>
          ) : (
            <View style={styles.billingCard}>
              <Text style={styles.sectionTitle}>{billingPlaceholderCopy.title}</Text>
              <Text style={styles.billingWarning}>{billingPlaceholderCopy.subtitle}</Text>
            </View>
          )}

          {highlightedFeature ? (
            <View style={styles.highlightCard}>
              <Text style={styles.highlightLabel}>Selected feature</Text>
              <Text style={styles.highlightTitle}>{highlightedFeature.title}</Text>
              <Text style={styles.highlightText}>{highlightedFeature.description}</Text>
            </View>
          ) : null}

          <View style={styles.buttonStack}>
            <PrimaryButton
              disabled={!hasBillingAccess || Boolean(pendingActionId)}
              label={entitlement.isPremium ? 'View Plans' : 'See Plans'}
              onPress={() => {
                setPendingActionId('paywall');
                void presentRevenueCatPaywall(currentOffering)
                  .then(loadPremiumState)
                  .catch((error) => {
                    Alert.alert(
                      'Paywall unavailable',
                      getRevenueCatErrorMessage(
                        error,
                        'We could not open premium checkout right now.'
                      )
                    );
                  })
                  .finally(() => setPendingActionId(null));
              }}
            />
            <PrimaryButton
              disabled={!revenueCatAvailable || Boolean(pendingActionId)}
              label="Restore"
              onPress={() => {
                setPendingActionId('restore');
                void restoreRevenueCatPurchases()
                  .then(async (restoredCustomerInfo) => {
                    await loadPremiumState();
                    Alert.alert(
                      'Restore complete',
                      getRevenueCatPremiumState(restoredCustomerInfo).isActive
                        ? 'Your premium access is active again.'
                        : 'No active premium subscription was found on this store account.'
                    );
                  })
                  .catch((error) => {
                    Alert.alert(
                      'Restore failed',
                      getRevenueCatErrorMessage(error, 'We could not restore purchases right now.')
                    );
                  })
                  .finally(() => setPendingActionId(null));
              }}
            />
            {(entitlement.isPremium || billingState.managementUrl) && revenueCatAvailable ? (
              <PrimaryButton
                disabled={Boolean(pendingActionId)}
                label="Manage Subscription"
                onPress={() => {
                  setPendingActionId('customer-center');
                  void presentRevenueCatCustomerCenter()
                    .then(loadPremiumState)
                    .catch((error) => {
                      Alert.alert(
                        'Customer Center unavailable',
                        getRevenueCatErrorMessage(
                          error,
                          'We could not open subscription management right now.'
                        )
                      );
                    })
                    .finally(() => setPendingActionId(null));
                }}
              />
            ) : null}
          </View>
        </View>
      )}
    </PopupSheetLayout>
  );
}

export default function PremiumScreen() {
  return null;
}

const createStyles = (
  colors: ReturnType<typeof useAppTheme>['colors'],
  typography: ReturnType<typeof useAppTheme>['typography']
) =>
  StyleSheet.create({
    billingCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 24,
      borderWidth: 1,
      gap: 8,
      padding: 18,
    },
    billingWarning: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 14,
      lineHeight: 21,
    },
    buttonStack: {
      gap: 10,
    },
    featureCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 24,
      borderWidth: 1,
      gap: 12,
      padding: 18,
    },
    featureDot: {
      backgroundColor: colors.primary,
      borderRadius: 999,
      height: 10,
      marginTop: 6,
      width: 10,
    },
    featureRow: {
      flexDirection: 'row',
      gap: 12,
    },
    featureText: {
      color: colors.text,
      flex: 1,
      fontFamily: typography.bodyFontFamily,
      fontSize: 14,
      lineHeight: 21,
    },
    flow: {
      gap: 14,
    },
    sectionTitle: {
      color: colors.text,
      fontFamily: typography.headingFontFamily,
      fontSize: 18,
      fontWeight: '800',
    },
    heroCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 24,
      borderWidth: 1,
      gap: 10,
      padding: 18,
    },
    highlightCard: {
      backgroundColor: colors.primaryMuted,
      borderColor: colors.primary,
      borderRadius: 22,
      borderWidth: 1,
      gap: 8,
      padding: 16,
    },
    highlightLabel: {
      color: colors.primary,
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    highlightText: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 14,
      lineHeight: 21,
    },
    highlightTitle: {
      color: colors.text,
      fontFamily: typography.headingFontFamily,
      fontSize: 18,
      fontWeight: '800',
    },
    planPill: {
      backgroundColor: colors.primaryMuted,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    planPillText: {
      color: colors.primary,
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '800',
    },
    stateCard: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 24,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 14,
      padding: 18,
    },
    stateCopy: {
      flex: 1,
      gap: 4,
    },
    stateText: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 14,
      lineHeight: 20,
    },
    stateTitle: {
      color: colors.text,
      fontFamily: typography.headingFontFamily,
      fontSize: 18,
      fontWeight: '800',
    },
    statusBadge: {
      alignSelf: 'flex-start',
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    statusBadgeActive: {
      backgroundColor: colors.primaryMuted,
    },
    statusBadgeInactive: {
      backgroundColor: colors.background,
    },
    statusBadgeText: {
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    statusBadgeTextActive: {
      color: colors.primary,
    },
    statusBadgeTextInactive: {
      color: colors.textMuted,
    },
    statusRow: {
      alignItems: 'center',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    subscriptionSection: {
      gap: 12,
    },
    subtitle: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 14,
      lineHeight: 21,
    },
  });
