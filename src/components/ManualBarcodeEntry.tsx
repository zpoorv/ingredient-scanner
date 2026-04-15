import { useMemo } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { useI18n } from './AppLanguageProvider';
import { useAppTheme } from './AppThemeProvider';
import PrimaryButton from './PrimaryButton';

type ManualBarcodeEntryProps = {
  disabled?: boolean;
  errorMessage?: string | null;
  onChangeText: (value: string) => void;
  onSubmit: () => void;
  value: string;
};

export default function ManualBarcodeEntry({
  disabled = false,
  errorMessage,
  onChangeText,
  onSubmit,
  value,
}: ManualBarcodeEntryProps) {
  const { t } = useI18n();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{t('Type it instead')}</Text>
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        editable={!disabled}
        keyboardType="number-pad"
        maxLength={32}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        placeholder={t('Enter barcode digits')}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, disabled && styles.inputDisabled]}
        value={value}
      />
      {errorMessage ? <Text style={styles.errorText}>{t(errorMessage)}</Text> : null}
      <PrimaryButton
        disabled={disabled}
        label={disabled ? 'Checking Barcode...' : 'Check Barcode'}
        onPress={onSubmit}
      />
    </View>
  );
}

const createStyles = (
  colors: ReturnType<typeof useAppTheme>['colors']
) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 28,
      borderWidth: 1,
      gap: 12,
      padding: 20,
    },
    errorText: {
      color: colors.danger,
      fontSize: 13,
      fontWeight: '600',
      lineHeight: 19,
    },
    input: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: 16,
      borderWidth: 1,
      color: colors.text,
      fontSize: 17,
      minHeight: 54,
      paddingHorizontal: 16,
    },
    inputDisabled: {
      opacity: 0.7,
    },
    label: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
    },
  });
