import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useI18n } from './AppLanguageProvider';
import { useAppTheme } from './AppThemeProvider';
import type { EnvironmentalImpactInsight } from '../utils/environmentalImpact';

type EnvironmentalImpactCardProps = {
  insight: EnvironmentalImpactInsight;
};

function getToneColors(
  colors: ReturnType<typeof useAppTheme>['colors'],
  tone: EnvironmentalImpactInsight['tone']
) {
  if (tone === 'good') {
    return {
      backgroundColor: colors.successMuted,
      textColor: colors.success,
    };
  }

  if (tone === 'warning') {
    return {
      backgroundColor: colors.warningMuted,
      textColor: colors.warning,
    };
  }

  return {
    backgroundColor: colors.primaryMuted,
    textColor: colors.primary,
  };
}

export default function EnvironmentalImpactCard({
  insight,
}: EnvironmentalImpactCardProps) {
  const { t } = useI18n();
  const { colors, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const toneColors = getToneColors(colors, insight.tone);

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{t('Environmental View')}</Text>
      <Text style={styles.title}>{t(insight.title)}</Text>
      <Text style={styles.summary}>{t(insight.summary)}</Text>
      <View style={styles.highlightWrap}>
        {insight.highlights.map((highlight) => (
          <View
            key={highlight}
            style={[styles.highlightChip, { backgroundColor: toneColors.backgroundColor }]}
          >
            <Text style={[styles.highlightText, { color: toneColors.textColor }]}>
              {t(highlight)}
            </Text>
          </View>
        ))}
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
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 24,
      borderWidth: 1,
      gap: 12,
      padding: 20,
    },
    highlightChip: {
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    highlightText: {
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '800',
    },
    highlightWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    label: {
      color: colors.primary,
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    summary: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 14,
      lineHeight: 21,
    },
    title: {
      color: colors.text,
      fontFamily: typography.headingFontFamily,
      fontSize: 20,
      fontWeight: '700',
      lineHeight: 25,
    },
  });
