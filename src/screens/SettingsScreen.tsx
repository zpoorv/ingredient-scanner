import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import DietProfileModal from '../components/DietProfileModal';
import OptionPickerModal from '../components/OptionPickerModal';
import ScreenLoadingView from '../components/ScreenLoadingView';
import SettingsRow from '../components/SettingsRow';
import SettingsSection from '../components/SettingsSection';
import { useAppTheme } from '../components/AppThemeProvider';
import { APP_LOOK_DEFINITIONS, getAppLookDefinition } from '../constants/appLooks';
import { APP_NAME } from '../constants/branding';
import {
  DEFAULT_DIET_PROFILE_ID,
  DIET_PROFILE_DEFINITIONS,
  type DietProfileId,
} from '../constants/dietProfiles';
import { getShareCardStyleDefinition, SHARE_CARD_STYLE_DEFINITIONS } from '../constants/shareCardStyles';
import type { AppLookId, AppearanceMode } from '../models/preferences';
import type { RootStackParamList } from '../navigation/types';
import type { ShareCardStyleId } from '../models/shareCardStyle';
import { deleteCurrentAccount } from '../services/accountDeletionService';
import { AuthServiceError } from '../services/authHelpers';
import { logoutAuth } from '../services/authService';
import {
  saveDietProfile,
  syncDietProfileForCurrentUser,
} from '../services/dietProfileStorage';
import { loadCurrentPremiumEntitlement } from '../services/premiumEntitlementService';
import { saveShareCardStyleId, syncShareCardStyleForCurrentUser } from '../services/shareCardPreferenceStorage';
import {
  loadUserProfile,
  saveCurrentUserPreferences,
} from '../services/userProfileService';
import { getPremiumSession, subscribePremiumSession } from '../store';

type SettingsScreenProps = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export default function SettingsScreen({ navigation }: SettingsScreenProps) {
  const { appLookId, appearanceMode, colors, setAppLookId, setAppearanceMode, typography } =
    useAppTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const [dietProfileId, setDietProfileId] = useState<DietProfileId>(
    DEFAULT_DIET_PROFILE_ID
  );
  const [draftAppLookId, setDraftAppLookId] = useState<AppLookId>(appLookId);
  const [draftDietProfileId, setDraftDietProfileId] = useState<DietProfileId>(
    DEFAULT_DIET_PROFILE_ID
  );
  const [draftShareCardStyleId, setDraftShareCardStyleId] =
    useState<ShareCardStyleId>('classic');
  const [historyInsightsEnabled, setHistoryInsightsEnabled] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isAppLookModalVisible, setIsAppLookModalVisible] = useState(false);
  const [isDietProfileVisible, setIsDietProfileVisible] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isShareCardStyleModalVisible, setIsShareCardStyleModalVisible] =
    useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [roleLabel, setRoleLabel] = useState('User');
  const [premiumEntitlement, setPremiumEntitlement] = useState(getPremiumSession());
  const [premiumLabel, setPremiumLabel] = useState(
    getPremiumSession().isPremium ? 'Premium' : 'Basic'
  );
  const [shareCardStyleId, setShareCardStyleId] =
    useState<ShareCardStyleId>('classic');

  const selectedAppLook = getAppLookDefinition(appLookId);
  const selectedShareCardStyle = getShareCardStyleDefinition(shareCardStyleId);

  const appLookOptions = APP_LOOK_DEFINITIONS.map((definition) => ({
    description: definition.description,
    disabled: definition.isPremiumOnly && !premiumEntitlement.isPremium,
    id: definition.id,
    label: definition.label,
  }));
  const shareCardStyleOptions = SHARE_CARD_STYLE_DEFINITIONS.map((definition) => ({
    description: definition.description,
    disabled: definition.isPremiumOnly && !premiumEntitlement.isPremium,
    id: definition.id,
    label: definition.label,
  }));

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const unsubscribePremium = subscribePremiumSession((entitlement) => {
        if (isMounted) {
          setPremiumEntitlement(entitlement);
          setPremiumLabel(entitlement.isPremium ? 'Premium' : 'Basic');
        }
      });

      const loadSettings = async () => {
        if (!hasLoadedOnce) {
          setIsLoadingSettings(true);
        }

        try {
          const [profile, savedDietProfileId, savedShareCardStyleId, entitlement] =
            await Promise.all([
              loadUserProfile(),
              syncDietProfileForCurrentUser(),
              syncShareCardStyleForCurrentUser(),
              loadCurrentPremiumEntitlement(),
            ]);

          if (!isMounted) {
            return;
          }

          setDietProfileId(savedDietProfileId);
          setDraftDietProfileId(savedDietProfileId);
          setDraftAppLookId(profile?.appLookId ?? appLookId);
          setDraftShareCardStyleId(savedShareCardStyleId);
          setHistoryInsightsEnabled(profile?.historyInsightsEnabled ?? true);
          setProfileEmail(profile?.email ?? '');
          setProfileName(profile?.name ?? '');
          setPremiumLabel(entitlement.isPremium ? 'Premium' : 'Basic');
          setRoleLabel(
            profile?.role === 'admin'
              ? 'Admin'
              : profile?.role === 'premium'
                ? 'Premium'
                : 'User'
          );
          setShareCardStyleId(savedShareCardStyleId);
          setHasLoadedOnce(true);
        } finally {
          if (isMounted) {
            setIsLoadingSettings(false);
          }
        }
      };

      void loadSettings();

      return () => {
        isMounted = false;
        unsubscribePremium();
      };
    }, [appLookId, hasLoadedOnce])
  );

  if (isLoadingSettings && !hasLoadedOnce) {
    return (
      <ScreenLoadingView
        subtitle="Refreshing your account, preferences, and premium tools..."
        title="Loading settings"
      />
    );
  }

  const selectedProfile =
    DIET_PROFILE_DEFINITIONS.find((profile) => profile.id === dietProfileId) ||
    DIET_PROFILE_DEFINITIONS[0];

  const handleDeleteAccountPress = async () => {
    setIsDeletingAccount(true);

    try {
      await deleteCurrentAccount();
    } catch (error) {
      Alert.alert(
        'Delete account failed',
        error instanceof AuthServiceError
          ? error.message
          : 'We could not delete your account right now.'
      );
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account?',
      'This removes your account, local history, and saved profile settings from this device.',
      [
        { style: 'cancel', text: 'Cancel' },
        {
          style: 'destructive',
          text: 'Delete',
          onPress: () => {
            void handleDeleteAccountPress();
          },
        },
      ]
    );
  };

  const handleApplyDietProfile = async () => {
    await saveDietProfile(draftDietProfileId);
    setDietProfileId(draftDietProfileId);
    setIsDietProfileVisible(false);
  };

  const handleApplyAppLook = async () => {
    await setAppLookId(draftAppLookId);
    setIsAppLookModalVisible(false);
  };

  const handleApplyShareCardStyle = async () => {
    await saveShareCardStyleId(draftShareCardStyleId);
    setShareCardStyleId(draftShareCardStyleId);
    setIsShareCardStyleModalVisible(false);
  };

  const handleToggleHistoryInsights = async () => {
    if (!premiumEntitlement.isPremium) {
      navigation.navigate('Premium', { featureId: 'history-personalization' });
      return;
    }

    const nextValue = !historyInsightsEnabled;
    setHistoryInsightsEnabled(nextValue);
    await saveCurrentUserPreferences({ historyInsightsEnabled: nextValue });
  };

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Settings</Text>
          <Text style={styles.title}>Control your {APP_NAME} account and preferences</Text>
          <Text style={styles.subtitle}>
            Update your profile, choose a theme, manage diet scoring, and open support pages.
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>{profileName || profileEmail || APP_NAME}</Text>
          <Text style={styles.summaryText}>{profileEmail || 'Signed in account'}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{roleLabel}</Text>
          </View>
        </View>

        <SettingsSection
          description="Basic account details, history access, and safe account actions."
          title="Account"
        >
          <SettingsRow
            onPress={() => navigation.navigate('ProfileDetails')}
            subtitle="Edit your name."
            title="Profile"
            value="Open"
          />
          <SettingsRow
            onPress={() => navigation.navigate('History')}
            subtitle="Review and manage your saved scans."
            title="History"
            value="Open"
          />
          <SettingsRow
            onPress={() => void logoutAuth()}
            subtitle="Sign out of this device."
            title="Log Out"
          />
          <SettingsRow
            danger
            disabled={isDeletingAccount}
            onPress={handleDeleteAccount}
            subtitle="Delete this account and remove local app data."
            title="Delete Account"
            value={isDeletingAccount ? 'Working...' : undefined}
          />
        </SettingsSection>

        <SettingsSection
          description="Personalize how product analysis is shown for you."
          title="Preferences"
        >
          <SettingsRow
            onPress={() => navigation.navigate('Premium')}
            subtitle="Basic includes limited OCR and sharing. Premium removes ads and unlocks extra styles."
            title="Premium"
            value={premiumLabel}
          />
          <View style={styles.themeRow}>
            {(['light', 'dark'] as AppearanceMode[]).map((mode) => {
              const isSelected = appearanceMode === mode;

              return (
                <Pressable
                  key={mode}
                  onPress={() => void setAppearanceMode(mode)}
                  style={[
                    styles.themeChip,
                    isSelected && styles.themeChipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.themeChipText,
                      isSelected && styles.themeChipTextSelected,
                    ]}
                  >
                    {mode === 'light' ? 'Light Mode' : 'Dark Mode'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <SettingsRow
            onPress={() => setIsAppLookModalVisible(true)}
            subtitle={selectedAppLook.description}
            title="App Look"
            value={selectedAppLook.shortLabel}
          />
          <SettingsRow
            onPress={() => setIsDietProfileVisible(true)}
            subtitle={selectedProfile.description}
            title="Diet Profile"
            value={selectedProfile.shortLabel}
          />
          <SettingsRow
            onPress={() => setIsShareCardStyleModalVisible(true)}
            subtitle={selectedShareCardStyle.description}
            title="Share Card Style"
            value={selectedShareCardStyle.label}
          />
          <SettingsRow
            onPress={() => void handleToggleHistoryInsights()}
            subtitle={
              premiumEntitlement.isPremium
                ? 'Show premium weekly scan patterns and healthier streak insights.'
                : 'Premium unlocks history insights like weekly harmful-product counts.'
            }
            title="History Insights"
            value={premiumEntitlement.isPremium ? (historyInsightsEnabled ? 'On' : 'Off') : 'Premium'}
          />
        </SettingsSection>

        <SettingsSection
          description="Helpful pages you will need while polishing the product for release."
          title="Support"
        >
          <SettingsRow
            onPress={() => navigation.navigate('Help')}
            subtitle="FAQs and what the app currently supports."
            title="Help"
          />
          <SettingsRow
            onPress={() => navigation.navigate('PrivacyPolicy')}
            subtitle="Plain-language privacy summary."
            title="Privacy Policy"
          />
          <SettingsRow
            onPress={() => navigation.navigate('About')}
            subtitle="Version, data sources, and release notes."
            title="About"
          />
          <SettingsRow
            onPress={() => navigation.navigate('Feedback')}
            subtitle="Send product feedback by email."
            title="Send Feedback"
          />
        </SettingsSection>
      </ScrollView>

      <DietProfileModal
        isFirstLaunch={false}
        onApply={() => void handleApplyDietProfile()}
        onSelect={setDraftDietProfileId}
        selectedProfileId={draftDietProfileId}
        visible={isDietProfileVisible}
      />
      <OptionPickerModal
        colors={colors}
        onApply={() => void handleApplyAppLook()}
        onRequestClose={() => setIsAppLookModalVisible(false)}
        onSelect={setDraftAppLookId}
        options={appLookOptions}
        selectedId={draftAppLookId}
        title="Choose app look"
        visible={isAppLookModalVisible}
      />
      <OptionPickerModal
        colors={colors}
        onApply={() => void handleApplyShareCardStyle()}
        onRequestClose={() => setIsShareCardStyleModalVisible(false)}
        onSelect={setDraftShareCardStyleId}
        options={shareCardStyleOptions}
        selectedId={draftShareCardStyleId}
        title="Choose share-card style"
        visible={isShareCardStyleModalVisible}
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
      gap: 24,
      padding: 24,
    },
    eyebrow: {
      color: colors.primary,
      fontFamily: typography.accentFontFamily,
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    hero: {
      gap: 10,
    },
    roleBadge: {
      alignSelf: 'flex-start',
      backgroundColor: colors.primaryMuted,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    roleBadgeText: {
      color: colors.primary,
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '800',
    },
    safeArea: {
      backgroundColor: colors.background,
      flex: 1,
    },
    subtitle: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 15,
      lineHeight: 22,
    },
    summaryCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 24,
      borderWidth: 1,
      gap: 8,
      padding: 20,
    },
    summaryText: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 14,
    },
    summaryTitle: {
      color: colors.text,
      fontFamily: typography.displayFontFamily,
      fontSize: 24,
      fontWeight: '800',
      lineHeight: 30,
    },
    themeChip: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: 999,
      borderWidth: 1,
      flex: 1,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    themeChipSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    themeChipText: {
      color: colors.text,
      fontFamily: typography.headingFontFamily,
      fontSize: 14,
      fontWeight: '700',
      textAlign: 'center',
    },
    themeChipTextSelected: {
      color: colors.surface,
    },
    themeRow: {
      flexDirection: 'row',
      gap: 12,
      padding: 18,
    },
    title: {
      color: colors.text,
      fontFamily: typography.displayFontFamily,
      fontSize: 30,
      fontWeight: '800',
      lineHeight: 36,
    },
  });
