import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useI18n } from './AppLanguageProvider';
import { useAppTheme } from './AppThemeProvider';

type ScreenLoadingViewProps = {
  subtitle?: string;
  title?: string;
};

export default function ScreenLoadingView({
  subtitle = 'Preparing the next screen...',
  title = 'Loading',
}: ScreenLoadingViewProps) {
  const { t } = useI18n();
  const { colors, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.title}>{t(title)}</Text>
        <Text style={styles.subtitle}>{t(subtitle)}</Text>
      </View>
    </View>
  );
}

const createStyles = (
  colors: ReturnType<typeof useAppTheme>['colors'],
  typography: ReturnType<typeof useAppTheme>['typography']
) =>
  StyleSheet.create({
    card: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 24,
      borderWidth: 1,
      gap: 12,
      maxWidth: 320,
      paddingHorizontal: 24,
      paddingVertical: 28,
    },
    container: {
      alignItems: 'center',
      backgroundColor: colors.background,
      flex: 1,
      justifyContent: 'center',
      padding: 24,
    },
    subtitle: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 14,
      lineHeight: 21,
      textAlign: 'center',
    },
    title: {
      color: colors.text,
      fontFamily: typography.displayFontFamily,
      fontSize: 22,
      fontWeight: '800',
      textAlign: 'center',
    },
  });
