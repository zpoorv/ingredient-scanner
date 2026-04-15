import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useI18n } from '../components/AppLanguageProvider';
import { useAppTheme } from '../components/AppThemeProvider';
import { SUPPORT_EMAIL } from '../constants/branding';
import { loadAdminAppConfig } from '../services/adminAppConfigService';

const HELP_ITEMS = [
  'Scan a barcode or ingredient label.',
  'For best OCR results, keep the ingredient lines clear and close.',
  'Diet profile changes how products are scored.',
  'Your history is saved to your account.',
];

export default function HelpScreen() {
  const { t } = useI18n();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [supportEmail, setSupportEmail] = useState(SUPPORT_EMAIL);
  const [supportMessage, setSupportMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const restoreAdminConfig = async () => {
      const config = await loadAdminAppConfig();

      if (!isMounted) {
        return;
      }

      setSupportEmail(config.supportEmail || SUPPORT_EMAIL);
      setSupportMessage(config.resultSupportMessage);
    };

    void restoreAdminConfig();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>{t('Help')}</Text>
        <Text style={styles.title}>{t('Help')}</Text>
        <View style={styles.card}>
          {HELP_ITEMS.map((item) => (
            <View key={item} style={styles.item}>
              <View style={styles.dot} />
              <Text style={styles.itemText}>{t(item)}</Text>
            </View>
          ))}
          <View style={styles.item}>
            <View style={styles.dot} />
            <Text style={styles.itemText}>
              {supportEmail}
              {supportMessage ? ` — ${supportMessage}` : ''}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (
  colors: ReturnType<typeof useAppTheme>['colors']
) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 24,
      borderWidth: 1,
      gap: 14,
      padding: 20,
    },
    content: {
      gap: 20,
      padding: 24,
    },
    dot: {
      backgroundColor: colors.primary,
      borderRadius: 999,
      height: 8,
      marginTop: 6,
      width: 8,
    },
    eyebrow: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    item: {
      flexDirection: 'row',
      gap: 12,
    },
    itemText: {
      color: colors.text,
      flex: 1,
      fontSize: 15,
      lineHeight: 22,
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
