import { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  DIET_PROFILE_DEFINITIONS,
  type DietProfileId,
} from '../constants/dietProfiles';
import { useI18n } from './AppLanguageProvider';
import { useAppTheme } from './AppThemeProvider';
import PrimaryButton from './PrimaryButton';

type DietProfileModalProps = {
  isFirstLaunch?: boolean;
  onApply: () => void;
  onSelect: (profileId: DietProfileId) => void;
  selectedProfileId: DietProfileId;
  visible: boolean;
};

export default function DietProfileModal({
  isFirstLaunch = false,
  onApply,
  onSelect,
  selectedProfileId,
  visible,
}: DietProfileModalProps) {
  const { t } = useI18n();
  const { colors, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const selectedProfile =
    DIET_PROFILE_DEFINITIONS.find((profile) => profile.id === selectedProfileId) ||
    DIET_PROFILE_DEFINITIONS[0];

  return (
    <Modal animationType="fade" onRequestClose={() => {}} transparent visible={visible}>
      <SafeAreaView style={styles.overlay}>
        <View style={styles.backdrop} />
        <View style={styles.sheet}>
          <Text style={styles.eyebrow}>
            {isFirstLaunch ? t('Choose Your Diet Profile') : t('Diet Profile')}
          </Text>
          <Text style={styles.title}>
            {isFirstLaunch
              ? t('Pick the mode that should shape your score')
              : t('Adjust how this app scores products for you')}
          </Text>
          <Text style={styles.subtitle}>
            {isFirstLaunch
              ? t('You can change this later from the top-right profile button on the home screen.')
              : t('Select the mode you want to use, then apply it.')}
          </Text>

          <ScrollView
            contentContainerStyle={styles.profileList}
            showsVerticalScrollIndicator={false}
          >
            {DIET_PROFILE_DEFINITIONS.map((profile) => {
              const isSelected = profile.id === selectedProfileId;

              return (
                <Pressable
                  key={profile.id}
                  onPress={() => onSelect(profile.id)}
                  style={[
                    styles.profileCard,
                    isSelected && styles.profileCardSelected,
                  ]}
                >
                  <View style={styles.profileHeader}>
                    <Text
                      style={[
                        styles.profileName,
                        isSelected && styles.profileNameSelected,
                      ]}
                    >
                      {t(profile.label)}
                    </Text>
                    {isSelected ? (
                      <View style={styles.selectedBadge}>
                        <Text style={styles.selectedBadgeText}>{t('Selected')}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.profileDescription}>
                    {t(profile.description)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.footer}>
            <PrimaryButton
              label={
                isFirstLaunch
                  ? `Use ${selectedProfile.label}`
                  : `Apply ${selectedProfile.shortLabel}`
              }
              onPress={onApply}
            />
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const createStyles = (
  colors: ReturnType<typeof useAppTheme>['colors'],
  typography: ReturnType<typeof useAppTheme>['typography']
) =>
  StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.scanOverlay,
    },
    eyebrow: {
      color: colors.primary,
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    footer: {
      paddingTop: 4,
    },
    overlay: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 20,
      paddingVertical: 20,
    },
    profileCard: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: 20,
      borderWidth: 1,
      gap: 8,
      padding: 16,
    },
    profileCardSelected: {
      backgroundColor: colors.primaryMuted,
      borderColor: colors.primary,
    },
    profileDescription: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 14,
      lineHeight: 21,
    },
    profileHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    profileList: {
      gap: 12,
    },
    profileName: {
      color: colors.text,
      fontFamily: typography.headingFontFamily,
      fontSize: 17,
      fontWeight: '700',
    },
    profileNameSelected: {
      color: colors.primary,
    },
    selectedBadge: {
      backgroundColor: colors.primary,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    selectedBadgeText: {
      color: colors.surface,
      fontFamily: typography.accentFontFamily,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.3,
      textTransform: 'uppercase',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 28,
      borderWidth: 1,
      gap: 14,
      maxHeight: '88%',
      padding: 22,
    },
    subtitle: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 15,
      lineHeight: 22,
    },
    title: {
      color: colors.text,
      fontFamily: typography.displayFontFamily,
      fontSize: 28,
      fontWeight: '800',
      lineHeight: 33,
    },
  });
