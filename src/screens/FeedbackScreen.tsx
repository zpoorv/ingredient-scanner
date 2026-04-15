import { useEffect, useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useI18n } from '../components/AppLanguageProvider';
import { useAppTheme } from '../components/AppThemeProvider';
import PrimaryButton from '../components/PrimaryButton';
import { APP_NAME, SUPPORT_EMAIL } from '../constants/branding';
import { loadAdminAppConfig } from '../services/adminAppConfigService';

export default function FeedbackScreen() {
  const { t } = useI18n();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [message, setMessage] = useState('');
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

  const handleSendFeedback = async () => {
    const subject = encodeURIComponent(`${APP_NAME} feedback`);
    const body = encodeURIComponent(message || t('Shared from the Inqoura feedback screen.'));

    await Linking.openURL(`mailto:${supportEmail}?subject=${subject}&body=${body}`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>{t('Feedback')}</Text>
        <Text style={styles.title}>{t('Tell us what to improve')}</Text>
        <View style={styles.card}>
          {supportMessage ? <Text style={styles.subtitle}>{t(supportMessage)}</Text> : null}
          <TextInput
            multiline
            onChangeText={setMessage}
            placeholder={t('Share bugs, missing features, or ideas...')}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            textAlignVertical="top"
            value={message}
          />
          <PrimaryButton label="Send Feedback" onPress={() => void handleSendFeedback()} />
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
    input: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: 18,
      borderWidth: 1,
      color: colors.text,
      fontSize: 15,
      minHeight: 150,
      paddingHorizontal: 16,
      paddingVertical: 16,
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
      fontSize: 28,
      fontWeight: '800',
      lineHeight: 34,
    },
  });
