import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useI18n } from './AppLanguageProvider';
import { useAppTheme } from './AppThemeProvider';
import { AuthServiceError } from '../services/authHelpers';
import { signInWithGoogleIdToken } from '../services/authService';
import {
  getFirebaseConfigurationError,
  getGoogleConfigurationError
} from '../services/firebaseApp';
import {
  getGoogleSignInSetupError,
  mapGoogleSignInError,
  signInWithNativeGoogle,
} from '../services/googleSignInService';

type GoogleSignInButtonProps = {
  label?: string;
};

export default function GoogleSignInButton({
  label = 'Continue with Google',
}: GoogleSignInButtonProps) {
  const { t } = useI18n();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGooglePress = async () => {
    const configurationError =
      getFirebaseConfigurationError() ||
      getGoogleConfigurationError() ||
      getGoogleSignInSetupError();

    if (configurationError) {
      setErrorMessage(configurationError);
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const googleResult = await signInWithNativeGoogle();

      if (googleResult.cancelled) {
        setIsSubmitting(false);
        return;
      }

      await signInWithGoogleIdToken(googleResult.idToken);
    } catch (error) {
      setErrorMessage(
        error instanceof AuthServiceError
          ? error.message
          : mapGoogleSignInError(error)
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <Pressable
        accessibilityRole="button"
        disabled={isSubmitting}
        onPress={() => void handleGooglePress()}
        style={({ pressed }) => [
          styles.button,
          isSubmitting && styles.buttonDisabled,
          pressed && !isSubmitting && styles.buttonPressed,
        ]}
      >
        {isSubmitting ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Text style={styles.buttonText}>{t(label)}</Text>
        )}
      </Pressable>
      {errorMessage ? <Text style={styles.errorText}>{t(errorMessage)}</Text> : null}
    </View>
  );
}

const createStyles = (
  colors: ReturnType<typeof useAppTheme>['colors']
) =>
  StyleSheet.create({
    button: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 999,
      borderWidth: 1,
      justifyContent: 'center',
      minHeight: 54,
      paddingHorizontal: 20,
      width: '100%',
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonPressed: {
      opacity: 0.9,
    },
    buttonText: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '700',
    },
    errorText: {
      color: colors.danger,
      fontSize: 13,
      fontWeight: '600',
      lineHeight: 18,
    },
    wrapper: {
      gap: 10,
    },
  });
