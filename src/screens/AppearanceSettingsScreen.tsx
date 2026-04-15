import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  getLanguageDisplayLabel,
  useI18n,
} from '../components/AppLanguageProvider';
import FeaturePageLayout from '../components/FeaturePageLayout';
import OptionPickerModal from '../components/OptionPickerModal';
import ScreenLoadingView from '../components/ScreenLoadingView';
import SettingsRow from '../components/SettingsRow';
import SettingsSection from '../components/SettingsSection';
import { useAppTheme } from '../components/AppThemeProvider';
import { APP_LOOK_DEFINITIONS, getAppLookDefinition } from '../constants/appLooks';
import {
  getShareCardStyleDefinition,
  SHARE_CARD_STYLE_DEFINITIONS,
} from '../constants/shareCardStyles';
import { createDefaultPremiumEntitlement } from '../models/premium';
import type { AppearanceMode } from '../models/preferences';
import type { ShareCardStyleId } from '../models/shareCardStyle';
import type { RootStackParamList } from '../navigation/types';
import { AuthServiceError } from '../services/authHelpers';
import { loadSessionPremiumEntitlement } from '../services/sessionDataService';
import {
  saveShareCardStyleId,
  syncShareCardStyleForCurrentUser,
} from '../services/shareCardPreferenceStorage';

type AppearanceSettingsScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'AppearanceSettings'
>;

export default function AppearanceSettingsScreen({
  navigation: _navigation,
}: AppearanceSettingsScreenProps) {
  const { languageCode, languageOptions, setLanguageCode, t } = useI18n();
  const { appLookId, appearanceMode, colors, setAppLookId, setAppearanceMode, typography } =
    useAppTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const [draftAppLookId, setDraftAppLookId] = useState(appLookId);
  const [draftLanguageCode, setDraftLanguageCode] = useState(languageCode);
  const [draftShareCardStyleId, setDraftShareCardStyleId] =
    useState<ShareCardStyleId>('classic');
  const [isAppLookModalVisible, setIsAppLookModalVisible] = useState(false);
  const [isLanguageModalVisible, setIsLanguageModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [isShareCardStyleModalVisible, setIsShareCardStyleModalVisible] = useState(false);
  const [shareCardStyleId, setShareCardStyleId] = useState<ShareCardStyleId>('classic');

  const appLookOptions = APP_LOOK_DEFINITIONS.map((definition) => ({
    description: definition.description,
    disabled: definition.isPremiumOnly && !isPremium,
    id: definition.id,
    label: definition.label,
  }));
  const shareCardStyleOptions = SHARE_CARD_STYLE_DEFINITIONS.map((definition) => ({
    description: definition.description,
    disabled: definition.isPremiumOnly && !isPremium,
    id: definition.id,
    label: definition.label,
  }));
  const appLanguageOptions = languageOptions.map((language) => ({
    description: t(`Use ${language.englishLabel} throughout the app.`),
    id: language.code,
    label: language.nativeLabel,
  }));

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      void Promise.all([
        loadSessionPremiumEntitlement('cache-first'),
        syncShareCardStyleForCurrentUser(),
      ])
        .then(([entitlement, nextShareCardStyleId]) => {
          if (!isMounted) {
            return;
          }

          setIsPremium((entitlement ?? createDefaultPremiumEntitlement()).isPremium);
          setShareCardStyleId(nextShareCardStyleId);
          setDraftShareCardStyleId(nextShareCardStyleId);
        })
        .finally(() => {
          if (isMounted) {
            setIsLoading(false);
          }
        });

      return () => {
        isMounted = false;
      };
    }, [])
  );

  if (isLoading) {
    return (
      <ScreenLoadingView
        subtitle="Refreshing your app look, theme mode, and share-card style..."
        title="Loading appearance"
      />
    );
  }

  return (
    <FeaturePageLayout
      eyebrow="Appearance"
      subtitle="Theme mode, app look, and share-card styling now stay in one clean place."
      title="Appearance settings"
    >
      <SettingsSection title="Visual style">
        <View style={styles.themeRow}>
          {(['light', 'dark'] as AppearanceMode[]).map((mode) => {
            const isSelected = appearanceMode === mode;

            return (
              <Pressable
                key={mode}
                onPress={() => void setAppearanceMode(mode)}
                style={[styles.themeChip, isSelected && styles.themeChipSelected]}
              >
                <Text
                  style={[
                    styles.themeChipText,
                    isSelected && styles.themeChipTextSelected,
                  ]}
                >
                  {mode === 'light' ? 'Light Mode' : 'Dark Mode'}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <SettingsRow
          onPress={() => {
            setDraftLanguageCode(languageCode);
            setIsLanguageModalVisible(true);
          }}
          title="App language"
          value={getLanguageDisplayLabel(languageCode)}
        />
        <SettingsRow
          onPress={() => {
            setDraftAppLookId(appLookId);
            setIsAppLookModalVisible(true);
          }}
          title="App Look"
          value={getAppLookDefinition(appLookId).shortLabel}
        />
        <SettingsRow
          onPress={() => {
            setDraftShareCardStyleId(shareCardStyleId);
            setIsShareCardStyleModalVisible(true);
          }}
          title="Share Card Style"
          value={getShareCardStyleDefinition(shareCardStyleId).label}
        />
      </SettingsSection>

      <OptionPickerModal
        colors={colors}
        onApply={() => {
          setIsAppLookModalVisible(false);
          void setAppLookId(draftAppLookId).catch((error) => {
            Alert.alert(
              t('App look update failed'),
              error instanceof AuthServiceError
                ? t(error.message)
                : t('We could not save that app look right now.')
            );
          });
        }}
        onRequestClose={() => setIsAppLookModalVisible(false)}
        onSelect={setDraftAppLookId}
        options={appLookOptions}
        selectedId={draftAppLookId}
        title="Choose app look"
        visible={isAppLookModalVisible}
      />
      <OptionPickerModal
        colors={colors}
        onApply={() => {
          setIsLanguageModalVisible(false);
          void setLanguageCode(draftLanguageCode).catch((error) => {
            Alert.alert(
              t('Language update failed'),
              error instanceof AuthServiceError
                ? t(error.message)
                : t('We could not save that app language right now.')
            );
          });
        }}
        onRequestClose={() => setIsLanguageModalVisible(false)}
        onSelect={setDraftLanguageCode}
        options={appLanguageOptions}
        selectedId={draftLanguageCode}
        title={t('Select language')}
        visible={isLanguageModalVisible}
      />
      <OptionPickerModal
        colors={colors}
        onApply={() => {
          setShareCardStyleId(draftShareCardStyleId);
          setIsShareCardStyleModalVisible(false);
          void saveShareCardStyleId(draftShareCardStyleId).catch((error) => {
            Alert.alert(
              t('Share-card style update failed'),
              error instanceof AuthServiceError
                ? t(error.message)
                : t('We could not save that share-card style right now.')
            );
          });
        }}
        onRequestClose={() => setIsShareCardStyleModalVisible(false)}
        onSelect={setDraftShareCardStyleId}
        options={shareCardStyleOptions}
        selectedId={draftShareCardStyleId}
        title="Choose share-card style"
        visible={isShareCardStyleModalVisible}
      />
    </FeaturePageLayout>
  );
}

const createStyles = (
  colors: ReturnType<typeof useAppTheme>['colors'],
  typography: ReturnType<typeof useAppTheme>['typography']
) =>
  StyleSheet.create({
    themeChip: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: 999,
      borderWidth: 1,
      flex: 1,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    themeChipSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    themeChipText: {
      color: colors.text,
      fontFamily: typography.headingFontFamily,
      fontSize: 14,
      fontWeight: '700',
      textAlign: 'center',
    },
    themeChipTextSelected: {
      color: colors.surface,
    },
    themeRow: {
      flexDirection: 'row',
      gap: 12,
      padding: 18,
    },
  });
