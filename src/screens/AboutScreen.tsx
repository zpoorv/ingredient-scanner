import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';

import { useI18n } from '../components/AppLanguageProvider';
import { useAppTheme } from '../components/AppThemeProvider';
import TrustPromiseCard from '../components/TrustPromiseCard';
import { APP_NAME } from '../constants/branding';

export default function AboutScreen() {
  const { t } = useI18n();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>{t('About')}</Text>
        <Text style={styles.title}>{APP_NAME}</Text>
        <View style={styles.card}>
          <Text style={styles.body}>
            {t('Scan products, check ingredients, and get trust-backed grocery guidance.')}
          </Text>
          <Text style={styles.body}>
            {t(
              'Inqoura is built so scores stay independent. Premium adds deeper explanations and habit help, not better grades.'
            )}
          </Text>
          <Text style={styles.meta}>
            {t('Version')}: {Constants.expoConfig?.version ?? '1.0.0'}
          </Text>
        </View>
        <TrustPromiseCard compact />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (
  colors: ReturnType<typeof useAppTheme>['colors']
) =>
  StyleSheet.create({
    body: {
      color: colors.text,
      fontSize: 15,
      lineHeight: 22,
    },
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 24,
      borderWidth: 1,
      gap: 12,
      padding: 20,
    },
    content: {
      gap: 20,
      padding: 24,
    },
    eyebrow: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    meta: {
      color: colors.textMuted,
      fontSize: 14,
    },
    safeArea: {
      backgroundColor: colors.background,
      flex: 1,
    },
    title: {
      color: colors.text,
      fontSize: 28,
      fontWeight: '800',
      lineHeight: 34,
    },
  });
