import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getLanguageDisplayLabel, useI18n } from '../components/AppLanguageProvider';
import { useAppTheme } from '../components/AppThemeProvider';
import GoogleSignInButton from '../components/GoogleSignInButton';
import OptionPickerModal from '../components/OptionPickerModal';
import PrimaryButton from '../components/PrimaryButton';
import TutorialFeatureCard from '../components/TutorialFeatureCard';
import { APP_NAME } from '../constants/branding';
import type { RootStackParamList } from '../navigation/types';

type AccountIntroScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'AccountIntro'
>;
type AccountPath = 'email' | 'google';

const ACCOUNT_BENEFITS = [
  {
    body: 'Your scan history and saved picks stay tied to you.',
    icon: 'time-outline' as const,
    title: 'Save your products',
  },
  {
    body: 'Diet filters, household shoppers, and settings follow your account.',
    icon: 'people-outline' as const,
    title: 'Keep preferences',
  },
  {
    body: 'Weekly momentum, badges, and achievements can build safely.',
    icon: 'trophy-outline' as const,
    title: 'Track progress',
  },
  {
    body: 'Changed products, premium access, and safety controls need identity.',
    icon: 'shield-checkmark-outline' as const,
    title: 'Protect trust',
  },
];

const ACCOUNT_PATH_COPY: Record<
  AccountPath,
  {
    body: string;
    steps: string[];
    title: string;
  }
> = {
  email: {
    body: 'Best if you want a normal email and password account.',
    steps: ['Create account', 'Verify your email', 'Log in'],
    title: 'Email account',
  },
  google: {
    body: 'Fastest setup if Google sign-in is available on this device.',
    steps: ['Choose Google', 'Approve sign-in', 'Start scanning'],
    title: 'Google account',
  },
};

export default function AccountIntroScreen({
  navigation,
}: AccountIntroScreenProps) {
  const { languageCode, languageOptions, setLanguageCode, t } = useI18n();
  const { colors, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const [draftLanguageCode, setDraftLanguageCode] = useState(languageCode);
  const [isLanguageModalVisible, setIsLanguageModalVisible] = useState(false);
  const [selectedPath, setSelectedPath] = useState<AccountPath>('email');
  const selectedPathCopy = ACCOUNT_PATH_COPY[selectedPath];
  const appLanguageOptions = languageOptions.map((language) => ({
    description: t(`Use ${language.englishLabel} throughout the app.`),
    id: language.code,
    label: language.nativeLabel,
  }));

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>{t('Start safely')}</Text>
          <Text style={styles.title}>
            {t('Create your {appName} account first', { appName: APP_NAME })}
          </Text>
          <Text style={styles.subtitle}>
            {t(
              'Every feature uses your account to keep scans, filters, alerts, and progress in one trusted place.'
            )}
          </Text>
          <Text style={styles.subtleNote}>
            {t(
              'After sign-in, Inqoura will walk you through one full guided tutorial before you start using the app.'
            )}
          </Text>
        </View>

        <View style={styles.languageCard}>
          <Text style={styles.pathLabel}>{t('App language')}</Text>
          <Text style={styles.pathTitle}>{getLanguageDisplayLabel(languageCode)}</Text>
          <Text style={styles.pathBody}>
            {t(
              'This language will be used across the app after you create or log into your account.'
            )}
          </Text>
          <PrimaryButton
            label={t('Select language')}
            onPress={() => {
              setDraftLanguageCode(languageCode);
              setIsLanguageModalVisible(true);
            }}
          />
          <Text style={styles.subtleNote}>
            {t('You can change this any time later from settings.')}
          </Text>
        </View>

        <View style={styles.benefitStack}>
          {ACCOUNT_BENEFITS.map((benefit) => (
            <TutorialFeatureCard
              key={benefit.title}
              body={benefit.body}
              icon={benefit.icon}
              title={benefit.title}
            />
          ))}
        </View>

        <View style={styles.pathCard}>
          <Text style={styles.pathLabel}>{t('Choose setup path')}</Text>
          <View style={styles.pathToggleRow}>
            {(['email', 'google'] as const).map((path) => {
              const isSelected = path === selectedPath;

              return (
                <Pressable
                  accessibilityRole="button"
                  key={path}
                  onPress={() => setSelectedPath(path)}
                  style={[styles.pathChip, isSelected && styles.pathChipSelected]}
                >
                  <Text
                    style={[
                      styles.pathChipText,
                      isSelected && styles.pathChipTextSelected,
                    ]}
                  >
                    {t(ACCOUNT_PATH_COPY[path].title)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.pathTitle}>{t(selectedPathCopy.title)}</Text>
          <Text style={styles.pathBody}>{t(selectedPathCopy.body)}</Text>
          <View style={styles.stepRow}>
            {selectedPathCopy.steps.map((step, index) => (
              <View key={step} style={styles.stepPill}>
                <Text style={styles.stepNumber}>{index + 1}</Text>
                <Text style={styles.stepText}>{t(step)}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.actionCard}>
          {selectedPath === 'google' ? (
            <GoogleSignInButton label={t('Create with Google')} />
          ) : (
            <PrimaryButton
              label={t('Create email account')}
              onPress={() => navigation.navigate('SignUp')}
            />
          )}
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('Login')}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>{t('Log in instead')}</Text>
          </Pressable>
        </View>
      </ScrollView>

      <OptionPickerModal
        colors={colors}
        onApply={() => {
          setIsLanguageModalVisible(false);
          void setLanguageCode(draftLanguageCode).catch(() => null);
        }}
        onRequestClose={() => setIsLanguageModalVisible(false)}
        onSelect={setDraftLanguageCode}
        options={appLanguageOptions}
        selectedId={draftLanguageCode}
        title={t('Select language')}
        visible={isLanguageModalVisible}
      />
    </SafeAreaView>
  );
}

const createStyles = (
  colors: ReturnType<typeof useAppTheme>['colors'],
  typography: ReturnType<typeof useAppTheme>['typography']
) =>
  StyleSheet.create({
    actionCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 26,
      borderWidth: 1,
      gap: 14,
      padding: 18,
    },
    benefitStack: {
      gap: 12,
    },
    content: {
      gap: 20,
      padding: 24,
    },
    eyebrow: {
      color: colors.primary,
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    heroCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 30,
      borderWidth: 1,
      gap: 10,
      padding: 24,
    },
    languageCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 26,
      borderWidth: 1,
      gap: 12,
      padding: 18,
    },
    pathBody: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 14,
      lineHeight: 21,
    },
    pathCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 26,
      borderWidth: 1,
      gap: 12,
      padding: 18,
    },
    pathChip: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: 999,
      borderWidth: 1,
      flex: 1,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    pathChipSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    pathChipText: {
      color: colors.text,
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '800',
      textAlign: 'center',
    },
    pathChipTextSelected: {
      color: colors.surface,
    },
    pathLabel: {
      color: colors.primary,
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    pathTitle: {
      color: colors.text,
      fontFamily: typography.headingFontFamily,
      fontSize: 20,
      fontWeight: '800',
    },
    pathToggleRow: {
      flexDirection: 'row',
      gap: 10,
    },
    safeArea: {
      backgroundColor: colors.background,
      flex: 1,
    },
    secondaryButton: {
      alignItems: 'center',
      borderColor: colors.border,
      borderRadius: 999,
      borderWidth: 1,
      minHeight: 52,
      justifyContent: 'center',
      paddingHorizontal: 18,
    },
    secondaryButtonText: {
      color: colors.text,
      fontFamily: typography.accentFontFamily,
      fontSize: 15,
      fontWeight: '800',
    },
    stepNumber: {
      color: colors.primary,
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '800',
    },
    stepPill: {
      alignItems: 'center',
      backgroundColor: colors.primaryMuted,
      borderRadius: 18,
      flexDirection: 'row',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    stepRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    stepText: {
      color: colors.primary,
      fontFamily: typography.bodyFontFamily,
      fontSize: 12,
      fontWeight: '700',
    },
    subtitle: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 15,
      lineHeight: 22,
    },
    subtleNote: {
      color: colors.text,
      fontFamily: typography.bodyFontFamily,
      fontSize: 13,
      lineHeight: 20,
      opacity: 0.82,
    },
    title: {
      color: colors.text,
      fontFamily: typography.displayFontFamily,
      fontSize: 32,
      fontWeight: '800',
      lineHeight: 38,
    },
  });
