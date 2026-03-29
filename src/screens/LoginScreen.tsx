import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '../components/AppThemeProvider';
import AuthTextField from '../components/AuthTextField';
import GoogleSignInButton from '../components/GoogleSignInButton';
import PrimaryButton from '../components/PrimaryButton';
import { APP_NAME } from '../constants/branding';
import { AuthServiceError } from '../services/authHelpers';
import { loginWithEmail } from '../services/authService';
import { sendPasswordlessEmailLink } from '../services/emailLinkAuthService';
import type { RootStackParamList } from '../navigation/types';

type LoginScreenProps = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation, route }: LoginScreenProps) {
  const { colors, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const [email, setEmail] = useState(route.params?.prefillEmail ?? '');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(
    route.params?.notice ?? null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingLink, setIsSendingLink] = useState(false);

  useEffect(() => {
    if (route.params?.prefillEmail) {
      setEmail(route.params.prefillEmail);
    }

    if (route.params?.notice) {
      setNoticeMessage(route.params.notice);
    }
  }, [route.params?.notice, route.params?.prefillEmail]);

  const handleLogin = async () => {
    setErrorMessage(null);
    setNoticeMessage(null);
    setIsSubmitting(true);

    try {
      await loginWithEmail({ email, password });
    } catch (error) {
      setErrorMessage(
        error instanceof AuthServiceError
          ? error.message
          : 'We could not log you in right now.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailLink = async () => {
    setErrorMessage(null);
    setNoticeMessage(null);
    setIsSendingLink(true);

    try {
      const message = await sendPasswordlessEmailLink(email);
      setNoticeMessage(message);
    } catch (error) {
      setErrorMessage(
        error instanceof AuthServiceError
          ? error.message
          : 'We could not send a sign-in link right now.'
      );
    } finally {
      setIsSendingLink(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Welcome Back</Text>
          <Text style={styles.title}>Log in to {APP_NAME}</Text>
          <Text style={styles.subtitle}>
            Use your password, a passwordless email link, or continue with Google through
            Firebase Authentication.
          </Text>
        </View>

        <View style={styles.card}>
          <AuthTextField
            autoComplete="email"
            errorMessage={null}
            keyboardType="email-address"
            label="Email"
            onChangeText={setEmail}
            placeholder="you@example.com"
            value={email}
          />
          {noticeMessage ? <Text style={styles.noticeText}>{noticeMessage}</Text> : null}
          <AuthTextField
            autoComplete="password"
            errorMessage={errorMessage}
            label="Password"
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry
            value={password}
          />
          <PrimaryButton
            disabled={isSubmitting}
            label={isSubmitting ? 'Logging In...' : 'Log In'}
            onPress={() => void handleLogin()}
          />

          <Pressable onPress={() => navigation.navigate('ResetPassword')} style={styles.link}>
            <Text style={styles.linkText}>Forgot password?</Text>
          </Pressable>
          <Pressable disabled={isSendingLink} onPress={() => void handleEmailLink()} style={styles.link}>
            <Text style={styles.linkText}>
              {isSendingLink ? 'Sending sign-in link...' : 'Email me a sign-in link'}
            </Text>
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <GoogleSignInButton />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Do not have an account yet?</Text>
          <Pressable onPress={() => navigation.navigate('SignUp')}>
            <Text style={styles.footerLink}>Create one with email</Text>
          </Pressable>
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
  header: {
    gap: 10,
    paddingTop: 12,
  },
  link: {
    alignSelf: 'flex-start',
  },
  linkText: {
    color: colors.primary,
    fontFamily: typography.accentFontFamily,
    fontSize: 14,
    fontWeight: '700',
  },
  noticeText: {
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
