import { useMemo } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useI18n } from '../components/AppLanguageProvider';
import { useAppTheme } from '../components/AppThemeProvider';
import {
  ACCOUNT_DELETION_URL,
  PRIVACY_POLICY_URL,
  TERMS_OF_SERVICE_URL,
} from '../constants/branding';

export default function PrivacyPolicyScreen() {
  const { t } = useI18n();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>{t('Privacy')}</Text>
        <Text style={styles.title}>{t('Privacy')}</Text>
        <View style={styles.card}>
          <Text style={styles.body}>
            {t('Read the full privacy policy here.')}
          </Text>
          <Pressable onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)} style={styles.link}>
            <Text style={styles.linkText}>{t('Open privacy policy')}</Text>
          </Pressable>
          <Pressable onPress={() => void Linking.openURL(TERMS_OF_SERVICE_URL)} style={styles.link}>
            <Text style={styles.linkText}>{t('Open terms of use')}</Text>
          </Pressable>
          <Pressable onPress={() => void Linking.openURL(ACCOUNT_DELETION_URL)} style={styles.link}>
            <Text style={styles.linkText}>{t('Open account deletion page')}</Text>
          </Pressable>
        </View>
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
      gap: 16,
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
    link: {
      alignSelf: 'flex-start',
    },
    linkText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '700',
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
