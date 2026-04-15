import { StyleSheet, Text, View } from 'react-native';

import { useI18n } from './AppLanguageProvider';
import { useAppTheme } from './AppThemeProvider';
import type { RestrictionMatch } from '../utils/restrictionMatching';

type ProductRestrictionCardProps = {
  matches: RestrictionMatch[];
  selectedLabels: string[];
  summary: string;
  tone: 'clear' | 'caution' | 'avoid';
};

export default function ProductRestrictionCard({
  matches,
  selectedLabels,
  summary,
  tone,
}: ProductRestrictionCardProps) {
  const { t } = useI18n();
  const { colors, typography } = useAppTheme();
  const styles = createStyles(colors, typography);
  const toneColor =
    tone === 'avoid' ? colors.danger : tone === 'caution' ? colors.warning : colors.success;
  const toneBackground =
    tone === 'avoid'
      ? colors.dangerMuted
      : tone === 'caution'
        ? colors.warningMuted
        : colors.successMuted;

  const detailText =
    matches.length > 0
      ? Array.from(new Set(matches.map((match) => match.label))).join(', ')
      : selectedLabels.join(', ');

  return (
    <View style={[styles.card, { backgroundColor: toneBackground, borderColor: toneColor }]}>
      <Text style={[styles.label, { color: toneColor }]}>{t('Your food filters')}</Text>
      <Text style={styles.summary}>{t(summary)}</Text>
      {detailText ? <Text style={styles.detail}>{t(detailText)}</Text> : null}
    </View>
  );
}

const createStyles = (
  colors: ReturnType<typeof useAppTheme>['colors'],
  typography: ReturnType<typeof useAppTheme>['typography']
) =>
  StyleSheet.create({
    card: {
      borderRadius: 24,
      borderWidth: 1,
      gap: 8,
      padding: 18,
    },
    detail: {
      color: colors.text,
      fontFamily: typography.bodyFontFamily,
      fontSize: 14,
      lineHeight: 21,
    },
    label: {
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.3,
      textTransform: 'uppercase',
    },
    summary: {
      color: colors.text,
      fontFamily: typography.headingFontFamily,
      fontSize: 16,
      fontWeight: '700',
      lineHeight: 22,
    },
  });
