import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useI18n } from './AppLanguageProvider';
import { useAppTheme } from './AppThemeProvider';
import PrimaryButton from './PrimaryButton';

type NoInternetScreenProps = {
  actionLabel?: string;
  subtitle?: string;
  title?: string;
  onRetry?: () => void;
};

export default function NoInternetScreen({
  actionLabel = 'Try Again',
  subtitle = 'Reconnect to the internet and try again.',
  title = 'No internet connection',
  onRetry,
}: NoInternetScreenProps) {
  const { t } = useI18n();
  const { colors, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.glow} />
        <View style={styles.card}>
          <Text style={styles.eyebrow}>{t('Offline')}</Text>
          <Text style={styles.title}>{t(title)}</Text>
          <Text style={styles.subtitle}>{t(subtitle)}</Text>
          {onRetry ? <PrimaryButton label={actionLabel} onPress={onRetry} /> : null}
        </View>
      </View>
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
      borderRadius: 28,
      borderWidth: 1,
      gap: 14,
      maxWidth: 360,
      padding: 24,
      width: '100%',
    },
    container: {
      alignItems: 'center',
      backgroundColor: colors.background,
      flex: 1,
      justifyContent: 'center',
      padding: 24,
    },
    eyebrow: {
      color: colors.primary,
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    glow: {
      backgroundColor: colors.primaryMuted,
      borderRadius: 180,
      height: 220,
      opacity: 0.65,
      position: 'absolute',
      width: 220,
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
      fontSize: 28,
      fontWeight: '800',
      lineHeight: 34,
    },
  });
