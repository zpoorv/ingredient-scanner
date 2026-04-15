import { Alert } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useI18n } from '../components/AppLanguageProvider';
import FeaturePageLayout from '../components/FeaturePageLayout';
import SettingsRow from '../components/SettingsRow';
import SettingsSection from '../components/SettingsSection';
import { describeAdMobError, openMobileAdsInspector } from '../services/adMobService';
import type { RootStackParamList } from '../navigation/types';
import { AuthServiceError } from '../services/authHelpers';

type SupportSettingsScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'SupportSettings'
>;

export default function SupportSettingsScreen({
  navigation,
}: SupportSettingsScreenProps) {
  const { t } = useI18n();
  const handleOpenAdInspector = async () => {
    try {
      const didOpen = await openMobileAdsInspector();

      if (!didOpen) {
        Alert.alert(
          t('Ad Inspector unavailable'),
          t('Ad Inspector is only available on Android and iOS builds.')
        );
      }
    } catch (error) {
      Alert.alert(
        t('Ad Inspector unavailable'),
        error instanceof AuthServiceError ? t(error.message) : t(describeAdMobError(error))
      );
    }
  };

  return (
    <FeaturePageLayout
      eyebrow="Support"
      subtitle="Help, privacy, about, and feedback now live on a single support page."
      title="Support settings"
    >
      <SettingsSection title="Support and legal">
        <SettingsRow onPress={() => navigation.navigate('Help')} title="Help" />
        <SettingsRow
          onPress={() => navigation.navigate('PrivacyPolicy')}
          title="Privacy Policy"
        />
        <SettingsRow onPress={() => navigation.navigate('About')} title="About" />
        <SettingsRow onPress={() => navigation.navigate('Feedback')} title="Send Feedback" />
        {__DEV__ ? (
          <SettingsRow
            onPress={() => void handleOpenAdInspector()}
            subtitle="Check rewarded and native placements with Google's debug panel."
            title="Ad Inspector"
          />
        ) : null}
      </SettingsSection>
    </FeaturePageLayout>
  );
}
