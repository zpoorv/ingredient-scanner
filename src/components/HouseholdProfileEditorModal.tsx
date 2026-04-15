import { useMemo } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useI18n } from './AppLanguageProvider';
import { useAppTheme } from './AppThemeProvider';
import { DIET_PROFILE_DEFINITIONS, type DietProfileId } from '../constants/dietProfiles';
import { RESTRICTION_DEFINITIONS } from '../constants/restrictions';
import type { RestrictionId, RestrictionSeverity } from '../models/restrictions';

type HouseholdProfileEditorModalProps = {
  draftDietProfileId: DietProfileId;
  draftName: string;
  draftRestrictionIds: RestrictionId[];
  draftRestrictionSeverity: RestrictionSeverity;
  onChangeName: (value: string) => void;
  onRequestClose: () => void;
  onSave: () => void;
  onSelectDietProfile: (value: DietProfileId) => void;
  onSelectRestrictionSeverity: (value: RestrictionSeverity) => void;
  onToggleRestriction: (value: RestrictionId) => void;
  visible: boolean;
};

export default function HouseholdProfileEditorModal({
  draftDietProfileId,
  draftName,
  draftRestrictionIds,
  draftRestrictionSeverity,
  onChangeName,
  onRequestClose,
  onSave,
  onSelectDietProfile,
  onSelectRestrictionSeverity,
  onToggleRestriction,
  visible,
}: HouseholdProfileEditorModalProps) {
  const { t } = useI18n();
  const { colors, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);

  return (
    <Modal animationType="fade" onRequestClose={onRequestClose} transparent visible={visible}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{t('Household profile')}</Text>
          <TextInput
            onChangeText={onChangeName}
            placeholder={t('Name')}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            value={draftName}
          />
          <Text style={styles.sectionLabel}>{t('Diet profile')}</Text>
          <View style={styles.optionWrap}>
            {DIET_PROFILE_DEFINITIONS.map((profile) => {
              const isSelected = profile.id === draftDietProfileId;

              return (
                <Pressable
                  key={profile.id}
                  onPress={() => onSelectDietProfile(profile.id)}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                    {t(profile.shortLabel)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.sectionLabel}>{t('Food filters')}</Text>
          <ScrollView contentContainerStyle={styles.optionWrap} showsVerticalScrollIndicator={false}>
            {RESTRICTION_DEFINITIONS.map((restriction) => {
              const isSelected = draftRestrictionIds.includes(restriction.id);

              return (
                <Pressable
                  key={restriction.id}
                  onPress={() => onToggleRestriction(restriction.id)}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                    {t(restriction.label)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Text style={styles.sectionLabel}>{t('Filter strictness')}</Text>
          <View style={styles.optionWrap}>
            {(['caution', 'strict'] as RestrictionSeverity[]).map((value) => {
              const isSelected = value === draftRestrictionSeverity;

              return (
                <Pressable
                  key={value}
                  onPress={() => onSelectRestrictionSeverity(value)}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                    {value === 'strict' ? t('Strict') : t('Caution')}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.footer}>
            <Pressable onPress={onSave} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>{t('Save profile')}</Text>
            </Pressable>
            <Pressable onPress={onRequestClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>{t('Cancel')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (
  colors: ReturnType<typeof useAppTheme>['colors'],
  typography: ReturnType<typeof useAppTheme>['typography']
) =>
  StyleSheet.create({
    chip: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    chipSelected: {
      backgroundColor: colors.primaryMuted,
      borderColor: colors.primary,
    },
    chipText: {
      color: colors.text,
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '800',
    },
    chipTextSelected: {
      color: colors.primary,
    },
    closeButton: {
      alignItems: 'center',
      borderColor: colors.border,
      borderRadius: 16,
      borderWidth: 1,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    closeButtonText: {
      color: colors.text,
      fontFamily: typography.headingFontFamily,
      fontSize: 14,
      fontWeight: '700',
    },
    footer: {
      gap: 10,
      paddingTop: 6,
    },
    input: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: 16,
      borderWidth: 1,
      color: colors.text,
      fontFamily: typography.bodyFontFamily,
      fontSize: 15,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    optionWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    overlay: {
      alignItems: 'center',
      backgroundColor: colors.scanOverlay,
      flex: 1,
      justifyContent: 'center',
      padding: 20,
    },
    primaryButton: {
      alignItems: 'center',
      backgroundColor: colors.primary,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    primaryButtonText: {
      color: colors.surface,
      fontFamily: typography.headingFontFamily,
      fontSize: 14,
      fontWeight: '700',
    },
    sectionLabel: {
      color: colors.primary,
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 24,
      borderWidth: 1,
      gap: 14,
      maxHeight: '82%',
      padding: 22,
      width: '100%',
    },
    title: {
      color: colors.text,
      fontFamily: typography.displayFontFamily,
      fontSize: 24,
      fontWeight: '800',
      lineHeight: 30,
    },
  });
