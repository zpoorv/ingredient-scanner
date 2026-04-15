import { StyleSheet, Text, View } from 'react-native';

import { useI18n } from './AppLanguageProvider';
import { useAppTheme } from './AppThemeProvider';
import type { HistoryNotification } from '../utils/historyPersonalization';

type HistoryNotificationsCardProps = {
  notifications: HistoryNotification[];
};

export default function HistoryNotificationsCard({
  notifications,
}: HistoryNotificationsCardProps) {
  const { t } = useI18n();
  const { colors, typography } = useAppTheme();
  const styles = createStyles(colors, typography);

  if (notifications.length === 0) {
    return null;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{t('Shopping Nudges')}</Text>
      {notifications.map((notification) => (
        <View key={notification.id} style={styles.item}>
          <Text style={styles.title}>{t(notification.title)}</Text>
          <Text style={styles.body}>{t(notification.body)}</Text>
        </View>
      ))}
    </View>
  );
}

const createStyles = (
  colors: ReturnType<typeof useAppTheme>['colors'],
  typography: ReturnType<typeof useAppTheme>['typography']
) =>
  StyleSheet.create({
    body: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 14,
      lineHeight: 21,
    },
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 24,
      borderWidth: 1,
      gap: 12,
      padding: 18,
    },
    item: {
      gap: 4,
    },
    label: {
      color: colors.primary,
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.3,
      textTransform: 'uppercase',
    },
    title: {
      color: colors.text,
      fontFamily: typography.headingFontFamily,
      fontSize: 16,
      fontWeight: '800',
      lineHeight: 22,
    },
  });
