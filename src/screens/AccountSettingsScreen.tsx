import { useCallback, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useI18n } from '../components/AppLanguageProvider';
import FeaturePageLayout from '../components/FeaturePageLayout';
import ScreenLoadingView from '../components/ScreenLoadingView';
import SettingsRow from '../components/SettingsRow';
import SettingsSection from '../components/SettingsSection';
import { useAppTheme } from '../components/AppThemeProvider';
import { APP_NAME } from '../constants/branding';
import { createDefaultPremiumEntitlement } from '../models/premium';
import type { RootStackParamList } from '../navigation/types';
import { deleteCurrentAccount } from '../services/accountDeletionService';
import { AuthServiceError } from '../services/authHelpers';
import { logoutAuth } from '../services/authService';
import {
  loadSessionPremiumEntitlement,
  loadSessionUserProfile,
} from '../services/sessionDataService';

type AccountSettingsScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'AccountSettings'
>;

export default function AccountSettingsScreen({
  navigation,
}: AccountSettingsScreenProps) {
  const { t } = useI18n();
  const { colors, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState({
    email: '',
    name: APP_NAME,
    premiumLabel: 'Basic',
    roleLabel: 'User',
  });

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      void Promise.all([
        loadSessionUserProfile('stale-while-revalidate'),
        loadSessionPremiumEntitlement('cache-first'),
      ])
        .then(([profile, entitlement]) => {
          if (!isMounted) {
            return;
          }

          const nextEntitlement = entitlement ?? createDefaultPremiumEntitlement();
          setSummary({
            email: profile?.email ?? '',
            name: profile?.name?.trim() || profile?.email || APP_NAME,
            premiumLabel: nextEntitlement.isPremium ? 'Premium' : 'Basic',
            roleLabel:
              profile?.role === 'admin'
                ? 'Admin'
                : profile?.role === 'premium'
                  ? 'Premium'
                  : 'User',
          });
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

  const handleDeleteAccount = () => {
    Alert.alert(
      t('Delete account?'),
      t(
        'This removes your account, local history, and saved profile settings from this device.'
      ),
      [
        { style: 'cancel', text: t('Cancel') },
        {
          style: 'destructive',
          text: t('Delete'),
          onPress: () => {
            setIsDeleting(true);
            void deleteCurrentAccount()
              .catch((error) => {
                Alert.alert(
                  t('Delete account failed'),
                  error instanceof AuthServiceError
                    ? t(error.message)
                    : t('We could not delete your account right now.')
                );
              })
              .finally(() => setIsDeleting(false));
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <ScreenLoadingView
        subtitle="Refreshing your identity, plan status, and account tools..."
        title="Loading account"
      />
    );
  }

  return (
    <FeaturePageLayout
      eyebrow="Account"
      subtitle="Identity, premium access, sign-out, and deletion live here now."
      title="Account settings"
    >
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>{summary.name}</Text>
        <Text style={styles.summaryBody}>{summary.email || t('Signed in')}</Text>
        <Text style={styles.summaryMeta}>
          {`${t(summary.roleLabel)} • ${t(summary.premiumLabel)}`}
        </Text>
      </View>

      <SettingsSection title="Account tools">
        <SettingsRow
          onPress={() => navigation.navigate('ProfileDetails')}
          subtitle="Edit your name."
          title="Profile"
          value="Open"
        />
        <SettingsRow
          onPress={() => navigation.navigate('Premium')}
          subtitle="Manage your plan and premium benefits."
          title="Premium"
          value={summary.premiumLabel}
        />
        <SettingsRow
          onPress={() => navigation.navigate('History')}
          subtitle="Open your saved scan timeline."
          title="History"
          value="Open"
        />
        <SettingsRow onPress={() => void logoutAuth()} title="Log Out" />
        <SettingsRow
          danger
          disabled={isDeleting}
          onPress={handleDeleteAccount}
          title="Delete Account"
          value={isDeleting ? 'Working...' : undefined}
        />
      </SettingsSection>
    </FeaturePageLayout>
  );
}

const createStyles = (
  colors: ReturnType<typeof useAppTheme>['colors'],
  typography: ReturnType<typeof useAppTheme>['typography']
) =>
  StyleSheet.create({
    summaryBody: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 14,
    },
    summaryCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 24,
      borderWidth: 1,
      gap: 6,
      padding: 20,
    },
    summaryMeta: {
      color: colors.primary,
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    summaryTitle: {
      color: colors.text,
      fontFamily: typography.displayFontFamily,
      fontSize: 24,
      fontWeight: '800',
    },
  });
