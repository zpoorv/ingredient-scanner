import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useMemo, useState } from 'react';

import PrimaryButton from '../components/PrimaryButton';
import { useAppTheme } from '../components/AppThemeProvider';
import {
  PREMIUM_FEATURE_COPY,
  PREMIUM_MONTHLY_PRODUCT_ID,
  PREMIUM_PAYWALL_FEATURES,
  PREMIUM_PRICE_PREVIEW_COPY,
} from '../constants/premium';
import type { PremiumEntitlement } from '../models/premium';
import type { RootStackParamList } from '../navigation/types';
import {
  loadCurrentPremiumEntitlement,
} from '../services/premiumEntitlementService';
import { getPremiumSession, subscribePremiumSession } from '../store';

type PremiumScreenProps = NativeStackScreenProps<RootStackParamList, 'Premium'>;

export default function PremiumScreen({ route }: PremiumScreenProps) {
  const { colors, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const [entitlement, setEntitlement] = useState<PremiumEntitlement>(getPremiumSession());
  const highlightedFeature = route.params?.featureId
    ? PREMIUM_FEATURE_COPY[route.params.featureId]
    : null;

  useFocusEffect(
    useCallback(() => {
      const unsubscribe = subscribePremiumSession(setEntitlement);
      void loadCurrentPremiumEntitlement();
      return unsubscribe;
    }, [])
  );

  const handlePurchasePress = () => {
    Alert.alert(
      entitlement.isPremium ? 'Premium is active' : 'Premium checkout comes next',
      entitlement.isPremium
        ? 'This account already has premium access from its synced entitlement.'
        : `The plan architecture is ready. Connect ${PREMIUM_MONTHLY_PRODUCT_ID} to Google Play Billing next so premium can remove daily limits, rewarded ads, and basic-plan caps.`
    );
  };

  const handleRestorePress = () => {
    Alert.alert(
      'Restore purchases comes next',
      'This screen is ready for Google Play restore flow. Once billing is connected, this button should re-check the active subscription.'
    );
  };

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>Inqoura Premium</Text>
          <Text style={styles.title}>
            {entitlement.isPremium ? 'Premium is active on this account' : 'Unlock premium tools'}
          </Text>
          <Text style={styles.subtitle}>
            {highlightedFeature?.description ||
              `Basic includes 5 OCR scans and 5 share-card exports per day. ${PREMIUM_PRICE_PREVIEW_COPY}`}
          </Text>
          <View
            style={[
              styles.statusBadge,
              entitlement.isPremium ? styles.statusBadgeActive : styles.statusBadgeInactive,
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                entitlement.isPremium
                  ? styles.statusBadgeTextActive
                  : styles.statusBadgeTextInactive,
              ]}
            >
              {entitlement.isPremium
                ? `Active via ${entitlement.source.replace(/-/g, ' ')}`
                : 'Free plan'}
            </Text>
          </View>
        </View>

        <View style={styles.featureCard}>
          {PREMIUM_PAYWALL_FEATURES.map((item) => (
            <View key={item} style={styles.featureRow}>
              <View style={styles.featureDot} />
              <Text style={styles.featureText}>{item}</Text>
            </View>
          ))}
        </View>

        {highlightedFeature ? (
          <View style={styles.highlightCard}>
            <Text style={styles.highlightLabel}>Selected premium feature</Text>
            <Text style={styles.highlightTitle}>{highlightedFeature.title}</Text>
            <Text style={styles.highlightText}>{highlightedFeature.description}</Text>
          </View>
        ) : null}

        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>Plan status</Text>
          <Text style={styles.noteText}>
            Basic access is live with daily quotas, while premium already unlocks unlimited OCR,
            extra share styles, extra app looks, and history insights through the same synced
            entitlement state.
          </Text>
        </View>

        <PrimaryButton
          label={entitlement.isPremium ? 'Premium Active' : 'Continue To Premium Checkout'}
          onPress={handlePurchasePress}
        />
        {!entitlement.isPremium ? (
          <PrimaryButton label="Restore Premium Access" onPress={handleRestorePress} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (
  colors: ReturnType<typeof useAppTheme>['colors'],
  typography: ReturnType<typeof useAppTheme>['typography']
) =>
  StyleSheet.create({
    content: {
      gap: 18,
      padding: 24,
    },
    eyebrow: {
      color: colors.primary,
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    featureCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 24,
      borderWidth: 1,
      gap: 14,
      padding: 20,
    },
    featureDot: {
      backgroundColor: colors.primary,
      borderRadius: 999,
      height: 10,
      marginTop: 6,
      width: 10,
    },
    featureRow: {
      flexDirection: 'row',
      gap: 12,
    },
    featureText: {
      color: colors.text,
      flex: 1,
      fontFamily: typography.bodyFontFamily,
      fontSize: 15,
      lineHeight: 22,
    },
    heroCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 28,
      borderWidth: 1,
      gap: 10,
      padding: 22,
    },
    highlightCard: {
      backgroundColor: colors.primaryMuted,
      borderColor: colors.primary,
      borderRadius: 22,
      borderWidth: 1,
      gap: 8,
      padding: 18,
    },
    highlightLabel: {
      color: colors.primary,
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    highlightText: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 14,
      lineHeight: 21,
    },
    highlightTitle: {
      color: colors.text,
      fontFamily: typography.headingFontFamily,
      fontSize: 19,
      fontWeight: '800',
    },
    noteCard: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: 22,
      borderWidth: 1,
      gap: 8,
      padding: 18,
    },
    noteText: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 14,
      lineHeight: 21,
    },
    noteTitle: {
      color: colors.text,
      fontFamily: typography.headingFontFamily,
      fontSize: 17,
      fontWeight: '700',
    },
    safeArea: {
      backgroundColor: colors.background,
      flex: 1,
    },
    statusBadge: {
      alignSelf: 'flex-start',
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    statusBadgeActive: {
      backgroundColor: colors.successMuted,
    },
    statusBadgeInactive: {
      backgroundColor: colors.warningMuted,
    },
    statusBadgeText: {
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '800',
    },
    statusBadgeTextActive: {
      color: colors.success,
    },
    statusBadgeTextInactive: {
      color: colors.warning,
    },
    subtitle: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 15,
      lineHeight: 23,
    },
    title: {
      color: colors.text,
      fontFamily: typography.displayFontFamily,
      fontSize: 30,
      fontWeight: '800',
      lineHeight: 36,
    },
  });
