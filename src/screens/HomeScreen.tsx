import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '../components/AppThemeProvider';
import DietProfileModal from '../components/DietProfileModal';
import HistoryInsightsCard from '../components/HistoryInsightsCard';
import HistoryNotificationsCard from '../components/HistoryNotificationsCard';
import NativeSponsoredCard from '../components/NativeSponsoredCard';
import ProductTimelineCard from '../components/ProductTimelineCard';
import ProductChangeAlertsCard from '../components/ProductChangeAlertsCard';
import ScreenReveal from '../components/ScreenReveal';
import UsualBuysCard, { type UsualBuyCardItem } from '../components/UsualBuysCard';
import {
  DEFAULT_DIET_PROFILE_ID,
  DIET_PROFILE_DEFINITIONS,
  type DietProfileId,
} from '../constants/dietProfiles';
import type { PremiumEntitlement } from '../models/premium';
import { openMainRoute } from '../navigation/navigationRef';
import type { RootStackParamList } from '../navigation/types';
import {
  loadDietProfileIntroSeen,
  markDietProfileIntroSeen,
  saveDietProfile,
} from '../services/dietProfileStorage';
import { loadAdminAppConfig } from '../services/adminAppConfigService';
import { loadComparisonSession } from '../services/comparisonSessionStorage';
import {
  loadFeatureQuotaSnapshot,
  type FeatureQuotaSnapshot,
} from '../services/featureUsageStorage';
import { loadCurrentPremiumEntitlement } from '../services/premiumEntitlementService';
import { loadProductChangeAlerts } from '../services/productChangeAlertService';
import { loadUsualBuyProducts } from '../services/commonProductStorage';
import { loadEffectiveShoppingProfile } from '../services/householdProfilesService';
import {
  hasShownNativeAdThisSession,
  markNativeAdShownThisSession,
} from '../services/adSessionService';
import {
  loadScanHistory,
  subscribeScanHistoryChanges,
} from '../services/scanHistoryStorage';
import { loadUserProfile } from '../services/userProfileService';
import { getPremiumSession, subscribeAuthSession, subscribePremiumSession } from '../store';
import {
  buildHistoryNotifications,
  buildHistoryOverview,
  type HistoryInsight,
  type HistoryNotification,
  type HistoryReplacementCandidate,
} from '../utils/historyPersonalization';
import type { ProductChangeAlert } from '../models/productChangeAlert';
import type { ProductTimelineEntry } from '../models/productTimeline';
import { buildShelfComparisonSummary } from '../utils/shelfComparison';

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const insets = useSafeAreaInsets();
  const { colors, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const [selectedProfileId, setSelectedProfileId] = useState<DietProfileId>(
    DEFAULT_DIET_PROFILE_ID
  );
  const [draftProfileId, setDraftProfileId] = useState<DietProfileId>(
    DEFAULT_DIET_PROFILE_ID
  );
  const [adminAnnouncement, setAdminAnnouncement] = useState<{
    body: string | null;
    title: string | null;
  } | null>(null);
  const [historyInsights, setHistoryInsights] = useState<HistoryInsight[]>([]);
  const [historyNotifications, setHistoryNotifications] = useState<HistoryNotification[]>([]);
  const [productChangeAlerts, setProductChangeAlerts] = useState<ProductChangeAlert[]>([]);
  const [recentChanges, setRecentChanges] = useState<ProductTimelineEntry[]>([]);
  const [replaceFirstCandidate, setReplaceFirstCandidate] =
    useState<HistoryReplacementCandidate | null>(null);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [comparisonSummary, setComparisonSummary] = useState<string | null>(null);
  const [recentTripSummary, setRecentTripSummary] = useState<string | null>(null);
  const [shelfItemCount, setShelfItemCount] = useState(0);
  const [activeShopperName, setActiveShopperName] = useState('You');
  const [isHouseholdProfileActive, setIsHouseholdProfileActive] = useState(false);
  const [isHistoryEnabled, setIsHistoryEnabled] = useState(true);
  const [isIngredientOcrEnabled, setIsIngredientOcrEnabled] = useState(true);
  const [isFirstLaunchProfileFlow, setIsFirstLaunchProfileFlow] = useState(false);
  const [ocrQuotaSnapshot, setOcrQuotaSnapshot] = useState<FeatureQuotaSnapshot | null>(
    null
  );
  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
  const [premiumEntitlement, setPremiumEntitlement] = useState<PremiumEntitlement>(
    getPremiumSession()
  );
  const [usualBuys, setUsualBuys] = useState<UsualBuyCardItem[]>([]);
  const [shouldMountHomeNativeAd] = useState(
    !hasShownNativeAdThisSession('home')
  );

  const selectedProfile =
    DIET_PROFILE_DEFINITIONS.find((profile) => profile.id === selectedProfileId) ||
    DIET_PROFILE_DEFINITIONS[0];

  useEffect(() => {
    let isMounted = true;

    const refreshPremiumState = async () => {
      const entitlement = await loadCurrentPremiumEntitlement();
      const [
        quotaSnapshot,
        profile,
        historyEntries,
        comparisonSession,
        changeAlerts,
        effectiveShoppingProfile,
        usualBuyProducts,
      ] =
        await Promise.all([
          loadFeatureQuotaSnapshot('ingredient-ocr', entitlement),
          loadUserProfile(),
          loadScanHistory(),
          loadComparisonSession(),
          loadProductChangeAlerts(),
          loadEffectiveShoppingProfile(),
          loadUsualBuyProducts(3),
        ]);

      if (!isMounted) {
        return;
      }

      setPremiumEntitlement(entitlement);
      setOcrQuotaSnapshot(quotaSnapshot);
      setFavoriteCount(profile?.favoriteProductCodes?.length ?? 0);
      setProductChangeAlerts(changeAlerts);
      setSelectedProfileId(effectiveShoppingProfile.dietProfileId);
      setActiveShopperName(effectiveShoppingProfile.name);
      setIsHouseholdProfileActive(effectiveShoppingProfile.usesHouseholdProfile);
      setShelfItemCount(comparisonSession.entries.length);
      const activeTripSummary =
        comparisonSession.entries.length > 0
          ? buildShelfComparisonSummary(comparisonSession.entries).tripRecapLine
          : null;
      setComparisonSummary(activeTripSummary);
      setRecentTripSummary(comparisonSession.recentTrips[0]?.summary.recapLine ?? null);
      setUsualBuys(
        usualBuyProducts.map((item) => {
          const matchingHistoryEntry =
            historyEntries.find(
              (entry) =>
                entry.barcode === item.barcode ||
                entry.product.code === item.code ||
                entry.id === item.barcode
            ) ?? null;

          return {
            id: item.code || item.barcode,
            isFavorite: (profile?.favoriteProductCodes ?? []).includes(item.code || item.barcode),
            name: item.name,
            score: matchingHistoryEntry?.score ?? null,
            summary:
              matchingHistoryEntry?.riskSummary ||
              item.product.categories[0] ||
              'Scanned recently',
            usageCount: item.usageCount,
          };
        })
      );
      const historyOverview = buildHistoryOverview(historyEntries, {
        includePremiumPatterns:
          entitlement.isPremium && (profile?.historyInsightsEnabled ?? true),
      });
      setHistoryInsights(historyOverview.insights);
      setRecentChanges(historyOverview.recentChanges.slice(0, 2));
      setReplaceFirstCandidate(historyOverview.replaceFirstCandidate);
      setHistoryNotifications(
        profile?.historyNotificationsEnabled
          ? buildHistoryNotifications(
              historyEntries,
              profile.historyNotificationCadence ?? 'weekly'
            )
          : []
      );
    };

    const unsubscribe = subscribeAuthSession((session) => {
      void refreshPremiumState();
    });
    const unsubscribePremium = subscribePremiumSession((entitlement) => {
      setPremiumEntitlement(entitlement);
      void refreshPremiumState();
    });
    const unsubscribeHistory = subscribeScanHistoryChanges(() => {
      void refreshPremiumState();
    });

    void refreshPremiumState();

    return () => {
      isMounted = false;
      unsubscribe();
      unsubscribePremium();
      unsubscribeHistory();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const restoreProfile = async () => {
      const [effectiveShoppingProfile, hasSeenIntro] = await Promise.all([
        loadEffectiveShoppingProfile(),
        loadDietProfileIntroSeen(),
      ]);

      if (isMounted) {
        setSelectedProfileId(effectiveShoppingProfile.dietProfileId);
        setDraftProfileId(effectiveShoppingProfile.dietProfileId);
        setActiveShopperName(effectiveShoppingProfile.name);
        setIsHouseholdProfileActive(effectiveShoppingProfile.usesHouseholdProfile);
        setIsFirstLaunchProfileFlow(!hasSeenIntro);
        setIsProfileModalVisible(!hasSeenIntro);
      }
    };

    void restoreProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const restoreAdminConfig = async () => {
      const config = await loadAdminAppConfig();

      if (!isMounted) {
        return;
      }

      setAdminAnnouncement({
        body: config.homeAnnouncementBody,
        title: config.homeAnnouncementTitle,
      });
      setIsHistoryEnabled(config.enableHistory);
      setIsIngredientOcrEnabled(config.enableIngredientOcr);
    };

    void restoreAdminConfig();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleApplyProfile = async () => {
    setSelectedProfileId(draftProfileId);
    setIsProfileModalVisible(false);
    setIsFirstLaunchProfileFlow(false);
    await saveDietProfile(draftProfileId);
    await markDietProfileIntroSeen();
  };

  const handleHomeAdLoaded = useCallback(() => {
    markNativeAdShownThisSession('home');
  }, []);
  const shouldShowHomeNativeAd =
    !premiumEntitlement.isPremium && shouldMountHomeNativeAd;
  const shouldInsertHomeAdAfterInsights =
    shouldShowHomeNativeAd && isHistoryEnabled && historyInsights.length > 0;
  const shouldInsertHomeAdAfterNotifications =
    shouldShowHomeNativeAd &&
    !shouldInsertHomeAdAfterInsights &&
    isHistoryEnabled &&
    historyNotifications.length > 0;
  const shouldInsertHomeAdAfterAlerts =
    shouldShowHomeNativeAd &&
    !shouldInsertHomeAdAfterInsights &&
    !shouldInsertHomeAdAfterNotifications &&
    productChangeAlerts.length > 0;
  const shouldInsertHomeAdAfterUsualBuys =
    shouldShowHomeNativeAd &&
    !shouldInsertHomeAdAfterInsights &&
    !shouldInsertHomeAdAfterNotifications &&
    !shouldInsertHomeAdAfterAlerts;

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.backgroundGlow} />

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom + 122, 148) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <ScreenReveal style={styles.content}>
            <View style={styles.heroBlock}>
              <Text style={styles.title}>Scan smarter</Text>
              <Text style={styles.subtitle}>Barcode or ingredients. Clear answer in seconds.</Text>
            </View>

            {adminAnnouncement?.title || adminAnnouncement?.body ? (
              <View style={styles.announcementCard}>
                <Text style={styles.announcementLabel}>Announcement</Text>
                {adminAnnouncement.title ? (
                  <Text style={styles.announcementTitle}>
                    {adminAnnouncement.title}
                  </Text>
                ) : null}
                {adminAnnouncement.body ? (
                  <Text style={styles.announcementText}>
                    {adminAnnouncement.body}
                  </Text>
                ) : null}
              </View>
            ) : null}

            <View style={styles.profileSummaryCard}>
              <Text style={styles.profileSummaryLabel}>Shopping For</Text>
              <Text style={styles.profileSummaryTitle}>{activeShopperName}</Text>
              <Text style={styles.profileSummaryText}>
                {isHouseholdProfileActive
                  ? `${selectedProfile.label} household profile is active.`
                  : `${selectedProfile.label} is active.`}
              </Text>
            </View>

            <View style={styles.profileSummaryCard}>
              <Text style={styles.profileSummaryLabel}>Diet Profile</Text>
              <Text style={styles.profileSummaryTitle}>{selectedProfile.label}</Text>
            </View>
            <View style={styles.statRow}>
              {isIngredientOcrEnabled && ocrQuotaSnapshot ? (
                <View style={styles.statCard}>
                  <Text style={styles.profileSummaryLabel}>Ingredient Scans</Text>
                  <Text style={styles.statTitle}>
                    {ocrQuotaSnapshot.isUnlimited
                      ? 'Unlimited'
                      : `${ocrQuotaSnapshot.remaining} left`}
                  </Text>
                </View>
              ) : null}
              <Pressable
                onPress={() => navigation.navigate('Premium')}
                style={[styles.statCard, styles.statCardPressable]}
              >
                <Text style={styles.profileSummaryLabel}>Plan</Text>
                <Text style={styles.statTitle}>
                  {premiumEntitlement.isPremium ? 'Premium' : 'Basic'}
                </Text>
              </Pressable>
            </View>

            {replaceFirstCandidate ? (
              <View style={styles.profileSummaryCard}>
                <Text style={styles.profileSummaryLabel}>Replace first</Text>
                <Text style={styles.profileSummaryTitle}>{replaceFirstCandidate.name}</Text>
                <Text style={styles.profileSummaryText}>{replaceFirstCandidate.reason}</Text>
              </View>
            ) : null}

            {comparisonSummary ? (
              <View style={styles.profileSummaryCard}>
                <Text style={styles.profileSummaryLabel}>Trip in progress</Text>
                <Text style={styles.profileSummaryTitle}>Keep this trip moving</Text>
                <Text style={styles.profileSummaryText}>{comparisonSummary}</Text>
              </View>
            ) : recentTripSummary ? (
              <View style={styles.profileSummaryCard}>
                <Text style={styles.profileSummaryLabel}>Last trip</Text>
                <Text style={styles.profileSummaryTitle}>Recent recap</Text>
                <Text style={styles.profileSummaryText}>{recentTripSummary}</Text>
              </View>
            ) : null}

            <UsualBuysCard
              items={usualBuys}
              onOpenHistory={() => openMainRoute('History')}
              onOpenSearch={() => openMainRoute('Search')}
            />
            {shouldInsertHomeAdAfterUsualBuys ? (
              <NativeSponsoredCard onLoaded={handleHomeAdLoaded} surface="home" />
            ) : null}

            {isHistoryEnabled && historyInsights.length > 0 ? (
              <HistoryInsightsCard colors={colors} insights={historyInsights} />
            ) : null}
            {shouldInsertHomeAdAfterInsights ? (
              <NativeSponsoredCard onLoaded={handleHomeAdLoaded} surface="home" />
            ) : null}

            {isHistoryEnabled && historyNotifications.length > 0 ? (
              <HistoryNotificationsCard notifications={historyNotifications} />
            ) : null}
            {shouldInsertHomeAdAfterNotifications ? (
              <NativeSponsoredCard onLoaded={handleHomeAdLoaded} surface="home" />
            ) : null}

            {productChangeAlerts.length > 0 ? (
              <ProductChangeAlertsCard
                alerts={productChangeAlerts}
                onOpenAlert={() => openMainRoute('History')}
              />
            ) : null}
            {recentChanges.length > 0 ? (
              <ProductTimelineCard entries={recentChanges} title="Recent changes" />
            ) : null}
            {shouldInsertHomeAdAfterAlerts ? (
              <NativeSponsoredCard onLoaded={handleHomeAdLoaded} surface="home" />
            ) : null}

            {premiumEntitlement.isPremium && (favoriteCount > 0 || comparisonSummary) ? (
              <View style={styles.profileSummaryCard}>
                <Text style={styles.profileSummaryLabel}>Saved products</Text>
                <Text style={styles.profileSummaryTitle}>
                  {favoriteCount > 0
                    ? `${favoriteCount} favorite${favoriteCount === 1 ? '' : 's'} saved`
                    : 'Comparison ready'}
                </Text>
                {comparisonSummary ? (
                  <Text style={styles.profileSummaryText}>{comparisonSummary}</Text>
                ) : null}
              </View>
            ) : null}

            {shelfItemCount > 0 ? (
              <View style={styles.profileSummaryCard}>
                <Text style={styles.profileSummaryLabel}>Shelf Mode</Text>
                <Text style={styles.profileSummaryTitle}>
                  {shelfItemCount} product{shelfItemCount === 1 ? '' : 's'} ready to compare
                </Text>
                {comparisonSummary ? (
                  <Text style={styles.profileSummaryText}>{comparisonSummary}</Text>
                ) : null}
              </View>
            ) : null}
          </ScreenReveal>
        </ScrollView>
      </View>
      <DietProfileModal
        isFirstLaunch={isFirstLaunchProfileFlow}
        onApply={() => void handleApplyProfile()}
        onSelect={setDraftProfileId}
        selectedProfileId={draftProfileId}
        visible={isProfileModalVisible}
      />
    </SafeAreaView>
  );
}

const createStyles = (
  colors: ReturnType<typeof useAppTheme>['colors'],
  typography: ReturnType<typeof useAppTheme>['typography']
) =>
  StyleSheet.create({
  announcementCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: 8,
    padding: 18,
  },
  announcementLabel: {
    color: colors.primary,
    fontFamily: typography.accentFontFamily,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  announcementText: {
    color: colors.textMuted,
    fontFamily: typography.bodyFontFamily,
    fontSize: 14,
    lineHeight: 21,
  },
  announcementTitle: {
    color: colors.text,
    fontFamily: typography.headingFontFamily,
    fontSize: 18,
    fontWeight: '700',
  },
  backgroundGlow: {
    backgroundColor: colors.primaryMuted,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    height: 240,
    left: -24,
    opacity: 0.55,
    position: 'absolute',
    right: -24,
    top: -32,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  content: {
    gap: 24,
  },
  heroBlock: {
    gap: 14,
    paddingTop: 12,
  },
  profileSummaryCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: 8,
    padding: 18,
  },
  profileSummaryLabel: {
    color: colors.primary,
    fontFamily: typography.accentFontFamily,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  profileSummaryText: {
    color: colors.textMuted,
    fontFamily: typography.bodyFontFamily,
    fontSize: 14,
    lineHeight: 21,
  },
  profileSummaryTitle: {
    color: colors.text,
    fontFamily: typography.headingFontFamily,
    fontSize: 20,
    fontWeight: '700',
  },
  statCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    flex: 1,
    gap: 8,
    padding: 18,
  },
  statCardPressable: {
    justifyContent: 'center',
  },
  statRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statTitle: {
    color: colors.text,
    fontFamily: typography.headingFontFamily,
    fontSize: 18,
    fontWeight: '700',
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: typography.bodyFontFamily,
    fontSize: 17,
    lineHeight: 25,
  },
  title: {
    color: colors.text,
    fontFamily: typography.displayFontFamily,
    fontSize: 36,
    fontWeight: '800',
    lineHeight: 42,
  },
});
