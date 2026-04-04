import { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { CustomerInfo, PurchasesOffering } from 'react-native-purchases';

import { useAppTheme } from '../components/AppThemeProvider';
import NoInternetScreen from '../components/NoInternetScreen';
import PrimaryButton from '../components/PrimaryButton';
import ScreenReveal from '../components/ScreenReveal';
import ScreenLoadingView from '../components/ScreenLoadingView';
import SubscriptionOptionCard from '../components/SubscriptionOptionCard';
import TrustPromiseCard from '../components/TrustPromiseCard';
import {
  PREMIUM_BONUS_FEATURES,
  PREMIUM_FEATURE_COPY,
  PREMIUM_FREE_PLAN_FEATURES,
  PREMIUM_PRIMARY_VALUE_FEATURES,
  PREMIUM_PRICE_PREVIEW_COPY,
} from '../constants/premium';
import type { PremiumEntitlement } from '../models/premium';
import type { RootStackParamList } from '../navigation/types';
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

type PremiumScreenProps = NativeStackScreenProps<RootStackParamList, 'Premium'>;

export default function PremiumScreen({ route }: PremiumScreenProps) {
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
  const highlightedFeature = route.params?.featureId
    ? PREMIUM_FEATURE_COPY[route.params.featureId]
    : null;
  const revenueCatAvailable = isRevenueCatAvailable();
  const billingState = getRevenueCatPremiumState(customerInfo);
  const activeProductLabel =
    entitlement.billingProductIdentifier || billingState.productIdentifier || 'No active plan';
  const hasBillingAccess = revenueCatAvailable && packageOptions.length > 0;

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

    setCustomerInfo(latestCustomerInfo);
    setCurrentOffering(latestOffering);
    setEntitlement(latestEntitlement);
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
          getRevenueCatErrorMessage(error, 'We could not load premium billing right now.')
        );
      } finally {
        setIsLoadingPremium(false);
      }
    },
    [hasLoadedOnce, loadPremiumState]
  );

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const unsubscribe = subscribePremiumSession((nextEntitlement) => {
        if (isMounted) {
          setEntitlement(nextEntitlement);
        }
      });

      const restorePremiumState = async () => {
        if (!hasLoadedOnce) {
          setIsLoadingPremium(true);
        }

        await refreshPremiumState({ showLoadingScreen: !hasLoadedOnce });

        if (!isMounted) {
          return;
        }
      };

      void restorePremiumState();

      return () => {
        isMounted = false;
        unsubscribe();
      };
    }, [hasLoadedOnce, refreshPremiumState])
  );

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
          getRevenueCatErrorMessage(
            error,
            'We could not start that subscription right now.'
          )
        );
      }
    } finally {
      setPendingActionId(null);
    }
  };

  const handlePresentPaywall = async () => {
    setPendingActionId('paywall');

    try {
      const paywallResult = await presentRevenueCatPaywall(currentOffering);
      await loadPremiumState();

      if (paywallResult.paywallResult === 'PURCHASED') {
        Alert.alert('Premium unlocked', 'Inqoura Premium is active on this account.');
      } else if (paywallResult.paywallResult === 'RESTORED') {
        Alert.alert('Premium restored', 'Your previous subscription was restored.');
      } else if (paywallResult.paywallResult === 'ERROR') {
        Alert.alert('Paywall failed', 'The RevenueCat paywall could not finish.');
      }
    } catch (error) {
      Alert.alert(
        'Paywall unavailable',
        getRevenueCatErrorMessage(error, 'We could not open premium checkout right now.')
      );
    } finally {
      setPendingActionId(null);
    }
  };

  const handleRestorePress = async () => {
    setPendingActionId('restore');

    try {
      const restoredCustomerInfo = await restoreRevenueCatPurchases();
      await loadPremiumState();
      Alert.alert(
        'Restore complete',
        getRevenueCatPremiumState(restoredCustomerInfo).isActive
          ? 'Your Inqoura Premium access is active again.'
          : 'No active Inqoura Premium subscription was found on this store account.'
      );
    } catch (error) {
      Alert.alert(
        'Restore failed',
        getRevenueCatErrorMessage(error, 'We could not restore purchases right now.')
      );
    } finally {
      setPendingActionId(null);
    }
  };

  const handleOpenCustomerCenter = async () => {
    setPendingActionId('customer-center');

    try {
      await presentRevenueCatCustomerCenter();
      await loadPremiumState();
    } catch (error) {
      Alert.alert(
        'Customer Center unavailable',
        getRevenueCatErrorMessage(
          error,
          'We could not open subscription management right now.'
        )
      );
    } finally {
      setPendingActionId(null);
    }
  };

  if (shouldShowLoadingScreen) {
    return (
      <ScreenLoadingView
        subtitle="Checking your subscription status, offerings, and premium tools..."
        title="Loading premium"
      />
    );
  }

  if (isOfflineStateVisible) {
    return (
      <NoInternetScreen
        onRetry={() => {
          void refreshPremiumState();
        }}
        subtitle="Premium plans need internet to check your subscription and load the latest offers."
        title="Premium needs a connection"
      />
    );
  }

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenReveal style={styles.flow}>
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>Inqoura Premium</Text>
          <Text style={styles.title}>
            {entitlement.isPremium
              ? 'Premium is active on this account'
              : 'Upgrade for deeper guidance'}
          </Text>
          <Text style={styles.subtitle}>
            {highlightedFeature?.description ||
              `Free helps you scan. Premium helps you spot what matters faster, compare better, and shop with more confidence over time. ${PREMIUM_PRICE_PREVIEW_COPY}`}
          </Text>
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
        </View>

        <TrustPromiseCard />

        <View style={styles.featureCard}>
          <Text style={styles.sectionTitle}>What free already includes</Text>
          {PREMIUM_FREE_PLAN_FEATURES.map((item) => (
            <View key={item} style={styles.featureRow}>
              <View style={styles.featureDot} />
              <Text style={styles.featureText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.featureCard}>
          <Text style={styles.sectionTitle}>What premium adds</Text>
          {PREMIUM_PRIMARY_VALUE_FEATURES.map((item) => (
            <View key={item} style={styles.featureRow}>
              <View style={styles.featureDot} />
              <Text style={styles.featureText}>{item}</Text>
            </View>
          ))}
        </View>

        {packageOptions.length > 0 ? (
          <View style={styles.subscriptionSection}>
            <Text style={styles.sectionTitle}>Choose a plan</Text>
            {packageOptions.map((option) => (
              <SubscriptionOptionCard
                key={option.id}
                badge={option.id === 'yearly' ? 'Best value' : undefined}
                buttonLabel={`Subscribe ${option.title}`}
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
            <Text style={styles.sectionTitle}>Plans will appear here soon</Text>
            <Text style={styles.billingWarning}>
              We could not load subscription options on this device yet. Try again in a moment.
            </Text>
          </View>
        )}

        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>Also included</Text>
          {PREMIUM_BONUS_FEATURES.map((item) => (
            <Text key={item} style={styles.noteText}>
              • {item}
            </Text>
          ))}
        </View>

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
            onPress={() => void handlePresentPaywall()}
          />
          <PrimaryButton
            disabled={!revenueCatAvailable || Boolean(pendingActionId)}
            label="Restore"
            onPress={() => void handleRestorePress()}
          />
          {(entitlement.isPremium || billingState.managementUrl) && revenueCatAvailable ? (
            <PrimaryButton
              disabled={Boolean(pendingActionId)}
              label="Manage Subscription"
              onPress={() => void handleOpenCustomerCenter()}
            />
          ) : null}
        </View>
        </ScreenReveal>
      </ScrollView>
    </SafeAreaView>
  );
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
      padding: 20,
    },
    billingWarning: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 14,
      lineHeight: 21,
      marginTop: 4,
    },
    buttonStack: {
      gap: 12,
    },
    content: {
      paddingBottom: 164,
      padding: 24,
    },
    eyebrow: {
      color: colors.primary,
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    featureCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 24,
      borderWidth: 1,
      gap: 14,
      padding: 20,
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
      fontSize: 15,
      lineHeight: 22,
    },
    flow: {
      gap: 18,
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
      borderRadius: 28,
      borderWidth: 1,
      gap: 10,
      padding: 22,
    },
    highlightCard: {
      backgroundColor: colors.primaryMuted,
      borderColor: colors.primary,
      borderRadius: 22,
      borderWidth: 1,
      gap: 8,
      padding: 18,
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
      fontSize: 19,
      fontWeight: '800',
    },
    noteCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 22,
      borderWidth: 1,
      gap: 8,
      padding: 18,
    },
    noteText: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 14,
      lineHeight: 20,
    },
    noteTitle: {
      color: colors.text,
      fontFamily: typography.headingFontFamily,
      fontSize: 16,
      fontWeight: '800',
    },
    safeArea: {
      backgroundColor: colors.background,
      flex: 1,
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
      backgroundColor: colors.surface,
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
      gap: 14,
    },
    subtitle: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 15,
      lineHeight: 22,
    },
    title: {
      color: colors.text,
      fontFamily: typography.headingFontFamily,
      fontSize: 30,
      fontWeight: '800',
      lineHeight: 36,
    },
  });
