import { useMemo } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { useI18n } from './AppLanguageProvider';
import { useAppTheme } from './AppThemeProvider';

type AuthTextFieldProps = {
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoComplete?:
    | 'email'
    | 'password'
    | 'new-password'
    | 'off'
    | 'username';
  editable?: boolean;
  errorMessage?: string | null;
  keyboardType?: 'default' | 'email-address' | 'number-pad';
  label: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  value: string;
};

export default function AuthTextField({
  autoCapitalize = 'none',
  autoComplete = 'off',
  editable = true,
  errorMessage,
  keyboardType = 'default',
  label,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  value,
}: AuthTextFieldProps) {
  const { t } = useI18n();
  const { colors, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{t(label)}</Text>
      <TextInput
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        autoCorrect={false}
        editable={editable}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={t(placeholder)}
        placeholderTextColor={colors.textMuted}
        secureTextEntry={secureTextEntry}
        style={[styles.input, errorMessage && styles.inputError]}
        value={value}
      />
      {errorMessage ? <Text style={styles.errorText}>{t(errorMessage)}</Text> : null}
    </View>
  );
}

const createStyles = (
  colors: ReturnType<typeof useAppTheme>['colors'],
  typography: ReturnType<typeof useAppTheme>['typography']
) =>
  StyleSheet.create({
    errorText: {
      color: colors.danger,
      fontFamily: typography.bodyFontFamily,
      fontSize: 13,
      fontWeight: '600',
      lineHeight: 18,
    },
    field: {
      gap: 8,
    },
    input: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: 16,
      borderWidth: 1,
      color: colors.text,
      fontFamily: typography.bodyFontFamily,
      fontSize: 16,
      minHeight: 54,
      paddingHorizontal: 16,
    },
    inputError: {
      borderColor: colors.danger,
    },
    label: {
      color: colors.text,
      fontFamily: typography.headingFontFamily,
      fontSize: 14,
      fontWeight: '700',
    },
  });
