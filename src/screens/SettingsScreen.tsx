import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import BottomMenuBar from '../components/BottomMenuBar';
import DietProfileModal from '../components/DietProfileModal';
import HouseholdProfileEditorModal from '../components/HouseholdProfileEditorModal';
import HouseholdProfilesModal from '../components/HouseholdProfilesModal';
import OptionPickerModal from '../components/OptionPickerModal';
import RestrictionPickerModal from '../components/RestrictionPickerModal';
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
import { RESTRICTION_DEFINITIONS } from '../constants/restrictions';
import {
  getShareCardStyleDefinition,
  SHARE_CARD_STYLE_DEFINITIONS,
} from '../constants/shareCardStyles';
import type { AppLookId, AppearanceMode } from '../models/preferences';
import type { HouseholdProfile } from '../models/householdProfile';
import type { HistoryNotificationPermissionState } from '../models/historyNotification';
import type { RestrictionId, RestrictionSeverity } from '../models/restrictions';
import type { HistoryNotificationCadence } from '../models/userProfile';
import type { RootStackParamList } from '../navigation/types';
import type { ShareCardStyleId } from '../models/shareCardStyle';
import { deleteCurrentAccount } from '../services/accountDeletionService';
import { AuthServiceError } from '../services/authHelpers';
import { logoutAuth } from '../services/authService';
import {
  cancelCurrentUserHistoryNotifications,
  getHistoryNotificationPermissionState,
  getHistoryNotificationStatusLabel,
  openHistoryNotificationSettings,
  requestHistoryNotificationPermission,
  syncHistoryNotificationsForCurrentUser,
} from '../services/historyNotificationService';
import {
  saveDietProfile,
  syncDietProfileForCurrentUser,
} from '../services/dietProfileStorage';
import {
  deleteHouseholdProfile,
  loadHouseholdProfileState,
  saveHouseholdProfile,
  setActiveHouseholdProfile,
} from '../services/householdProfilesService';
import { loadCurrentPremiumEntitlement } from '../services/premiumEntitlementService';
import { saveShareCardStyleId, syncShareCardStyleForCurrentUser } from '../services/shareCardPreferenceStorage';
import {
  loadUserProfile,
  saveCurrentUserPreferences,
} from '../services/userProfileService';
import { getPremiumSession, subscribePremiumSession } from '../store';
import { useDelayedVisibility } from '../utils/useDelayedVisibility';

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
  const [draftRestrictionIds, setDraftRestrictionIds] = useState<RestrictionId[]>([]);
  const [draftRestrictionSeverity, setDraftRestrictionSeverity] =
    useState<RestrictionSeverity>('strict');
  const [draftShareCardStyleId, setDraftShareCardStyleId] =
    useState<ShareCardStyleId>('classic');
  const [historyInsightsEnabled, setHistoryInsightsEnabled] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isAppLookModalVisible, setIsAppLookModalVisible] = useState(false);
  const [isDietProfileVisible, setIsDietProfileVisible] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isHouseholdEditorVisible, setIsHouseholdEditorVisible] = useState(false);
  const [isHouseholdProfilesModalVisible, setIsHouseholdProfilesModalVisible] =
    useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isNotificationCadenceModalVisible, setIsNotificationCadenceModalVisible] =
    useState(false);
  const [isRestrictionModalVisible, setIsRestrictionModalVisible] = useState(false);
  const [isRestrictionSeverityModalVisible, setIsRestrictionSeverityModalVisible] =
    useState(false);
  const [isShareCardStyleModalVisible, setIsShareCardStyleModalVisible] =
    useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [roleLabel, setRoleLabel] = useState('User');
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [premiumEntitlement, setPremiumEntitlement] = useState(getPremiumSession());
  const [premiumLabel, setPremiumLabel] = useState(
    getPremiumSession().isPremium ? 'Premium' : 'Basic'
  );
  const [restrictionIds, setRestrictionIds] = useState<RestrictionId[]>([]);
  const [restrictionSeverity, setRestrictionSeverity] =
    useState<RestrictionSeverity>('strict');
  const [historyNotificationCadence, setHistoryNotificationCadence] =
    useState<HistoryNotificationCadence>('weekly');
  const [historyNotificationPermissionState, setHistoryNotificationPermissionState] =
    useState<HistoryNotificationPermissionState>('undetermined');
  const [draftHistoryNotificationCadence, setDraftHistoryNotificationCadence] =
    useState<HistoryNotificationCadence>('weekly');
  const [historyNotificationsEnabled, setHistoryNotificationsEnabled] = useState(false);
  const [householdProfiles, setHouseholdProfiles] = useState<HouseholdProfile[]>([]);
  const [activeHouseholdProfileId, setActiveHouseholdProfileId] = useState<string | null>(
    null
  );
  const [editingHouseholdProfileId, setEditingHouseholdProfileId] = useState<string | null>(
    null
  );
  const [draftHouseholdName, setDraftHouseholdName] = useState('');
  const [draftHouseholdDietProfileId, setDraftHouseholdDietProfileId] =
    useState<DietProfileId>(DEFAULT_DIET_PROFILE_ID);
  const [draftHouseholdRestrictionIds, setDraftHouseholdRestrictionIds] = useState<
    RestrictionId[]
  >([]);
  const [draftHouseholdRestrictionSeverity, setDraftHouseholdRestrictionSeverity] =
    useState<RestrictionSeverity>('strict');
  const [shareCardStyleId, setShareCardStyleId] =
    useState<ShareCardStyleId>('classic');
  const shouldShowLoadingScreen = useDelayedVisibility(
    isLoadingSettings && !hasLoadedOnce
  );

  const selectedAppLook = getAppLookDefinition(appLookId);
  const selectedShareCardStyle = getShareCardStyleDefinition(shareCardStyleId);
  const activeHouseholdProfile =
    householdProfiles.find((profile) => profile.id === activeHouseholdProfileId) ?? null;

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
  const notificationCadenceOptions = [
    {
      description: 'Show the strongest scan nudge when something needs attention.',
      id: 'smart' as const,
      label: 'Smart',
    },
    {
      description: 'Bundle your recent scan patterns into a simple weekly recap.',
      id: 'weekly' as const,
      label: 'Weekly',
    },
  ];
  const restrictionSeverityOptions = [
    {
      description: 'Flag products gently so you can decide case by case.',
      id: 'caution' as const,
      label: 'Caution',
    },
    {
      description: 'Treat any strong match as an avoid signal.',
      id: 'strict' as const,
      label: 'Strict',
    },
  ];

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
          const [
            profile,
            savedDietProfileId,
            savedShareCardStyleId,
            entitlement,
            notificationPermissionState,
            householdProfileState,
          ] =
            await Promise.all([
              loadUserProfile(),
              syncDietProfileForCurrentUser(),
              syncShareCardStyleForCurrentUser(),
              loadCurrentPremiumEntitlement(),
              getHistoryNotificationPermissionState(),
              loadHouseholdProfileState(),
            ]);

          if (!isMounted) {
            return;
          }

          setDietProfileId(savedDietProfileId);
          setDraftDietProfileId(savedDietProfileId);
          setDraftAppLookId(profile?.appLookId ?? appLookId);
          setDraftRestrictionIds(profile?.restrictionIds ?? []);
          setDraftRestrictionSeverity(profile?.restrictionSeverity ?? 'strict');
          setDraftShareCardStyleId(savedShareCardStyleId);
          setFavoriteCount(profile?.favoriteProductCodes?.length ?? 0);
          setHistoryInsightsEnabled(profile?.historyInsightsEnabled ?? true);
          setHistoryNotificationCadence(
            profile?.historyNotificationCadence ?? 'weekly'
          );
          setHistoryNotificationPermissionState(notificationPermissionState);
          setDraftHistoryNotificationCadence(
            profile?.historyNotificationCadence ?? 'weekly'
          );
          setHistoryNotificationsEnabled(
            profile?.historyNotificationsEnabled ?? false
          );
          setHouseholdProfiles(householdProfileState.householdProfiles);
          setActiveHouseholdProfileId(householdProfileState.activeHouseholdProfileId);
          setProfileEmail(profile?.email ?? '');
          setProfileName(profile?.name ?? '');
          setPremiumLabel(entitlement.isPremium ? 'Premium' : 'Basic');
          setRestrictionIds(profile?.restrictionIds ?? []);
          setRestrictionSeverity(profile?.restrictionSeverity ?? 'strict');
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

  if (shouldShowLoadingScreen) {
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
    setDietProfileId(draftDietProfileId);
    setIsDietProfileVisible(false);
    void saveDietProfile(draftDietProfileId).catch((error) => {
      Alert.alert(
        'Diet profile update failed',
        error instanceof AuthServiceError
          ? error.message
          : 'We could not save that diet profile right now.'
      );
    });
  };

  const handleApplyAppLook = async () => {
    setIsAppLookModalVisible(false);
    void setAppLookId(draftAppLookId).catch((error) => {
      Alert.alert(
        'App look update failed',
        error instanceof AuthServiceError
          ? error.message
          : 'We could not save that app look right now.'
      );
    });
  };

  const handleOpenAppLookModal = () => {
    setDraftAppLookId(appLookId);
    setIsAppLookModalVisible(true);
  };

  const handleOpenDietProfileModal = () => {
    setDraftDietProfileId(dietProfileId);
    setIsDietProfileVisible(true);
  };

  const handleOpenShareCardStyleModal = () => {
    setDraftShareCardStyleId(shareCardStyleId);
    setIsShareCardStyleModalVisible(true);
  };

  const resetHouseholdEditor = () => {
    setEditingHouseholdProfileId(null);
    setDraftHouseholdName('');
    setDraftHouseholdDietProfileId(dietProfileId);
    setDraftHouseholdRestrictionIds(restrictionIds);
    setDraftHouseholdRestrictionSeverity(restrictionSeverity);
  };

  const handleOpenHouseholdProfilesModal = () => {
    setIsHouseholdProfilesModalVisible(true);
  };

  const handleOpenCreateHouseholdProfile = () => {
    resetHouseholdEditor();
    setIsHouseholdProfilesModalVisible(false);
    setIsHouseholdEditorVisible(true);
  };

  const handleEditHouseholdProfile = (profile: HouseholdProfile) => {
    setIsHouseholdProfilesModalVisible(false);
    setEditingHouseholdProfileId(profile.id);
    setDraftHouseholdName(profile.name);
    setDraftHouseholdDietProfileId(profile.dietProfileId);
    setDraftHouseholdRestrictionIds(profile.restrictionIds);
    setDraftHouseholdRestrictionSeverity(profile.restrictionSeverity);
    setIsHouseholdEditorVisible(true);
  };

  const handleToggleHouseholdRestriction = (id: RestrictionId) => {
    setDraftHouseholdRestrictionIds((currentIds) =>
      currentIds.includes(id)
        ? currentIds.filter((currentId) => currentId !== id)
        : [...currentIds, id]
    );
  };

  const handleSaveHouseholdProfile = () => {
    setIsHouseholdEditorVisible(false);
    void saveHouseholdProfile({
      dietProfileId: draftHouseholdDietProfileId,
      id: editingHouseholdProfileId,
      name: draftHouseholdName,
      restrictionIds: draftHouseholdRestrictionIds,
      restrictionSeverity: draftHouseholdRestrictionSeverity,
    })
      .then((state) => {
        setHouseholdProfiles(state.householdProfiles);
        setActiveHouseholdProfileId(state.activeHouseholdProfileId);
        setIsHouseholdProfilesModalVisible(true);
      })
      .catch((error) => {
        Alert.alert(
          'Household profile update failed',
          error instanceof AuthServiceError
            ? error.message
            : 'We could not save that household profile right now.'
        );
      });
  };

  const handleDeleteHousehold = (id: string) => {
    Alert.alert('Delete household profile?', 'This removes only that saved household setup.', [
      { style: 'cancel', text: 'Cancel' },
      {
        style: 'destructive',
        text: 'Delete',
        onPress: () => {
          void deleteHouseholdProfile(id)
            .then((state) => {
              setHouseholdProfiles(state.householdProfiles);
              setActiveHouseholdProfileId(state.activeHouseholdProfileId);
            })
            .catch((error) => {
              Alert.alert(
                'Delete failed',
                error instanceof AuthServiceError
                  ? error.message
                  : 'We could not remove that household profile right now.'
              );
            });
        },
      },
    ]);
  };

  const handleUseHouseholdProfile = (id: string | null) => {
    setActiveHouseholdProfileId(id);
    void setActiveHouseholdProfile(id).catch((error) => {
      Alert.alert(
        'Switch failed',
        error instanceof AuthServiceError
          ? error.message
          : 'We could not switch the active household profile right now.'
      );
    });
  };

  const handleToggleRestriction = (id: RestrictionId) => {
    setDraftRestrictionIds((currentIds) =>
      currentIds.includes(id)
        ? currentIds.filter((currentId) => currentId !== id)
        : [...currentIds, id]
    );
  };

  const handleOpenRestrictionModal = () => {
    setDraftRestrictionIds(restrictionIds);
    setIsRestrictionModalVisible(true);
  };

  const handleApplyRestrictions = () => {
    const nextRestrictionIds = [...draftRestrictionIds].sort();
    setRestrictionIds(nextRestrictionIds);
    setIsRestrictionModalVisible(false);
    void saveCurrentUserPreferences({
      restrictionIds: nextRestrictionIds,
    }).catch((error) => {
      Alert.alert(
        'Food filters update failed',
        error instanceof AuthServiceError
          ? error.message
          : 'We could not save those food filters right now.'
      );
    });
  };

  const handleOpenRestrictionSeverityModal = () => {
    setDraftRestrictionSeverity(restrictionSeverity);
    setIsRestrictionSeverityModalVisible(true);
  };

  const handleApplyRestrictionSeverity = () => {
    setRestrictionSeverity(draftRestrictionSeverity);
    setIsRestrictionSeverityModalVisible(false);
    void saveCurrentUserPreferences({
      restrictionSeverity: draftRestrictionSeverity,
    }).catch((error) => {
      Alert.alert(
        'Filter strictness update failed',
        error instanceof AuthServiceError
          ? error.message
          : 'We could not save that filter strictness right now.'
      );
    });
  };

  const handleApplyShareCardStyle = () => {
    setShareCardStyleId(draftShareCardStyleId);
    setIsShareCardStyleModalVisible(false);
    void saveShareCardStyleId(draftShareCardStyleId).catch((error) => {
      Alert.alert(
        'Share-card style update failed',
        error instanceof AuthServiceError
          ? error.message
          : 'We could not save that share-card style right now.'
      );
    });
  };

  const handleToggleHistoryInsights = async () => {
    if (!premiumEntitlement.isPremium) {
      navigation.navigate('Premium', { featureId: 'history-personalization' });
      return;
    }

    const nextValue = !historyInsightsEnabled;
    setHistoryInsightsEnabled(nextValue);
    void saveCurrentUserPreferences({ historyInsightsEnabled: nextValue }).catch(
      (error) => {
        Alert.alert(
          'History insights update failed',
          error instanceof AuthServiceError
            ? error.message
            : 'We could not save that history insight setting right now.'
        );
      }
    );
  };

  const handleToggleHistoryNotifications = async () => {
    const nextValue = !historyNotificationsEnabled;

    if (!nextValue) {
      setHistoryNotificationsEnabled(false);
      void saveCurrentUserPreferences({
        historyNotificationsEnabled: false,
      }).catch((error) => {
        Alert.alert(
          'Notification update failed',
          error instanceof AuthServiceError
            ? error.message
            : 'We could not turn off history notifications right now.'
        );
      });
      void cancelCurrentUserHistoryNotifications();
      return;
    }

    const permissionState = await requestHistoryNotificationPermission();
    setHistoryNotificationPermissionState(permissionState);

    if (permissionState !== 'granted') {
      setHistoryNotificationsEnabled(false);
      void saveCurrentUserPreferences({
        historyNotificationsEnabled: false,
      }).catch(() => {
        // Keep the local toggle off even if profile sync fails.
      });
      void cancelCurrentUserHistoryNotifications();
      Alert.alert(
        'Allow notifications',
        'Turn on notifications in system settings to receive weekly recaps and shopping nudges.',
        [
          { style: 'cancel', text: 'Not now' },
          {
            text: 'Open settings',
            onPress: () => {
              void openHistoryNotificationSettings();
            },
          },
        ]
      );
      return;
    }

    setHistoryNotificationsEnabled(true);
    void saveCurrentUserPreferences({
      historyNotificationsEnabled: true,
    })
      .then(() => syncHistoryNotificationsForCurrentUser())
      .catch((error) => {
        Alert.alert(
          'Notification update failed',
          error instanceof AuthServiceError
            ? error.message
            : 'We could not turn on history notifications right now.'
        );
      });
  };

  const handleApplyNotificationCadence = () => {
    setHistoryNotificationCadence(draftHistoryNotificationCadence);
    setIsNotificationCadenceModalVisible(false);
    void saveCurrentUserPreferences({
      historyNotificationCadence: draftHistoryNotificationCadence,
    })
      .then(() => syncHistoryNotificationsForCurrentUser())
      .catch((error) => {
        Alert.alert(
          'Notification pace update failed',
          error instanceof AuthServiceError
            ? error.message
            : 'We could not save that notification pace right now.'
        );
      });
  };

  const historyNotificationStatus = getHistoryNotificationStatusLabel(
    historyNotificationsEnabled,
    historyNotificationPermissionState,
    historyNotificationCadence
  );
  const restrictionValue =
    restrictionIds.length === 0
      ? 'Off'
      : `${restrictionIds.length} ${restrictionIds.length === 1 ? 'filter' : 'filters'}`;
  const isNotificationCadenceDisabled =
    !historyNotificationsEnabled || historyNotificationPermissionState !== 'granted';

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.safeArea}>
      <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>{profileName || profileEmail || APP_NAME}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{roleLabel}</Text>
          </View>
        </View>

        <SettingsSection title="Account">
          <SettingsRow
            onPress={() => navigation.navigate('ProfileDetails')}
            subtitle="Edit your name."
            title="Profile"
            value="Open"
          />
          <SettingsRow
            onPress={() => navigation.navigate('History')}
            title="History"
            value="Open"
          />
          <SettingsRow
            onPress={() => void logoutAuth()}
            title="Log Out"
          />
          <SettingsRow
            danger
            disabled={isDeletingAccount}
            onPress={handleDeleteAccount}
            title="Delete Account"
            value={isDeletingAccount ? 'Working...' : undefined}
          />
        </SettingsSection>

        <SettingsSection title="Preferences">
          <SettingsRow
            onPress={() => navigation.navigate('Premium')}
            subtitle="Deeper guidance, smarter OCR help, and shopping habit tools."
            title="Premium"
            value={premiumLabel}
          />
          <SettingsRow
            onPress={handleOpenHouseholdProfilesModal}
            subtitle="Switch who you are shopping for without overwriting your own defaults."
            title="Shopping For"
            value={activeHouseholdProfile?.name ?? 'You'}
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
            onPress={handleOpenAppLookModal}
            title="App Look"
            value={selectedAppLook.shortLabel}
          />
          <SettingsRow
            onPress={handleOpenDietProfileModal}
            subtitle="This is your default when shopping for yourself."
            title="Your Diet Profile"
            value={selectedProfile.shortLabel}
          />
          <SettingsRow
            onPress={handleOpenRestrictionModal}
            subtitle="These are your own default filters when no household profile is active."
            title="Your Food Filters"
            value={restrictionValue}
          />
          <SettingsRow
            disabled={restrictionIds.length === 0}
            onPress={handleOpenRestrictionSeverityModal}
            subtitle="Choose whether matching products show caution or avoid."
            title="Filter Strictness"
            value={restrictionSeverity}
          />
          <SettingsRow
            onPress={handleOpenShareCardStyleModal}
            title="Share Card Style"
            value={selectedShareCardStyle.label}
          />
          <SettingsRow
            onPress={() => void handleToggleHistoryInsights()}
            subtitle="Richer weekly scan patterns and repeat-buy signals."
            title="History Insights"
            value={premiumEntitlement.isPremium ? (historyInsightsEnabled ? 'On' : 'Off') : 'Premium'}
          />
          <SettingsRow
            onPress={() => void handleToggleHistoryNotifications()}
            subtitle="Local reminders based on your recent scans."
            title="History Notifications"
            value={
              historyNotificationPermissionState === 'denied'
                ? 'Blocked'
                : historyNotificationsEnabled
                  ? 'On'
                  : 'Off'
            }
          />
          <SettingsRow
            disabled={isNotificationCadenceDisabled}
            onPress={() => {
              setDraftHistoryNotificationCadence(historyNotificationCadence);
              setIsNotificationCadenceModalVisible(true);
            }}
            subtitle="Choose whether history nudges arrive smart-first or as a weekly recap."
            title="Notification Pace"
            value={historyNotificationCadence}
          />
          <SettingsRow
            onPress={
              historyNotificationPermissionState === 'denied'
                ? () => {
                    void openHistoryNotificationSettings();
                  }
                : undefined
            }
            subtitle={
              historyNotificationPermissionState === 'denied'
                ? 'Open system settings to allow weekly recaps and smart nudges.'
                : 'Preview of what this device will send.'
            }
            title="Notification Status"
            value={historyNotificationStatus}
          />
          <SettingsRow
            onPress={() => navigation.navigate('History')}
            subtitle="Premium can save favorites and keep two products ready to compare."
            title="Saved Products"
            value={favoriteCount > 0 ? `${favoriteCount} saved` : 'Open'}
          />
        </SettingsSection>

        <SettingsSection title="Support">
          <SettingsRow
            onPress={() => navigation.navigate('Help')}
            title="Help"
          />
          <SettingsRow
            onPress={() => navigation.navigate('PrivacyPolicy')}
            title="Privacy Policy"
          />
          <SettingsRow
            onPress={() => navigation.navigate('About')}
            title="About"
          />
          <SettingsRow
            onPress={() => navigation.navigate('Feedback')}
            title="Send Feedback"
          />
        </SettingsSection>
      </ScrollView>
      <BottomMenuBar activeRoute="Settings" scannerProfileId={dietProfileId} />

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
        onApply={handleApplyNotificationCadence}
        onRequestClose={() => setIsNotificationCadenceModalVisible(false)}
        onSelect={setDraftHistoryNotificationCadence}
        options={notificationCadenceOptions}
        selectedId={draftHistoryNotificationCadence}
        title="Choose notification pace"
        visible={isNotificationCadenceModalVisible}
      />
      <RestrictionPickerModal
        colors={colors}
        onApply={handleApplyRestrictions}
        onRequestClose={() => setIsRestrictionModalVisible(false)}
        onToggle={handleToggleRestriction}
        restrictions={RESTRICTION_DEFINITIONS}
        selectedIds={draftRestrictionIds}
        visible={isRestrictionModalVisible}
      />
      <OptionPickerModal
        colors={colors}
        onApply={handleApplyRestrictionSeverity}
        onRequestClose={() => setIsRestrictionSeverityModalVisible(false)}
        onSelect={setDraftRestrictionSeverity}
        options={restrictionSeverityOptions}
        selectedId={draftRestrictionSeverity}
        title="Choose filter strictness"
        visible={isRestrictionSeverityModalVisible}
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
      <HouseholdProfilesModal
        activeHouseholdProfileId={activeHouseholdProfileId}
        householdProfiles={householdProfiles}
        onAdd={handleOpenCreateHouseholdProfile}
        onDelete={handleDeleteHousehold}
        onEdit={handleEditHouseholdProfile}
        onRequestClose={() => setIsHouseholdProfilesModalVisible(false)}
        onUseProfile={handleUseHouseholdProfile}
        visible={isHouseholdProfilesModalVisible}
      />
      <HouseholdProfileEditorModal
        draftDietProfileId={draftHouseholdDietProfileId}
        draftName={draftHouseholdName}
        draftRestrictionIds={draftHouseholdRestrictionIds}
        draftRestrictionSeverity={draftHouseholdRestrictionSeverity}
        onChangeName={setDraftHouseholdName}
        onRequestClose={() => {
          setIsHouseholdEditorVisible(false);
          setIsHouseholdProfilesModalVisible(true);
        }}
        onSave={handleSaveHouseholdProfile}
        onSelectDietProfile={setDraftHouseholdDietProfileId}
        onSelectRestrictionSeverity={setDraftHouseholdRestrictionSeverity}
        onToggleRestriction={handleToggleHouseholdRestriction}
        visible={isHouseholdEditorVisible}
      />
      </View>
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
      paddingBottom: 132,
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
    screen: {
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
  });
