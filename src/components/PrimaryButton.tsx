import { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useI18n } from './AppLanguageProvider';
import { useAppTheme } from './AppThemeProvider';
import TutorialTarget from './TutorialTarget';
import {
  advanceGuidedTutorialFromTarget,
  type GuidedTutorialTargetId,
} from '../services/guidedTutorialService';

type PrimaryButtonProps = {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  tutorialTargetId?: GuidedTutorialTargetId;
};

export default function PrimaryButton({
  disabled = false,
  label,
  onPress,
  tutorialTargetId,
}: PrimaryButtonProps) {
  const { t } = useI18n();
  const { colors, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);

  const handlePress = () => {
    if (tutorialTargetId) {
      advanceGuidedTutorialFromTarget(tutorialTargetId);
    }

    onPress();
  };

  return (
    <TutorialTarget targetId={tutorialTargetId}>
      <Pressable
        accessibilityRole="button"
        android_ripple={{ color: colors.primaryMuted }}
        disabled={disabled}
        onPress={handlePress}
        style={({ pressed }) => [
          styles.button,
          disabled && styles.buttonDisabled,
          pressed && !disabled && styles.buttonPressed,
        ]}
      >
        <Text style={styles.label}>{t(label)}</Text>
      </Pressable>
    </TutorialTarget>
  );
}

const createStyles = (
  colors: ReturnType<typeof useAppTheme>['colors'],
  typography: ReturnType<typeof useAppTheme>['typography']
) =>
  StyleSheet.create({
    button: {
      alignItems: 'center',
      backgroundColor: colors.primary,
      borderBottomColor: colors.border,
      borderBottomWidth: 1,
      borderRadius: 999,
      minHeight: 54,
      justifyContent: 'center',
      paddingHorizontal: 24,
      width: '100%',
    },
    buttonDisabled: {
      backgroundColor: colors.textMuted,
    },
    buttonPressed: {
      opacity: 0.9,
    },
    label: {
      color: colors.surface,
      fontFamily: typography.accentFontFamily,
      fontSize: 16,
      fontWeight: '700',
    },
  });
