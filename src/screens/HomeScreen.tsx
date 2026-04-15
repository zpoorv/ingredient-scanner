import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import DietProfileModal from '../components/DietProfileModal';
import FeatureTipCard from '../components/FeatureTipCard';
import PrimaryButton from '../components/PrimaryButton';
import QuestActionCard from '../components/QuestActionCard';
import ScreenLoadingView from '../components/ScreenLoadingView';
import ScreenReveal from '../components/ScreenReveal';
import { useI18n } from '../components/AppLanguageProvider';
import { useAppTheme } from '../components/AppThemeProvider';
import { APP_NAME } from '../constants/branding';
import {
  DEFAULT_DIET_PROFILE_ID,
  type DietProfileId,
} from '../constants/dietProfiles';
import { createDefaultPremiumEntitlement } from '../models/premium';
import type { FeatureQuotaSnapshot } from '../services/featureUsageStorage';
import {
  loadDietProfileIntroSeen,
  markDietProfileIntroSeen,
  saveDietProfile,
} from '../services/dietProfileStorage';
import { loadFeatureQuotaSnapshot } from '../services/featureUsageStorage';
import {
  loadSessionEffectiveShoppingProfile,
  loadSessionPremiumEntitlement,
  loadSessionUserProfile,
} from '../services/sessionDataService';
import { measurePerformanceTrace } from '../services/performanceTrace';
import { useFeatureTutorial } from '../utils/useFeatureTutorial';
import type { RootStackParamList } from '../navigation/types';

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const { t } = useI18n();
  const { colors, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const [effectiveProfileId, setEffectiveProfileId] =
    useState<DietProfileId>(DEFAULT_DIET_PROFILE_ID);
  const [activeShopperName, setActiveShopperName] = useState('You');
  const [isHouseholdProfileActive, setIsHouseholdProfileActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFirstLaunchProfileFlow, setIsFirstLaunchProfileFlow] = useState(false);
  const [ocrQuotaSnapshot, setOcrQuotaSnapshot] = useState<FeatureQuotaSnapshot | null>(null);
  const [profileName, setProfileName] = useState(APP_NAME);
  const [premiumLabel, setPremiumLabel] = useState('Basic');
  const [draftProfileId, setDraftProfileId] = useState<DietProfileId>(DEFAULT_DIET_PROFILE_ID);
  const homeTutorial = useFeatureTutorial('home');

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      void Promise.all([
        loadSessionPremiumEntitlement('cache-first'),
        loadSessionUserProfile('stale-while-revalidate'),
        loadSessionEffectiveShoppingProfile('stale-while-revalidate'),
        loadDietProfileIntroSeen(),
      ])
        .then(async ([entitlement, profile, effectiveProfile, hasSeenDietIntro]) => {
          if (!isMounted) {
            return;
          }

          const nextEntitlement = entitlement ?? createDefaultPremiumEntitlement();
          const quotaSnapshot = await loadFeatureQuotaSnapshot('ingredient-ocr', nextEntitlement);

          if (!isMounted) {
            return;
          }

          setActiveShopperName(effectiveProfile.name);
          setDraftProfileId(profile?.dietProfileId ?? DEFAULT_DIET_PROFILE_ID);
          setEffectiveProfileId(effectiveProfile.dietProfileId);
          setIsFirstLaunchProfileFlow(!hasSeenDietIntro);
          setIsHouseholdProfileActive(effectiveProfile.usesHouseholdProfile);
          setOcrQuotaSnapshot(quotaSnapshot);
          setPremiumLabel(nextEntitlement.isPremium ? 'Premium' : 'Basic');
          setProfileName(profile?.name?.trim() || profile?.email || APP_NAME);
          measurePerformanceTrace('app-start', 'home-first-paint');
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

  if (isLoading) {
    return (
      <ScreenLoadingView
        subtitle="Preparing your shopper dashboard and the fastest way back into scanning..."
        title={t('Loading {appName}', { appName: APP_NAME })}
      />
    );
  }

  const ocrLabel = ocrQuotaSnapshot?.isUnlimited
    ? t('Unlimited OCR')
    : ocrQuotaSnapshot && ocrQuotaSnapshot.remaining !== null
      ? t('{count} OCR left today', { count: ocrQuotaSnapshot.remaining })
      : t('OCR ready');

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ScreenReveal style={styles.screen}>
          <View style={styles.content}>
          <View style={styles.heroCard}>
            <Text style={styles.eyebrow}>{t('Dashboard')}</Text>
            <Text style={styles.heroTitle}>{profileName}</Text>
            <Text style={styles.heroBody}>
              {isHouseholdProfileActive
                ? t('Shopping for {name} right now.', { name: activeShopperName })
                : t('Shopping as {name}.', { name: activeShopperName })}
            </Text>
            <View style={styles.heroMetaRow}>
              <Pressable
                onPress={() => navigation.navigate('HouseholdSettings')}
                style={styles.metaPill}
              >
                <Text style={styles.metaPillText}>{activeShopperName}</Text>
              </Pressable>
              <View style={styles.metaPill}>
                <Text style={styles.metaPillText}>{premiumLabel}</Text>
              </View>
              <View style={styles.metaPill}>
                <Text style={styles.metaPillText}>{ocrLabel}</Text>
              </View>
            </View>
          </View>

          <FeatureTipCard
            body="Home is your launchpad: scan, search, and open Progress, Alerts, or Trips from clear entry cards."
            icon="home-outline"
            onDismiss={homeTutorial.dismiss}
            title="Use Home as the dashboard"
            visible={homeTutorial.isVisible}
          />

          <View style={styles.scanCard}>
            <Text style={styles.scanLabel}>{t('Ready to scan')}</Text>
            <Text style={styles.scanTitle}>{t('Start with one product')}</Text>
            <Text style={styles.scanBody}>
              {t('Scan lives on its own page now, so Home stays fast and focused.')}
            </Text>
            <PrimaryButton
              label="Open scanner"
              onPress={() => navigation.navigate('Scanner', { profileId: effectiveProfileId })}
              tutorialTargetId="home-open-scanner"
            />
          </View>

          <QuestActionCard
            badge="Progress"
            icon="trophy-outline"
            onPress={() => navigation.navigate('Progress')}
            subtitle="See your weekly momentum, streak, goal, and recent badges."
            tutorialTargetId="home-open-progress"
            title="Open progress"
          />
          <QuestActionCard
            badge="Alerts"
            icon="alert-circle-outline"
            onPress={() => navigation.navigate('Alerts')}
            subtitle="Check changed products, watch-outs, and replace-first nudges."
            tutorialTargetId="home-open-alerts"
            title="Review alerts"
          />
          <QuestActionCard
            badge="Trips"
            icon="bag-handle-outline"
            onPress={() => navigation.navigate('Trips')}
            subtitle="Continue Shelf Mode and review recent comparison trip recaps."
            tutorialTargetId="home-open-trips"
            title="Open trips"
          />
          <QuestActionCard
            badge="Search"
            icon="search-outline"
            onPress={() => navigation.navigate('Search')}
            subtitle="Search products directly without digging through Home cards."
            title="Search products"
          />
          </View>
        </ScreenReveal>
      </ScrollView>

      <DietProfileModal
        isFirstLaunch={isFirstLaunchProfileFlow}
        onApply={() => {
          setIsFirstLaunchProfileFlow(false);
          void Promise.all([saveDietProfile(draftProfileId), markDietProfileIntroSeen()]);
        }}
        onSelect={setDraftProfileId}
        selectedProfileId={draftProfileId}
        visible={isFirstLaunchProfileFlow}
      />
    </SafeAreaView>
  );
}

const createStyles = (
  colors: ReturnType<typeof useAppTheme>['colors'],
  typography: ReturnType<typeof useAppTheme>['typography']
) =>
  StyleSheet.create({
    content: {
      gap: 16,
      padding: 24,
    },
    eyebrow: {
      color: colors.primary,
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    heroBody: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 15,
      lineHeight: 22,
    },
    heroCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 28,
      borderWidth: 1,
      gap: 8,
      padding: 22,
    },
    heroMetaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      paddingTop: 6,
    },
    heroTitle: {
      color: colors.text,
      fontFamily: typography.displayFontFamily,
      fontSize: 30,
      fontWeight: '800',
      lineHeight: 36,
    },
    metaPill: {
      backgroundColor: colors.primaryMuted,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    metaPillText: {
      color: colors.primary,
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '800',
    },
    safeArea: {
      backgroundColor: colors.background,
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 132,
    },
    scanBody: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 14,
      lineHeight: 21,
    },
    scanCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 26,
      borderWidth: 1,
      gap: 10,
      padding: 20,
    },
    scanLabel: {
      color: colors.primary,
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    scanTitle: {
      color: colors.text,
      fontFamily: typography.headingFontFamily,
      fontSize: 22,
      fontWeight: '800',
    },
    screen: {
      flex: 1,
    },
  });
