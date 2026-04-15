import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import AchievementBadgeStrip from '../components/AchievementBadgeStrip';
import AuthTextField from '../components/AuthTextField';
import { useI18n } from '../components/AppLanguageProvider';
import { useAppTheme } from '../components/AppThemeProvider';
import FeatureTipCard from '../components/FeatureTipCard';
import PrimaryButton from '../components/PrimaryButton';
import QuestActionCard from '../components/QuestActionCard';
import ScreenLoadingView from '../components/ScreenLoadingView';
import TutorialTarget from '../components/TutorialTarget';
import { AuthServiceError } from '../services/authHelpers';
import { toGamificationSummary } from '../services/gamificationService';
import {
  loadSessionGamificationProfile,
  loadSessionUserProfile,
} from '../services/sessionDataService';
import { saveUserProfile } from '../services/userProfileService';
import { useDelayedVisibility } from '../utils/useDelayedVisibility';
import { useFeatureTutorial } from '../utils/useFeatureTutorial';
import type { RootStackParamList } from '../navigation/types';

type ProfileDetailsScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'ProfileDetails'
>;

export default function ProfileDetailsScreen({
  navigation,
}: ProfileDetailsScreenProps) {
  const { t } = useI18n();
  const { colors, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const [email, setEmail] = useState('');
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [name, setName] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [progressSummary, setProgressSummary] = useState<ReturnType<
    typeof toGamificationSummary
  > | null>(null);
  const shouldShowLoadingScreen = useDelayedVisibility(isLoadingProfile);
  const profileTutorial = useFeatureTutorial('profile');

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      setIsLoadingProfile(true);

      void Promise.all([
        loadSessionUserProfile('stale-while-revalidate'),
        loadSessionGamificationProfile('cache-first'),
      ])
        .then(([profile, gamificationProfile]) => {
          if (!isMounted) {
            return;
          }

          if (profile) {
            setEmail(profile.email);
            setName(profile.name);
          }

          setProgressSummary(toGamificationSummary(gamificationProfile));
        })
        .finally(() => {
          if (isMounted) {
            setIsLoadingProfile(false);
          }
        });

      return () => {
        isMounted = false;
      };
    }, [])
  );

  if (shouldShowLoadingScreen) {
    return (
      <ScreenLoadingView
        subtitle="Loading your saved account details..."
        title="Loading profile"
      />
    );
  }

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      if (!name.trim()) {
        throw new AuthServiceError('Enter your name.');
      }

      await saveUserProfile({
        countryCode: null,
        name,
      });

      setMessage('Profile updated.');
    } catch (error) {
      setMessage(
        error instanceof AuthServiceError
          ? error.message
          : 'We could not save your profile right now.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TutorialTarget targetId="profile-hero">
          <View style={styles.header}>
            <Text style={styles.eyebrow}>{t('Profile')}</Text>
            <Text style={styles.title}>{t('Your profile and achievements')}</Text>
            <Text style={styles.subtitle}>
              {t('Keep your account details here and jump into achievements whenever you want.')}
            </Text>
          </View>
        </TutorialTarget>

        <FeatureTipCard
          body="Profile keeps your account details and achievements together. Settings handles preferences."
          icon="person-circle-outline"
          onDismiss={profileTutorial.dismiss}
          title="Profile is your identity hub"
          visible={profileTutorial.isVisible}
        />

        <QuestActionCard
          badge="Achievements"
          icon="trophy-outline"
          onPress={() => navigation.navigate('Progress')}
          subtitle={
            progressSummary
              ? `${progressSummary.streakCount} week streak • ${progressSummary.momentum.points}/${progressSummary.momentum.goal} momentum`
              : 'Open your weekly momentum, streaks, and badges.'
          }
          title="Achievements"
        />

        {progressSummary ? (
          <AchievementBadgeStrip badges={progressSummary.recentUnlockedAchievements} />
        ) : null}

        <View style={styles.card}>
          <AuthTextField
            editable={false}
            label="Email"
            onChangeText={setEmail}
            placeholder="you@example.com"
            value={email}
          />
          <AuthTextField
            label="Name"
            onChangeText={setName}
            placeholder="How should we address you?"
            value={name}
          />
          {message ? <Text style={styles.message}>{t(message)}</Text> : null}
          <PrimaryButton
            disabled={isSaving}
            label={isSaving ? 'Saving...' : 'Save Profile'}
            onPress={() => void handleSave()}
          />
          <PrimaryButton
            label="Open Settings"
            onPress={() => navigation.navigate('Settings')}
            tutorialTargetId="profile-open-settings"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (
  colors: ReturnType<typeof useAppTheme>['colors'],
  typography: ReturnType<typeof useAppTheme>['typography']
) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 24,
      borderWidth: 1,
      gap: 16,
      padding: 20,
    },
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
    header: {
      gap: 10,
    },
    message: {
      color: colors.primary,
      fontFamily: typography.bodyFontFamily,
      fontSize: 14,
      lineHeight: 21,
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
    title: {
      color: colors.text,
      fontFamily: typography.displayFontFamily,
      fontSize: 30,
      fontWeight: '800',
      lineHeight: 36,
    },
  });
