import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useI18n } from './AppLanguageProvider';
import { useAppTheme } from './AppThemeProvider';

type FeatureTipCardProps = {
  actionLabel?: string;
  body: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onAction?: () => void;
  onDismiss: () => void;
  title: string;
  visible: boolean;
};

export default function FeatureTipCard({
  actionLabel,
  body,
  icon = 'sparkles-outline',
  onAction,
  onDismiss,
  title,
  visible,
}: FeatureTipCardProps) {
  const { t } = useI18n();
  const { colors, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Ionicons color={colors.primary} name={icon} size={18} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.label}>{t('Quick guide')}</Text>
          <Text style={styles.title}>{t(title)}</Text>
        </View>
        <Pressable
          accessibilityLabel={t('Quick guide')}
          accessibilityRole="button"
          onPress={onDismiss}
          style={styles.closeButton}
        >
          <Ionicons color={colors.textMuted} name="close" size={18} />
        </Pressable>
      </View>
      <Text style={styles.body}>{t(body)}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} style={styles.action}>
          <Text style={styles.actionText}>{t(actionLabel)}</Text>
        </Pressable>
      ) : (
        <Pressable onPress={onDismiss} style={styles.action}>
          <Text style={styles.actionText}>{t('Got it')}</Text>
        </Pressable>
      )}
    </View>
  );
}

const createStyles = (
  colors: ReturnType<typeof useAppTheme>['colors'],
  typography: ReturnType<typeof useAppTheme>['typography']
) =>
  StyleSheet.create({
    action: {
      alignSelf: 'flex-start',
      backgroundColor: colors.primaryMuted,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    actionText: {
      color: colors.primary,
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    body: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 14,
      lineHeight: 21,
    },
    card: {
      backgroundColor: colors.primaryMuted,
      borderColor: colors.primary,
      borderRadius: 22,
      borderWidth: 1,
      gap: 10,
      padding: 16,
    },
    closeButton: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 16,
      height: 34,
      justifyContent: 'center',
      width: 34,
    },
    copy: {
      flex: 1,
      gap: 2,
    },
    header: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 10,
    },
    iconWrap: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 16,
      height: 36,
      justifyContent: 'center',
      width: 36,
    },
    label: {
      color: colors.primary,
      fontFamily: typography.accentFontFamily,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    title: {
      color: colors.text,
      fontFamily: typography.headingFontFamily,
      fontSize: 17,
      fontWeight: '800',
    },
  });
