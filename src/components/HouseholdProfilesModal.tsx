import { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useI18n } from './AppLanguageProvider';
import { useAppTheme } from './AppThemeProvider';
import type { HouseholdProfile } from '../models/householdProfile';

type HouseholdProfilesModalProps = {
  activeHouseholdProfileId: string | null;
  householdProfiles: HouseholdProfile[];
  onAdd: () => void;
  onDelete: (id: string) => void;
  onEdit: (profile: HouseholdProfile) => void;
  onRequestClose: () => void;
  onUseProfile: (id: string | null) => void;
  visible: boolean;
};

export default function HouseholdProfilesModal({
  activeHouseholdProfileId,
  householdProfiles,
  onAdd,
  onDelete,
  onEdit,
  onRequestClose,
  onUseProfile,
  visible,
}: HouseholdProfilesModalProps) {
  const { t } = useI18n();
  const { colors, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);

  return (
    <Modal animationType="fade" onRequestClose={onRequestClose} transparent visible={visible}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{t('Household profiles')}</Text>
          <Text style={styles.subtitle}>
            {t('Switch who you are shopping for without overwriting your own default setup.')}
          </Text>
          <Pressable onPress={() => onUseProfile(null)} style={styles.baseProfileCard}>
            <Text style={styles.baseProfileTitle}>{t('You')}</Text>
            <Text style={styles.baseProfileBody}>
              {activeHouseholdProfileId
                ? t('Use your own default profile and filters.')
                : t('Currently active')}
            </Text>
          </Pressable>
          <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            {householdProfiles.map((profile) => {
              const isActive = profile.id === activeHouseholdProfileId;

              return (
                <View key={profile.id} style={[styles.card, isActive && styles.cardActive]}>
                  <Text style={styles.cardTitle}>{profile.name}</Text>
                  <Text style={styles.cardBody}>
                    {t(profile.dietProfileId.replace(/-/g, ' '))}
                    {profile.restrictionIds.length > 0
                      ? ` • ${t('{count} filters', { count: profile.restrictionIds.length })}`
                      : ''}
                  </Text>
                  <View style={styles.actions}>
                    <Pressable onPress={() => onUseProfile(profile.id)} style={styles.actionChip}>
                      <Text style={styles.actionText}>{isActive ? t('Active') : t('Use')}</Text>
                    </Pressable>
                    <Pressable onPress={() => onEdit(profile)} style={styles.actionChip}>
                      <Text style={styles.actionText}>{t('Edit')}</Text>
                    </Pressable>
                    <Pressable onPress={() => onDelete(profile.id)} style={styles.deleteChip}>
                      <Text style={styles.deleteText}>{t('Delete')}</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </ScrollView>
          <View style={styles.footer}>
            <Pressable onPress={onAdd} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>{t('Add household profile')}</Text>
            </Pressable>
            <Pressable onPress={onRequestClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>{t('Done')}</Text>
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
    actionChip: {
      alignItems: 'center',
      backgroundColor: colors.primaryMuted,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    actionText: {
      color: colors.primary,
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '800',
    },
    actions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    baseProfileBody: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 14,
      lineHeight: 20,
    },
    baseProfileCard: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: 18,
      borderWidth: 1,
      gap: 6,
      padding: 16,
    },
    baseProfileTitle: {
      color: colors.text,
      fontFamily: typography.headingFontFamily,
      fontSize: 16,
      fontWeight: '700',
    },
    card: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: 18,
      borderWidth: 1,
      gap: 10,
      padding: 16,
    },
    cardActive: {
      borderColor: colors.primary,
    },
    cardBody: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 14,
      lineHeight: 20,
    },
    cardTitle: {
      color: colors.text,
      fontFamily: typography.headingFontFamily,
      fontSize: 16,
      fontWeight: '700',
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
    deleteChip: {
      alignItems: 'center',
      backgroundColor: colors.dangerMuted,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    deleteText: {
      color: colors.danger,
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '800',
    },
    footer: {
      gap: 10,
    },
    list: {
      gap: 12,
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
    subtitle: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 14,
      lineHeight: 21,
    },
    title: {
      color: colors.text,
      fontFamily: typography.displayFontFamily,
      fontSize: 24,
      fontWeight: '800',
      lineHeight: 30,
    },
  });
