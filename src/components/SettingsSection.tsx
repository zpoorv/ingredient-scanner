import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useI18n } from './AppLanguageProvider';
import { useAppTheme } from './AppThemeProvider';

type SettingsSectionProps = PropsWithChildren<{
  description?: string;
  title: string;
}>;

export default function SettingsSection({
  children,
  description,
  title,
}: SettingsSectionProps) {
  const { t } = useI18n();
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title}>{t(title)}</Text>
        {description ? <Text style={styles.description}>{t(description)}</Text> : null}
      </View>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>['colors']) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 20,
      borderWidth: 1,
      overflow: 'hidden',
    },
    description: {
      color: colors.textMuted,
      fontSize: 14,
      lineHeight: 20,
    },
    header: {
      gap: 6,
    },
    section: {
      gap: 12,
    },
    title: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
    },
  });
