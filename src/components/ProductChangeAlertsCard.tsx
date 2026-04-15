import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useI18n } from './AppLanguageProvider';
import type { ProductChangeAlert } from '../models/productChangeAlert';
import { useAppTheme } from './AppThemeProvider';

type ProductChangeAlertsCardProps = {
  alerts: ProductChangeAlert[];
  onOpenAlert?: (alert: ProductChangeAlert) => void;
};

export default function ProductChangeAlertsCard({
  alerts,
  onOpenAlert,
}: ProductChangeAlertsCardProps) {
  const { t } = useI18n();
  const { colors, typography } = useAppTheme();
  const styles = createStyles(colors, typography);

  if (alerts.length === 0) {
    return null;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{t('Changed products')}</Text>
      {alerts.slice(0, 3).map((alert) => (
        <Pressable
          key={alert.id}
          onPress={() => onOpenAlert?.(alert)}
          style={styles.item}
        >
          <Text style={styles.title}>{alert.name}</Text>
          <Text style={styles.body}>{t(alert.summary)}</Text>
        </Pressable>
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
      fontSize: 13,
      lineHeight: 19,
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
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: 18,
      borderWidth: 1,
      gap: 4,
      padding: 14,
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
      fontSize: 15,
      fontWeight: '700',
    },
  });
