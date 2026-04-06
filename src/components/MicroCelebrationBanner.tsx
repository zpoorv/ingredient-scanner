import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { GamificationCelebration } from '../models/gamification';
import { useAppTheme } from './AppThemeProvider';

type MicroCelebrationBannerProps = {
  celebration: GamificationCelebration | null;
};

export default function MicroCelebrationBanner({
  celebration,
}: MicroCelebrationBannerProps) {
  const { colors, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);

  if (!celebration) {
    return null;
  }

  const accentColor =
    celebration.tone === 'good' ? colors.success : colors.primary;
  const backgroundColor =
    celebration.tone === 'good' ? colors.successMuted : colors.primaryMuted;

  return (
    <View style={[styles.card, { backgroundColor }]}>
      <View style={[styles.iconWrap, { backgroundColor: accentColor }]}>
        <Ionicons color={colors.surface} name="sparkles" size={14} />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.title, { color: accentColor }]}>{celebration.title}</Text>
        <Text style={styles.body}>{celebration.body}</Text>
      </View>
    </View>
  );
}

const createStyles = (
  colors: ReturnType<typeof useAppTheme>['colors'],
  typography: ReturnType<typeof useAppTheme>['typography']
) =>
  StyleSheet.create({
    body: {
      color: colors.text,
      fontFamily: typography.bodyFontFamily,
      fontSize: 13,
      lineHeight: 18,
    },
    card: {
      alignItems: 'flex-start',
      borderRadius: 18,
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    copy: {
      flex: 1,
      gap: 2,
    },
    iconWrap: {
      alignItems: 'center',
      borderRadius: 999,
      height: 24,
      justifyContent: 'center',
      marginTop: 1,
      width: 24,
    },
    title: {
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
  });
