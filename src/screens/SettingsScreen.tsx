import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import PopupSheetLayout from '../components/PopupSheetLayout';
import QuestActionCard from '../components/QuestActionCard';
import { useAppTheme } from '../components/AppThemeProvider';
import { APP_NAME } from '../constants/branding';
import { createDefaultPremiumEntitlement } from '../models/premium';
import {
  loadSessionEffectiveShoppingProfile,
  loadSessionPremiumEntitlement,
  loadSessionUserProfile,
} from '../services/sessionDataService';

type SettingsDestination =
  | 'AccountSettings'
  | 'NotificationSettings'
  | 'AppearanceSettings'
  | 'HouseholdSettings'
  | 'SupportSettings';

type SettingsSheetProps = {
  onClose: () => void;
  onNavigate: (route: SettingsDestination) => void;
};

export function SettingsSheet({ onClose, onNavigate }: SettingsSheetProps) {
  const { colors, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const [isLoading, setIsLoading] = useState(true);
  const [profileName, setProfileName] = useState(APP_NAME);
  const [summaryMeta, setSummaryMeta] = useState('Basic');

  useEffect(() => {
    let isMounted = true;

    void Promise.all([
      loadSessionUserProfile('force-refresh'),
      loadSessionPremiumEntitlement('force-refresh'),
      loadSessionEffectiveShoppingProfile('force-refresh'),
    ])
      .then(([profile, entitlement, effectiveProfile]) => {
        if (!isMounted) {
          return;
        }

        const nextEntitlement = entitlement ?? createDefaultPremiumEntitlement();
        const nextShopperName = effectiveProfile.name;
        setProfileName(profile?.name?.trim() || profile?.email || APP_NAME);
        setSummaryMeta(
          `${nextEntitlement.isPremium ? 'Premium' : 'Basic'} • ${nextShopperName}`
        );
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <PopupSheetLayout
      onClose={onClose}
      subtitle={isLoading ? 'Opening your quick controls...' : summaryMeta}
      title={isLoading ? 'Settings' : profileName}
    >
      {isLoading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator color={colors.primary} size="small" />
          <View style={styles.loadingCopy}>
            <Text style={styles.loadingTitle}>Loading settings</Text>
            <Text style={styles.loadingText}>
              Pulling in your account, filters, and notification controls.
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.content}>
          <QuestActionCard
            badge="Account"
            icon="person-circle-outline"
            onPress={() => onNavigate('AccountSettings')}
            subtitle="Profile, premium, sign-out, and deletion."
            title="Account"
          />
          <QuestActionCard
            badge="Notifications"
            icon="notifications-outline"
            onPress={() => onNavigate('NotificationSettings')}
            subtitle="Reminders, pace, and notification status."
            title="Notifications"
          />
          <QuestActionCard
            badge="Appearance"
            icon="color-palette-outline"
            onPress={() => onNavigate('AppearanceSettings')}
            subtitle="Theme mode, app look, and share cards."
            title="Appearance"
          />
          <QuestActionCard
            badge="Household"
            icon="people-outline"
            onPress={() => onNavigate('HouseholdSettings')}
            subtitle="Diet profile, filters, and household shoppers."
            title="Household"
          />
          <QuestActionCard
            badge="Support"
            icon="help-buoy-outline"
            onPress={() => onNavigate('SupportSettings')}
            subtitle="Help, privacy, feedback, and support tools."
            title="Support"
          />
        </View>
      )}
    </PopupSheetLayout>
  );
}

export default function SettingsScreen() {
  return null;
}

const createStyles = (
  colors: ReturnType<typeof useAppTheme>['colors'],
  typography: ReturnType<typeof useAppTheme>['typography']
) =>
  StyleSheet.create({
    content: {
      gap: 14,
      paddingBottom: 8,
    },
    loadingCard: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 24,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 14,
      padding: 18,
    },
    loadingCopy: {
      flex: 1,
      gap: 4,
    },
    loadingText: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 14,
      lineHeight: 20,
    },
    loadingTitle: {
      color: colors.text,
      fontFamily: typography.headingFontFamily,
      fontSize: 18,
      fontWeight: '800',
    },
  });
