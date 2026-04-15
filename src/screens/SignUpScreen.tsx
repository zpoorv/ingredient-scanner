import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getLanguageDisplayLabel, useI18n } from '../components/AppLanguageProvider';
import { useAppTheme } from '../components/AppThemeProvider';
import AuthTextField from '../components/AuthTextField';
import GoogleSignInButton from '../components/GoogleSignInButton';
import OptionPickerModal from '../components/OptionPickerModal';
import PrimaryButton from '../components/PrimaryButton';
import { APP_NAME } from '../constants/branding';
import { AuthServiceError } from '../services/authHelpers';
import { signUpWithEmail } from '../services/authService';
import type { RootStackParamList } from '../navigation/types';

type SignUpScreenProps = NativeStackScreenProps<RootStackParamList, 'SignUp'>;

export default function SignUpScreen({ navigation }: SignUpScreenProps) {
  const { languageCode, languageOptions, setLanguageCode, t } = useI18n();
  const { colors, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const [draftLanguageCode, setDraftLanguageCode] = useState(languageCode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLanguageModalVisible, setIsLanguageModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const appLanguageOptions = languageOptions.map((language) => ({
    description: t(`Use ${language.englishLabel} throughout the app.`),
    id: language.code,
    label: language.nativeLabel,
  }));

  const handleSignUp = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const notice = await signUpWithEmail({ email, name, password, passwordConfirmation });
      navigation.replace('Login', {
        notice,
        prefillEmail: email.trim().toLowerCase(),
      });
    } catch (error) {
      setErrorMessage(
        error instanceof AuthServiceError
          ? t(error.message)
          : t('We could not create your account right now.')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>{t('Create Account')}</Text>
          <Text style={styles.title}>
            {t('Create your {appName} account', { appName: APP_NAME })}
          </Text>
          <Text style={styles.subtitle}>
            {t(
              'Email accounts need verification before login. Google sign-in opens the app immediately after authentication.'
            )}
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.languageRow}>
            <View style={styles.languageCopy}>
              <Text style={styles.languageLabel}>{t('App language')}</Text>
              <Text style={styles.languageValue}>
                {getLanguageDisplayLabel(languageCode)}
              </Text>
            </View>
            <Pressable
              onPress={() => {
                setDraftLanguageCode(languageCode);
                setIsLanguageModalVisible(true);
              }}
              style={styles.languageButton}
            >
              <Text style={styles.languageButtonText}>{t('Select language')}</Text>
            </Pressable>
          </View>
          <AuthTextField
            autoCapitalize="words"
            label={t('Name')}
            onChangeText={setName}
            placeholder={t('Your full name')}
            value={name}
          />
          <AuthTextField
            autoComplete="email"
            keyboardType="email-address"
            label={t('Email')}
            onChangeText={setEmail}
            placeholder={t('you@example.com')}
            value={email}
          />
          <AuthTextField
            autoComplete="new-password"
            label={t('Password')}
            onChangeText={setPassword}
            placeholder={t('Use at least 8 characters')}
            secureTextEntry
            value={password}
          />
          <AuthTextField
            autoComplete="new-password"
            errorMessage={errorMessage}
            label={t('Confirm Password')}
            onChangeText={setPasswordConfirmation}
            placeholder={t('Re-enter your password')}
            secureTextEntry
            value={passwordConfirmation}
          />
          <PrimaryButton
            disabled={isSubmitting}
            label={isSubmitting ? t('Creating Account...') : t('Create Account')}
            onPress={() => void handleSignUp()}
          />

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('or')}</Text>
            <View style={styles.dividerLine} />
          </View>

          <GoogleSignInButton label={t('Continue with Google')} />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('Already have an account?')}</Text>
          <Pressable onPress={() => navigation.navigate('Login')}>
            <Text style={styles.footerLink}>{t('Log in')}</Text>
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
  dividerLine: {
    backgroundColor: colors.border,
    flex: 1,
    height: 1,
  },
  dividerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  dividerText: {
    color: colors.textMuted,
    fontFamily: typography.accentFontFamily,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  eyebrow: {
    color: colors.primary,
    fontFamily: typography.accentFontFamily,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  footer: {
    alignItems: 'center',
    gap: 6,
  },
  footerLink: {
    color: colors.primary,
    fontFamily: typography.accentFontFamily,
    fontSize: 15,
    fontWeight: '700',
  },
  footerText: {
    color: colors.textMuted,
    fontFamily: typography.bodyFontFamily,
    fontSize: 14,
  },
  languageButton: {
    alignItems: 'center',
    backgroundColor: colors.primaryMuted,
    borderRadius: 999,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 14,
  },
  languageButtonText: {
    color: colors.primary,
    fontFamily: typography.accentFontFamily,
    fontSize: 12,
    fontWeight: '800',
  },
  languageCopy: {
    flex: 1,
    gap: 4,
  },
  languageLabel: {
    color: colors.primary,
    fontFamily: typography.accentFontFamily,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  languageRow: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  languageValue: {
    color: colors.text,
    fontFamily: typography.headingFontFamily,
    fontSize: 16,
    fontWeight: '700',
  },
  header: {
    gap: 10,
    paddingTop: 12,
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
