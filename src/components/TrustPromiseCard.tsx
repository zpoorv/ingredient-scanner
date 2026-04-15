import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useI18n } from './AppLanguageProvider';
import { useAppTheme } from './AppThemeProvider';

type TrustPromiseCardProps = {
  compact?: boolean;
};

const TRUST_POINTS = [
  'No paid brand placement changes your score or hides cautions.',
  'Premium adds deeper guidance, not better grades.',
  'Any product can be flagged for a manual trust review.',
];

export default function TrustPromiseCard({
  compact = false,
}: TrustPromiseCardProps) {
  const { t } = useI18n();
  const { colors, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, typography, compact), [colors, typography, compact]);

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{t('Trust Promise')}</Text>
      <Text style={styles.title}>{t('Scores stay independent')}</Text>
      {TRUST_POINTS.map((point) => (
        <View key={point} style={styles.pointRow}>
          <View style={styles.dot} />
          <Text style={styles.pointText}>{t(point)}</Text>
        </View>
      ))}
    </View>
  );
}

const createStyles = (
  colors: ReturnType<typeof useAppTheme>['colors'],
  typography: ReturnType<typeof useAppTheme>['typography'],
  compact: boolean
) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 24,
      borderWidth: 1,
      gap: compact ? 10 : 12,
      padding: compact ? 18 : 20,
    },
    dot: {
      backgroundColor: colors.primary,
      borderRadius: 999,
      height: 8,
      marginTop: 6,
      width: 8,
    },
    label: {
      color: colors.primary,
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    pointRow: {
      flexDirection: 'row',
      gap: 10,
    },
    pointText: {
      color: colors.textMuted,
      flex: 1,
      fontFamily: typography.bodyFontFamily,
      fontSize: 14,
      lineHeight: 20,
    },
    title: {
      color: colors.text,
      fontFamily: typography.headingFontFamily,
      fontSize: compact ? 18 : 20,
      fontWeight: '700',
      lineHeight: compact ? 23 : 25,
    },
  });
