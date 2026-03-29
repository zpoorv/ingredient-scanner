import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '../components/AppThemeProvider';
import DietProfileModal from '../components/DietProfileModal';
import HistoryInsightsCard from '../components/HistoryInsightsCard';
import PrimaryButton from '../components/PrimaryButton';
import {
  DEFAULT_DIET_PROFILE_ID,
  DIET_PROFILE_DEFINITIONS,
  type DietProfileId,
} from '../constants/dietProfiles';
import type { PremiumEntitlement } from '../models/premium';
import type { RootStackParamList } from '../navigation/types';
import {
  loadDietProfileIntroSeen,
  markDietProfileIntroSeen,
  saveDietProfile,
  syncDietProfileForCurrentUser,
} from '../services/dietProfileStorage';
import { loadAdminAppConfig } from '../services/adminAppConfigService';
import {
  loadFeatureQuotaSnapshot,
  type FeatureQuotaSnapshot,
} from '../services/featureUsageStorage';
import {
  loadCurrentPremiumEntitlement,
} from '../services/premiumEntitlementService';
import { loadScanHistory } from '../services/scanHistoryStorage';
import { loadUserProfile } from '../services/userProfileService';
import { getPremiumSession, subscribeAuthSession, subscribePremiumSession } from '../store';
import { buildHistoryInsights, type HistoryInsight } from '../utils/historyPersonalization';

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
  const [historyInsightsEnabled, setHistoryInsightsEnabled] = useState(true);
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

  const selectedProfile =
    DIET_PROFILE_DEFINITIONS.find((profile) => profile.id === selectedProfileId) ||
    DIET_PROFILE_DEFINITIONS[0];

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          accessibilityLabel="Open settings"
          onPress={() => navigation.navigate('Settings')}
          style={({ pressed }) => [
            styles.headerProfileButton,
            pressed && styles.headerProfileButtonPressed,
          ]}
        >
          <Text style={styles.headerProfileButtonText}>Settings</Text>
        </Pressable>
      ),
    });
  }, [navigation, styles, selectedProfileId]);

  useEffect(() => {
    let isMounted = true;

    const refreshPremiumState = async () => {
      const entitlement = await loadCurrentPremiumEntitlement();
      const [quotaSnapshot, profile, historyEntries] = await Promise.all([
        loadFeatureQuotaSnapshot('ingredient-ocr', entitlement),
        loadUserProfile(),
        loadScanHistory(),
      ]);

      if (!isMounted) {
        return;
      }

      setPremiumEntitlement(entitlement);
      setOcrQuotaSnapshot(quotaSnapshot);
      setHistoryInsightsEnabled(profile?.historyInsightsEnabled ?? true);
      setHistoryInsights(
        entitlement.isPremium && (profile?.historyInsightsEnabled ?? true)
          ? buildHistoryInsights(historyEntries)
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

    void refreshPremiumState();

    return () => {
      isMounted = false;
      unsubscribe();
      unsubscribePremium();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const restoreProfile = async () => {
      const [savedProfileId, hasSeenIntro] = await Promise.all([
        syncDietProfileForCurrentUser(),
        loadDietProfileIntroSeen(),
      ]);

      if (isMounted) {
        setSelectedProfileId(savedProfileId);
        setDraftProfileId(savedProfileId);
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

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.backgroundGlow} />

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom + 28, 44) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <View style={styles.heroBlock}>
              <Text style={styles.title}>Scan food fast</Text>
              <Text style={styles.subtitle}>Barcode, ingredients, and a clear score.</Text>
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
              <Text style={styles.profileSummaryLabel}>Diet Profile</Text>
              <Text style={styles.profileSummaryTitle}>{selectedProfile.label}</Text>
            </View>

            <View style={styles.premiumCard}>
              <View style={styles.premiumCardHeader}>
                <View>
                  <Text style={styles.premiumCardLabel}>Premium</Text>
                  <Text style={styles.premiumCardTitle}>
                    {premiumEntitlement.isPremium
                      ? 'Premium is active on this account'
                      : 'Unlock premium tools'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.premiumBadge,
                    premiumEntitlement.isPremium
                      ? styles.premiumBadgeActive
                      : styles.premiumBadgeInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.premiumBadgeText,
                      premiumEntitlement.isPremium
                        ? styles.premiumBadgeTextActive
                        : styles.premiumBadgeTextInactive,
                    ]}
                  >
                    {premiumEntitlement.isPremium ? 'Premium' : 'Basic'}
                  </Text>
                </View>
              </View>
              <Text style={styles.premiumCardText}>
                {premiumEntitlement.isPremium
                  ? 'Unlimited OCR, extra share styles, and insights are on.'
                  : 'Basic includes daily limits for OCR and sharing.'}
              </Text>
              <Pressable
                onPress={() => navigation.navigate('Premium')}
                style={styles.premiumAction}
              >
                <Text style={styles.premiumActionText}>
                  {premiumEntitlement.isPremium ? 'Manage Premium' : 'Compare Plans'}
                </Text>
              </Pressable>
            </View>

            {isIngredientOcrEnabled && ocrQuotaSnapshot ? (
              <View style={styles.profileSummaryCard}>
                <Text style={styles.profileSummaryLabel}>OCR</Text>
                <Text style={styles.profileSummaryTitle}>
                  {ocrQuotaSnapshot.isUnlimited
                    ? 'Unlimited scans today'
                    : `${ocrQuotaSnapshot.remaining} scan${ocrQuotaSnapshot.remaining === 1 ? '' : 's'} left today`}
                </Text>
              </View>
            ) : null}

            {premiumEntitlement.isPremium &&
            historyInsightsEnabled &&
            historyInsights.length > 0 ? (
              <HistoryInsightsCard colors={colors} insights={historyInsights} />
            ) : null}

            <View style={styles.footerActions}>
              <PrimaryButton
                label="Open Scanner"
                onPress={() =>
                  navigation.navigate('Scanner', { profileId: selectedProfileId })
                }
              />
              {isIngredientOcrEnabled ? (
                <Pressable
                  onPress={() =>
                    navigation.navigate('IngredientOcr', {
                      profileId: selectedProfileId,
                    })
                  }
                  style={styles.secondaryAction}
                >
                  <Text style={styles.secondaryActionText}>
                    {ocrQuotaSnapshot?.isUnlimited
                      ? 'Scan Ingredient Label'
                      : `Scan Ingredient Label${
                          ocrQuotaSnapshot ? ` (${ocrQuotaSnapshot.remaining} left)` : ''
                        }`}
                  </Text>
                </Pressable>
              ) : null}
              {isHistoryEnabled ? (
                <Pressable
                  onPress={() => navigation.navigate('History')}
                  style={styles.secondaryAction}
                >
                  <Text style={styles.secondaryActionText}>View Scan History</Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => navigation.navigate('Settings')}
                style={styles.secondaryAction}
              >
                <Text style={styles.secondaryActionText}>Open Settings</Text>
              </Pressable>
            </View>
          </View>
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
  footerActions: {
    gap: 12,
    marginTop: 4,
  },
  heroBlock: {
    gap: 14,
    paddingTop: 8,
  },
  headerProfileButton: {
    backgroundColor: colors.primaryMuted,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerProfileButtonPressed: {
    opacity: 0.86,
  },
  headerProfileButtonText: {
    color: colors.primary,
    fontFamily: typography.accentFontFamily,
    fontSize: 12,
    fontWeight: '800',
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
  premiumAction: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryMuted,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  premiumActionText: {
    color: colors.primary,
    fontFamily: typography.accentFontFamily,
    fontSize: 13,
    fontWeight: '800',
  },
  premiumBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  premiumBadgeActive: {
    backgroundColor: colors.successMuted,
  },
  premiumBadgeInactive: {
    backgroundColor: colors.warningMuted,
  },
  premiumBadgeText: {
    fontFamily: typography.accentFontFamily,
    fontSize: 12,
    fontWeight: '800',
  },
  premiumBadgeTextActive: {
    color: colors.success,
  },
  premiumBadgeTextInactive: {
    color: colors.warning,
  },
  premiumCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: 10,
    padding: 18,
  },
  premiumCardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  premiumCardLabel: {
    color: colors.primary,
    fontFamily: typography.accentFontFamily,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  premiumCardText: {
    color: colors.textMuted,
    fontFamily: typography.bodyFontFamily,
    fontSize: 14,
    lineHeight: 21,
  },
  premiumCardTitle: {
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
  secondaryAction: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 50,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  secondaryActionText: {
    color: colors.primary,
    fontFamily: typography.accentFontFamily,
    fontSize: 15,
    fontWeight: '700',
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
