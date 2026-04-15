import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useI18n } from './AppLanguageProvider';
import type { AppColors } from '../constants/theme';
import type { RestrictionDefinition } from '../constants/restrictions';
import type { RestrictionId } from '../models/restrictions';

type RestrictionPickerModalProps = {
  colors: AppColors;
  onApply: () => void;
  onRequestClose: () => void;
  onToggle: (id: RestrictionId) => void;
  restrictions: RestrictionDefinition[];
  selectedIds: RestrictionId[];
  visible: boolean;
};

export default function RestrictionPickerModal({
  colors,
  onApply,
  onRequestClose,
  onToggle,
  restrictions,
  selectedIds,
  visible,
}: RestrictionPickerModalProps) {
  const { t } = useI18n();
  const styles = createStyles(colors);

  return (
    <Modal animationType="fade" onRequestClose={onRequestClose} transparent visible={visible}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{t('Avoid ingredients and allergens')}</Text>
          <ScrollView contentContainerStyle={styles.optionList} showsVerticalScrollIndicator={false}>
            {restrictions.map((restriction) => {
              const isSelected = selectedIds.includes(restriction.id);

              return (
                <Pressable
                  key={restriction.id}
                  onPress={() => onToggle(restriction.id)}
                  style={[
                    styles.optionCard,
                    isSelected && styles.optionCardSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionTitle,
                      isSelected && styles.optionTitleSelected,
                    ]}
                  >
                    {t(restriction.label)}
                  </Text>
                  <Text style={styles.optionDescription}>{t(restriction.description)}</Text>
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
    optionCard: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: 18,
      borderWidth: 1,
      padding: 16,
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
