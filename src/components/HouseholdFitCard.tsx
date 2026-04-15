import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useI18n } from './AppLanguageProvider';
import { useAppTheme } from './AppThemeProvider';
import type { HouseholdFitResult } from '../models/householdFit';

type HouseholdFitCardProps = {
  fit: HouseholdFitResult;
};

function getVerdictLabel(verdict: HouseholdFitResult['verdict']) {
  switch (verdict) {
    case 'works-for-everyone':
      return 'Works for everyone';
    case 'works-for-you-only':
      return 'Works for you only';
    case 'one-household-caution':
      return 'One household caution';
    default:
      return "Doesn't fit this household";
  }
}

export default function HouseholdFitCard({ fit }: HouseholdFitCardProps) {
  const { t } = useI18n();
  const { colors, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{t('Household fit')}</Text>
      <Text style={styles.title}>{t(getVerdictLabel(fit.verdict))}</Text>
      <Text style={styles.summary}>{t(fit.summary)}</Text>
      <View style={styles.memberList}>
        {fit.members.map((member) => (
          <View key={member.id} style={styles.memberRow}>
            <Text style={styles.memberName}>
              {member.name}
              {member.isActiveShopper ? ` • ${t('Shopping now')}` : ''}
            </Text>
            <Text style={styles.memberStatus}>
              {member.status === 'clear'
                ? t('Clear')
                : member.status === 'caution'
                  ? t('Caution')
                  : t('Avoid')}
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
      borderRadius: 22,
      borderWidth: 1,
      gap: 10,
      padding: 18,
    },
    label: {
      color: colors.primary,
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    memberList: {
      gap: 8,
    },
    memberName: {
      color: colors.text,
      flex: 1,
      fontFamily: typography.bodyFontFamily,
      fontSize: 14,
      fontWeight: '600',
    },
    memberRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 12,
    },
    memberStatus: {
      color: colors.textMuted,
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    summary: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 14,
      lineHeight: 20,
    },
    title: {
      color: colors.text,
      fontFamily: typography.headingFontFamily,
      fontSize: 20,
      fontWeight: '700',
    },
  });
