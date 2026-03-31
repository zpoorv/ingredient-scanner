import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from './AppThemeProvider';
import PrimaryButton from './PrimaryButton';

type SubscriptionOptionCardProps = {
  badge?: string;
  buttonLabel: string;
  description: string;
  disabled?: boolean;
  isCurrent?: boolean;
  onPress: () => void;
  periodLabel: string;
  priceLabel: string;
  title: string;
};

export default function SubscriptionOptionCard({
  badge,
  buttonLabel,
  description,
  disabled = false,
  isCurrent = false,
  onPress,
  periodLabel,
  priceLabel,
  title,
}: SubscriptionOptionCardProps) {
  const { colors, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);

  return (
    <View style={[styles.card, isCurrent && styles.cardCurrent]}>
      <View style={styles.headerRow}>
        <View style={styles.copy}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.periodLabel}>{periodLabel}</Text>
        </View>
        <View style={styles.priceBlock}>
          {badge ? <Text style={styles.badge}>{badge}</Text> : null}
          <Text style={styles.priceLabel}>{priceLabel}</Text>
        </View>
      </View>
      <Text style={styles.description}>{description}</Text>
      <PrimaryButton
        disabled={disabled}
        label={isCurrent ? 'Current Plan' : buttonLabel}
        onPress={onPress}
      />
    </View>
  );
}

const createStyles = (
  colors: ReturnType<typeof useAppTheme>['colors'],
  typography: ReturnType<typeof useAppTheme>['typography']
) =>
  StyleSheet.create({
    badge: {
      color: colors.primary,
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 22,
      borderWidth: 1,
      gap: 14,
      padding: 18,
    },
    cardCurrent: {
      borderColor: colors.primary,
      shadowColor: colors.primary,
      shadowOpacity: 0.12,
      shadowRadius: 16,
    },
    copy: {
      flex: 1,
      gap: 4,
    },
    description: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 14,
      lineHeight: 20,
    },
    headerRow: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      gap: 12,
      justifyContent: 'space-between',
    },
    periodLabel: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 13,
      lineHeight: 18,
    },
    priceBlock: {
      alignItems: 'flex-end',
      gap: 4,
    },
    priceLabel: {
      color: colors.text,
      fontFamily: typography.headingFontFamily,
      fontSize: 20,
      fontWeight: '800',
    },
    title: {
      color: colors.text,
      fontFamily: typography.headingFontFamily,
      fontSize: 18,
      fontWeight: '800',
    },
  });
