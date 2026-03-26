import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import AuthTextField from '../components/AuthTextField';
import GoogleSignInButton from '../components/GoogleSignInButton';
import PrimaryButton from '../components/PrimaryButton';
import { APP_NAME } from '../constants/branding';
import { colors } from '../constants/colors';
import { AuthServiceError, signUpWithEmail } from '../services/authService';
import type { RootStackParamList } from '../navigation/types';

type SignUpScreenProps = NativeStackScreenProps<RootStackParamList, 'SignUp'>;

export default function SignUpScreen({ navigation }: SignUpScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignUp = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await signUpWithEmail({ email, password, passwordConfirmation });
    } catch (error) {
      setErrorMessage(
        error instanceof AuthServiceError
          ? error.message
          : 'We could not create your account right now.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Create Account</Text>
          <Text style={styles.title}>Create your {APP_NAME} account</Text>
          <Text style={styles.subtitle}>
            Sign up with email and password, or use Google through Firebase Authentication.
          </Text>
        </View>

        <View style={styles.card}>
          <AuthTextField
            autoComplete="email"
            keyboardType="email-address"
            label="Email"
            onChangeText={setEmail}
            placeholder="you@example.com"
            value={email}
          />
          <AuthTextField
            autoComplete="new-password"
            label="Password"
            onChangeText={setPassword}
            placeholder="Use at least 8 characters"
            secureTextEntry
            value={password}
          />
          <AuthTextField
            autoComplete="new-password"
            errorMessage={errorMessage}
            label="Confirm Password"
            onChangeText={setPasswordConfirmation}
            placeholder="Re-enter your password"
            secureTextEntry
            value={passwordConfirmation}
          />
          <PrimaryButton
            disabled={isSubmitting}
            label={isSubmitting ? 'Creating Account...' : 'Create Account'}
            onPress={() => void handleSignUp()}
          />

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <GoogleSignInButton label="Continue with Google" />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <Pressable onPress={() => navigation.navigate('Login')}>
            <Text style={styles.footerLink}>Log in</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  eyebrow: {
    color: colors.primary,
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
    fontSize: 15,
    fontWeight: '700',
  },
  footerText: {
    color: colors.textMuted,
    fontSize: 14,
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
    fontSize: 15,
    lineHeight: 22,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 36,
  },
});
