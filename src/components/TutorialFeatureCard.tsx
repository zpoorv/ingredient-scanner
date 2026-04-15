import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useI18n } from './AppLanguageProvider';
import { useAppTheme } from './AppThemeProvider';

type TutorialFeatureCardProps = {
  body: string;
  icon: keyof typeof Ionicons.glyphMap;
  stepLabel?: string;
  task?: string;
  title: string;
};

export default function TutorialFeatureCard({
  body,
  icon,
  stepLabel,
  task,
  title,
}: TutorialFeatureCardProps) {
  const { t } = useI18n();
  const { colors, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);

  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <Ionicons color={colors.primary} name={icon} size={20} />
      </View>
      <View style={styles.copy}>
        {stepLabel ? <Text style={styles.stepLabel}>{t(stepLabel)}</Text> : null}
        <Text style={styles.title}>{t(title)}</Text>
        <Text style={styles.body}>{t(body)}</Text>
        {task ? (
          <View style={styles.taskPill}>
            <Ionicons color={colors.primary} name="checkmark-circle-outline" size={15} />
            <Text style={styles.taskText}>{t(task)}</Text>
          </View>
        ) : null}
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
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 14,
      lineHeight: 20,
    },
    card: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 22,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 14,
      padding: 16,
    },
    copy: {
      flex: 1,
      gap: 4,
    },
    iconWrap: {
      alignItems: 'center',
      backgroundColor: colors.primaryMuted,
      borderRadius: 18,
      height: 42,
      justifyContent: 'center',
      width: 42,
    },
    stepLabel: {
      color: colors.primary,
      fontFamily: typography.accentFontFamily,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    taskPill: {
      alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: colors.primaryMuted,
      borderRadius: 999,
      flexDirection: 'row',
      gap: 6,
      marginTop: 4,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    taskText: {
      color: colors.primary,
      flexShrink: 1,
      fontFamily: typography.bodyFontFamily,
      fontSize: 12,
      fontWeight: '700',
    },
    title: {
      color: colors.text,
      fontFamily: typography.headingFontFamily,
      fontSize: 16,
      fontWeight: '800',
    },
  });
