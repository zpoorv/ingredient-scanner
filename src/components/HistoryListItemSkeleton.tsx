import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useAppTheme } from './AppThemeProvider';

export default function HistoryListItemSkeleton() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleBlock}>
          <View style={[styles.line, styles.lineTitle]} />
          <View style={[styles.line, styles.lineMeta]} />
        </View>
        <View style={styles.scorePill} />
      </View>
      <View style={[styles.line, styles.lineSummary]} />
      <View style={[styles.line, styles.lineSummaryShort]} />
      <View style={styles.footerRow}>
        <View style={[styles.line, styles.lineFooter]} />
        <View style={styles.actionPill} />
      </View>
    </View>
  );
}

const createStyles = (
  colors: ReturnType<typeof useAppTheme>['colors']
) =>
  StyleSheet.create({
    actionPill: {
      backgroundColor: colors.border,
      borderRadius: 999,
      height: 28,
      width: 98,
    },
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 20,
      borderWidth: 1,
      gap: 12,
      padding: 18,
    },
    footerRow: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    headerRow: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      gap: 12,
    },
    line: {
      backgroundColor: colors.border,
      borderRadius: 999,
      height: 13,
    },
    lineFooter: {
      width: 112,
    },
    lineMeta: {
      width: '54%',
    },
    lineSummary: {
      width: '100%',
    },
    lineSummaryShort: {
      width: '78%',
    },
    lineTitle: {
      height: 18,
      width: '82%',
    },
    scorePill: {
      backgroundColor: colors.border,
      borderRadius: 999,
      height: 34,
      width: 82,
    },
    titleBlock: {
      flex: 1,
      gap: 10,
    },
  });
