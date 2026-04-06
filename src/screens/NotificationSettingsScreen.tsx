import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import FeaturePageLayout from '../components/FeaturePageLayout';
import OptionPickerModal from '../components/OptionPickerModal';
import ScreenLoadingView from '../components/ScreenLoadingView';
import SettingsRow from '../components/SettingsRow';
import SettingsSection from '../components/SettingsSection';
import { useAppTheme } from '../components/AppThemeProvider';
import { createDefaultPremiumEntitlement } from '../models/premium';
import type {
  HistoryNotificationPermissionState,
} from '../models/historyNotification';
import type { HistoryNotificationCadence } from '../models/userProfile';
import type { RootStackParamList } from '../navigation/types';
import { AuthServiceError } from '../services/authHelpers';
import {
  cancelCurrentUserHistoryNotifications,
  getHistoryNotificationPermissionState,
  getHistoryNotificationStatusLabel,
  openHistoryNotificationSettings,
  requestHistoryNotificationPermission,
  syncHistoryNotificationsForCurrentUser,
} from '../services/historyNotificationService';
import {
  loadSessionPremiumEntitlement,
  loadSessionUserProfile,
} from '../services/sessionDataService';
import { saveCurrentUserPreferences } from '../services/userProfileService';

type NotificationSettingsScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'NotificationSettings'
>;

export default function NotificationSettingsScreen({
  navigation,
}: NotificationSettingsScreenProps) {
  const { colors } = useAppTheme();
  const [historyInsightsEnabled, setHistoryInsightsEnabled] = useState(true);
  const [historyNotificationCadence, setHistoryNotificationCadence] =
    useState<HistoryNotificationCadence>('weekly');
  const [historyNotificationPermissionState, setHistoryNotificationPermissionState] =
    useState<HistoryNotificationPermissionState>('undetermined');
  const [historyNotificationsEnabled, setHistoryNotificationsEnabled] = useState(false);
  const [isCadenceModalVisible, setIsCadenceModalVisible] = useState(false);
  const [draftCadence, setDraftCadence] = useState<HistoryNotificationCadence>('weekly');
  const [isLoading, setIsLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);

  const cadenceOptions = [
    {
      description: 'Show the strongest scan nudge when something needs attention.',
      id: 'smart' as const,
      label: 'Smart',
    },
    {
      description: 'Bundle your recent scan patterns into a simple weekly recap.',
      id: 'weekly' as const,
      label: 'Weekly',
    },
  ];

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      setIsLoading(true);

      void Promise.all([
        loadSessionUserProfile('force-refresh'),
        loadSessionPremiumEntitlement('force-refresh'),
        getHistoryNotificationPermissionState(),
      ])
        .then(([profile, entitlement, permissionState]) => {
          if (!isMounted) {
            return;
          }

          setHistoryInsightsEnabled(profile?.historyInsightsEnabled ?? true);
          setHistoryNotificationCadence(profile?.historyNotificationCadence ?? 'weekly');
          setDraftCadence(profile?.historyNotificationCadence ?? 'weekly');
          setHistoryNotificationsEnabled(profile?.historyNotificationsEnabled ?? false);
          setHistoryNotificationPermissionState(permissionState);
          setIsPremium((entitlement ?? createDefaultPremiumEntitlement()).isPremium);
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

  const handleToggleInsights = () => {
    if (!isPremium) {
      navigation.navigate('Premium', { featureId: 'history-personalization' });
      return;
    }

    const nextValue = !historyInsightsEnabled;
    setHistoryInsightsEnabled(nextValue);
    void (async () => {
      try {
        await saveCurrentUserPreferences({ historyInsightsEnabled: nextValue });
      } catch (error) {
        setHistoryInsightsEnabled(!nextValue);
        Alert.alert(
          'History insights update failed',
          error instanceof AuthServiceError
            ? error.message
            : 'We could not save that history insight setting right now.'
        );
      }
    })();
  };

  const handleToggleNotifications = async () => {
    const nextValue = !historyNotificationsEnabled;

    if (!nextValue) {
      setHistoryNotificationsEnabled(false);
      void (async () => {
        await saveCurrentUserPreferences({ historyNotificationsEnabled: false }).catch(() => null);
        await cancelCurrentUserHistoryNotifications();
      })();
      return;
    }

    const permissionState = await requestHistoryNotificationPermission();
    setHistoryNotificationPermissionState(permissionState);

    if (permissionState !== 'granted') {
      setHistoryNotificationsEnabled(false);
      void saveCurrentUserPreferences({ historyNotificationsEnabled: false }).catch(() => null);
      void cancelCurrentUserHistoryNotifications();
      Alert.alert(
        'Allow notifications',
        'Turn on notifications in system settings to receive weekly recaps and shopping nudges.',
        [
          { style: 'cancel', text: 'Not now' },
          { text: 'Open settings', onPress: () => void openHistoryNotificationSettings() },
        ]
      );
      return;
    }

    setHistoryNotificationsEnabled(true);
    void (async () => {
      try {
        await saveCurrentUserPreferences({ historyNotificationsEnabled: true });
        await syncHistoryNotificationsForCurrentUser();
      } catch (error) {
        setHistoryNotificationsEnabled(false);
        Alert.alert(
          'Notification update failed',
          error instanceof AuthServiceError
            ? error.message
            : 'We could not turn on history notifications right now.'
        );
      }
    })();
  };

  const handleApplyCadence = () => {
    setHistoryNotificationCadence(draftCadence);
    setIsCadenceModalVisible(false);
    void (async () => {
      try {
        await saveCurrentUserPreferences({ historyNotificationCadence: draftCadence });
        await syncHistoryNotificationsForCurrentUser();
      } catch (error) {
        setHistoryNotificationCadence((current) => current);
        Alert.alert(
          'Notification pace update failed',
          error instanceof AuthServiceError
            ? error.message
            : 'We could not save that notification pace right now.'
        );
      }
    })();
  };

  if (isLoading) {
    return (
      <ScreenLoadingView
        subtitle="Refreshing permissions, cadence, and history reminder settings..."
        title="Loading notifications"
      />
    );
  }

  return (
    <FeaturePageLayout
      eyebrow="Notifications"
      subtitle="Permissions, nudges, and richer history reminders now live on their own page."
      title="Notification settings"
    >
      <SettingsSection title="History signals">
        <SettingsRow
          onPress={handleToggleInsights}
          subtitle="Richer weekly scan patterns and repeat-buy signals."
          title="History Insights"
          value={isPremium ? (historyInsightsEnabled ? 'On' : 'Off') : 'Premium'}
        />
        <SettingsRow
          onPress={() => void handleToggleNotifications()}
          subtitle="Local reminders based on your recent scans."
          title="History Notifications"
          value={
            historyNotificationPermissionState === 'denied'
              ? 'Blocked'
              : historyNotificationsEnabled
                ? 'On'
                : 'Off'
          }
        />
        <SettingsRow
          disabled={!historyNotificationsEnabled || historyNotificationPermissionState !== 'granted'}
          onPress={() => setIsCadenceModalVisible(true)}
          subtitle="Choose whether nudges arrive smart-first or as a weekly recap."
          title="Notification Pace"
          value={historyNotificationCadence}
        />
        <SettingsRow
          onPress={
            historyNotificationPermissionState === 'denied'
              ? () => {
                  void openHistoryNotificationSettings();
                }
              : undefined
          }
          subtitle={
            historyNotificationPermissionState === 'denied'
              ? 'Open system settings to allow weekly recaps and smart nudges.'
              : 'Preview of what this device can send.'
          }
          title="Notification Status"
          value={getHistoryNotificationStatusLabel(
            historyNotificationsEnabled,
            historyNotificationPermissionState,
            historyNotificationCadence
          )}
        />
      </SettingsSection>

      <OptionPickerModal
        colors={colors}
        onApply={handleApplyCadence}
        onRequestClose={() => setIsCadenceModalVisible(false)}
        onSelect={setDraftCadence}
        options={cadenceOptions}
        selectedId={draftCadence}
        title="Choose notification pace"
        visible={isCadenceModalVisible}
      />
    </FeaturePageLayout>
  );
}
