import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useI18n } from './AppLanguageProvider';
import type { AppColors } from '../constants/theme';

export type OptionPickerItem<T extends string> = {
  description: string;
  disabled?: boolean;
  id: T;
  label: string;
};

type OptionPickerModalProps<T extends string> = {
  colors: AppColors;
  onApply: () => void;
  onRequestClose: () => void;
  onSelect: (id: T) => void;
  options: OptionPickerItem<T>[];
  selectedId: T;
  title: string;
  visible: boolean;
};

export default function OptionPickerModal<T extends string>({
  colors,
  onApply,
  onRequestClose,
  onSelect,
  options,
  selectedId,
  title,
  visible,
}: OptionPickerModalProps<T>) {
  const { t } = useI18n();
  const styles = createStyles(colors);

  return (
    <Modal animationType="fade" onRequestClose={onRequestClose} transparent visible={visible}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{t(title)}</Text>
          <ScrollView
            contentContainerStyle={styles.optionList}
            showsVerticalScrollIndicator={false}
          >
            {options.map((option) => {
              const isSelected = option.id === selectedId;

              return (
                <Pressable
                  key={option.id}
                  disabled={option.disabled}
                  onPress={() => onSelect(option.id)}
                  style={[
                    styles.optionCard,
                    isSelected && styles.optionCardSelected,
                    option.disabled && styles.optionCardDisabled,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionTitle,
                      isSelected && styles.optionTitleSelected,
                    ]}
                  >
                    {t(option.label)}
                  </Text>
                  <Text style={styles.optionDescription}>{t(option.description)}</Text>
                  {option.disabled ? (
                    <Text style={styles.disabledLabel}>{t('Premium')}</Text>
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable onPress={onApply} style={styles.applyButton}>
            <Text style={styles.applyButtonText}>{t('Apply')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    applyButton: {
      alignItems: 'center',
      backgroundColor: colors.primary,
      borderRadius: 16,
      marginTop: 18,
      paddingHorizontal: 18,
      paddingVertical: 14,
    },
    applyButtonText: {
      color: colors.surface,
      fontSize: 15,
      fontWeight: '800',
    },
    disabledLabel: {
      color: colors.warning,
      fontSize: 12,
      fontWeight: '700',
      marginTop: 8,
      textTransform: 'uppercase',
    },
    optionCard: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: 18,
      borderWidth: 1,
      padding: 16,
    },
    optionCardDisabled: {
      opacity: 0.72,
    },
    optionCardSelected: {
      backgroundColor: colors.primaryMuted,
      borderColor: colors.primary,
    },
    optionDescription: {
      color: colors.textMuted,
      fontSize: 13,
      lineHeight: 20,
      marginTop: 6,
    },
    optionList: {
      gap: 12,
    },
    optionTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
    },
    optionTitleSelected: {
      color: colors.primary,
    },
    overlay: {
      alignItems: 'center',
      backgroundColor: colors.scanOverlay,
      flex: 1,
      justifyContent: 'center',
      padding: 20,
    },
    sheet: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 24,
      borderWidth: 1,
      maxHeight: '80%',
      padding: 22,
      width: '100%',
    },
    title: {
      color: colors.text,
      fontSize: 22,
      fontWeight: '800',
      marginBottom: 18,
    },
  });
