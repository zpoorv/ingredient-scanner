import { StyleSheet, Text, View } from 'react-native';

import type { AppColors } from '../constants/theme';
import type { HistoryInsight } from '../utils/historyPersonalization';

type HistoryInsightsCardProps = {
  colors: AppColors;
  insights: HistoryInsight[];
};

function getToneColor(colors: AppColors, tone: HistoryInsight['tone']) {
  if (tone === 'good') {
    return colors.success;
  }

  if (tone === 'warning') {
    return colors.danger;
  }

  return colors.warning;
}

export default function HistoryInsightsCard({
  colors,
  insights,
}: HistoryInsightsCardProps) {
  const styles = createStyles(colors);

  if (insights.length === 0) {
    return null;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Insights</Text>
      <Text style={styles.title}>Recent patterns</Text>
      {insights.map((insight) => (
        <View key={insight.id} style={styles.insightRow}>
          <View
            style={[
              styles.insightDot,
              { backgroundColor: getToneColor(colors, insight.tone) },
            ]}
          />
          <View style={styles.insightTextBlock}>
            <Text style={styles.insightTitle}>{insight.title}</Text>
            <Text style={styles.insightBody}>{insight.body}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 24,
      borderWidth: 1,
      gap: 14,
      padding: 20,
    },
    insightBody: {
      color: colors.textMuted,
      fontSize: 14,
      lineHeight: 20,
    },
    insightDot: {
      borderRadius: 999,
      height: 10,
      marginTop: 7,
      width: 10,
    },
    insightRow: {
      flexDirection: 'row',
      gap: 12,
    },
    insightTextBlock: {
      flex: 1,
      gap: 4,
    },
    insightTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
    },
    label: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    title: {
      color: colors.text,
      fontSize: 22,
      fontWeight: '800',
      lineHeight: 27,
    },
  });
