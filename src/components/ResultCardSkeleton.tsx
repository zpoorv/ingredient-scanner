import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useAppTheme } from './AppThemeProvider';

type ResultCardSkeletonProps = {
  compact?: boolean;
};

export default function ResultCardSkeleton({
  compact = false,
}: ResultCardSkeletonProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <View style={[styles.line, styles.lineShort]} />
      <View style={[styles.line, styles.lineMedium]} />
      <View style={[styles.line, styles.lineFull]} />
      {!compact ? (
        <View style={styles.chipRow}>
          <View style={[styles.chip, styles.chipWide]} />
          <View style={styles.chip} />
          <View style={[styles.chip, styles.chipMedium]} />
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (
  colors: ReturnType<typeof useAppTheme>['colors']
) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.background,
      borderRadius: 18,
      gap: 12,
      padding: 18,
    },
    cardCompact: {
      gap: 10,
      paddingVertical: 16,
    },
    chip: {
      backgroundColor: colors.border,
      borderRadius: 999,
      height: 32,
      width: 92,
    },
    chipMedium: {
      width: 116,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginTop: 4,
    },
    chipWide: {
      width: 132,
    },
    line: {
      backgroundColor: colors.border,
      borderRadius: 999,
      height: 14,
    },
    lineFull: {
      width: '100%',
    },
    lineMedium: {
      width: '72%',
    },
    lineShort: {
      width: '44%',
    },
  });
