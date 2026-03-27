import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import DietProfileModal from '../components/DietProfileModal';
import SettingsRow from '../components/SettingsRow';
import SettingsSection from '../components/SettingsSection';
import { useAppTheme } from '../components/AppThemeProvider';
import { APP_NAME } from '../constants/branding';
import {
  DEFAULT_DIET_PROFILE_ID,
  DIET_PROFILE_DEFINITIONS,
  type DietProfileId,
} from '../constants/dietProfiles';
import type { AppearanceMode } from '../models/preferences';
import type { RootStackParamList } from '../navigation/types';
import { deleteCurrentAccount } from '../services/accountDeletionService';
import { AuthServiceError } from '../services/authHelpers';
import { logoutAuth } from '../services/authService';
import {
  saveDietProfile,
  syncDietProfileForCurrentUser,
} from '../services/dietProfileStorage';
import { loadUserProfile } from '../services/userProfileService';

type SettingsScreenProps = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export default function SettingsScreen({ navigation }: SettingsScreenProps) {
  const { appearanceMode, colors, setAppearanceMode } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [dietProfileId, setDietProfileId] = useState<DietProfileId>(
    DEFAULT_DIET_PROFILE_ID
  );
  const [draftDietProfileId, setDraftDietProfileId] = useState<DietProfileId>(
    DEFAULT_DIET_PROFILE_ID
  );
  const [isDietProfileVisible, setIsDietProfileVisible] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [roleLabel, setRoleLabel] = useState('User');

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const loadSettings = async () => {
        const [profile, savedDietProfileId] = await Promise.all([
          loadUserProfile(),
          syncDietProfileForCurrentUser(),
        ]);

        if (!isMounted) {
          return;
        }

        setDietProfileId(savedDietProfileId);
        setDraftDietProfileId(savedDietProfileId);
        setProfileEmail(profile?.email ?? '');
        setProfileName(profile?.name ?? '');
        setRoleLabel(
          profile?.role === 'admin'
            ? 'Admin'
            : profile?.role === 'premium'
              ? 'Premium'
              : 'User'
        );
      };

      void loadSettings();

      return () => {
        isMounted = false;
      };
    }, [])
  );

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
            subtitle="Edit your name and optional age."
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
            onPress={() => setIsDietProfileVisible(true)}
            subtitle={selectedProfile.description}
            title="Diet Profile"
            value={selectedProfile.shortLabel}
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
    </SafeAreaView>
  );
}

const createStyles = (
  colors: ReturnType<typeof useAppTheme>['colors']
) =>
  StyleSheet.create({
    content: {
      gap: 24,
      padding: 24,
    },
    eyebrow: {
      color: colors.primary,
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
      fontSize: 12,
      fontWeight: '800',
    },
    safeArea: {
      backgroundColor: colors.background,
      flex: 1,
    },
    subtitle: {
      color: colors.textMuted,
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
      fontSize: 14,
    },
    summaryTitle: {
      color: colors.text,
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
      fontSize: 30,
      fontWeight: '800',
      lineHeight: 36,
    },
  });
