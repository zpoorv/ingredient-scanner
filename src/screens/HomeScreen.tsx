import { useEffect, useLayoutEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import DietProfileModal from '../components/DietProfileModal';
import PrimaryButton from '../components/PrimaryButton';
import { APP_NAME } from '../constants/branding';
import { colors } from '../constants/colors';
import {
  DEFAULT_DIET_PROFILE_ID,
  DIET_PROFILE_DEFINITIONS,
  type DietProfileId,
} from '../constants/dietProfiles';
import type { RootStackParamList } from '../navigation/types';
import {
  loadDietProfile,
  loadDietProfileIntroSeen,
  markDietProfileIntroSeen,
  saveDietProfile,
} from '../services/dietProfileStorage';
import { logoutAuth } from '../services/authService';
import { getAuthSession, subscribeAuthSession } from '../store';

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

const HOME_FEATURES = [
  'Live barcode scanning with Expo camera',
  'Ingredient label OCR from a photographed image',
  'Open Food Facts product lookup before navigation',
  'Ingredient, nutrition, and profile-aware analysis on the result screen',
  'Saved scan history with search and quick reopen',
];

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const insets = useSafeAreaInsets();
  const [selectedProfileId, setSelectedProfileId] = useState<DietProfileId>(
    DEFAULT_DIET_PROFILE_ID
  );
  const [draftProfileId, setDraftProfileId] = useState<DietProfileId>(
    DEFAULT_DIET_PROFILE_ID
  );
  const [accountEmail, setAccountEmail] = useState(getAuthSession().user?.email ?? '');
  const [accountProvider, setAccountProvider] = useState(
    getAuthSession().user?.provider ?? 'email'
  );
  const [accountDisplayName, setAccountDisplayName] = useState(
    getAuthSession().user?.displayName ?? ''
  );
  const [isFirstLaunchProfileFlow, setIsFirstLaunchProfileFlow] = useState(false);
  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);

  const selectedProfile =
    DIET_PROFILE_DEFINITIONS.find((profile) => profile.id === selectedProfileId) ||
    DIET_PROFILE_DEFINITIONS[0];

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          accessibilityLabel="Open diet profile"
          onPress={() => {
            setDraftProfileId(selectedProfileId);
            setIsFirstLaunchProfileFlow(false);
            setIsProfileModalVisible(true);
          }}
          style={({ pressed }) => [
            styles.headerProfileButton,
            pressed && styles.headerProfileButtonPressed,
          ]}
        >
          <Text style={styles.headerProfileButtonText}>Profile</Text>
        </Pressable>
      ),
    });
  }, [navigation, selectedProfileId]);

  useEffect(() => {
    const unsubscribe = subscribeAuthSession((session) => {
      setAccountEmail(session.user?.email ?? '');
      setAccountDisplayName(session.user?.displayName ?? '');
      setAccountProvider(session.user?.provider ?? 'email');
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    let isMounted = true;

    const restoreProfile = async () => {
      const [savedProfileId, hasSeenIntro] = await Promise.all([
        loadDietProfile(),
        loadDietProfileIntroSeen(),
      ]);

      if (isMounted) {
        setSelectedProfileId(savedProfileId);
        setDraftProfileId(savedProfileId);
        setIsFirstLaunchProfileFlow(!hasSeenIntro);
        setIsProfileModalVisible(!hasSeenIntro);
      }
    };

    void restoreProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleApplyProfile = async () => {
    setSelectedProfileId(draftProfileId);
    setIsProfileModalVisible(false);
    setIsFirstLaunchProfileFlow(false);
    await saveDietProfile(draftProfileId);
    await markDietProfileIntroSeen();
  };

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.backgroundGlow} />

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom + 28, 44) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <View style={styles.eyebrowChip}>
              <Text style={styles.eyebrowText}>Open Food Facts Powered</Text>
            </View>

            <View style={styles.heroBlock}>
              <Text style={styles.title}>Scan a food barcode and review it fast</Text>
              <Text style={styles.subtitle}>
                Use the camera to scan a packaged product, fetch its catalog data,
                and open a clear result page with ingredient, additive, and
                nutrition signals.
              </Text>
            </View>

            <View style={styles.featureCard}>
              {HOME_FEATURES.map((feature) => (
                <View key={feature} style={styles.featureRow}>
                  <View style={styles.featureDot} />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>

            <View style={styles.profileSummaryCard}>
              <Text style={styles.profileSummaryLabel}>Current Diet Profile</Text>
              <Text style={styles.profileSummaryTitle}>{selectedProfile.label}</Text>
              <Text style={styles.profileSummaryText}>
                {selectedProfile.description}
              </Text>
            </View>

            <View style={styles.accountCard}>
              <Text style={styles.accountLabel}>Account</Text>
              <Text style={styles.accountTitle}>
                {accountDisplayName || accountEmail || `Signed in to ${APP_NAME}`}
              </Text>
              <Text style={styles.accountText}>
                {accountProvider === 'google'
                  ? 'Signed in with Google through Firebase Authentication.'
                  : 'Signed in with email and password through Firebase Authentication.'}
              </Text>
            </View>

            <View style={styles.footerActions}>
              <PrimaryButton
                label="Open Scanner"
                onPress={() =>
                  navigation.navigate('Scanner', { profileId: selectedProfileId })
                }
              />
              <Pressable
                onPress={() =>
                  navigation.navigate('IngredientOcr', {
                    profileId: selectedProfileId,
                  })
                }
                style={styles.secondaryAction}
              >
                <Text style={styles.secondaryActionText}>Scan Ingredient Label</Text>
              </Pressable>
              <Pressable
                onPress={() => navigation.navigate('History')}
                style={styles.secondaryAction}
              >
                <Text style={styles.secondaryActionText}>View Scan History</Text>
              </Pressable>
              <Pressable
                onPress={() => void logoutAuth()}
                style={styles.secondaryAction}
              >
                <Text style={styles.secondaryActionText}>Log Out</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </View>
      <DietProfileModal
        isFirstLaunch={isFirstLaunchProfileFlow}
        onApply={() => void handleApplyProfile()}
        onSelect={setDraftProfileId}
        selectedProfileId={draftProfileId}
        visible={isProfileModalVisible}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  accountCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: 8,
    padding: 18,
  },
  accountLabel: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  accountText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  accountTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  backgroundGlow: {
    backgroundColor: colors.primaryMuted,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    height: 240,
    left: -24,
    opacity: 0.55,
    position: 'absolute',
    right: -24,
    top: -32,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  content: {
    gap: 24,
  },
  eyebrowChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  eyebrowText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  featureCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 28,
    borderWidth: 1,
    gap: 16,
    padding: 22,
  },
  featureDot: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: 10,
    marginTop: 6,
    width: 10,
  },
  featureRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
  },
  featureText: {
    color: colors.text,
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
  },
  footerActions: {
    gap: 12,
    marginTop: 4,
  },
  heroBlock: {
    gap: 14,
    paddingTop: 8,
  },
  headerProfileButton: {
    backgroundColor: colors.primaryMuted,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerProfileButtonPressed: {
    opacity: 0.86,
  },
  headerProfileButtonText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  profileSummaryCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: 8,
    padding: 18,
  },
  profileSummaryLabel: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  profileSummaryText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  profileSummaryTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  secondaryAction: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 50,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  secondaryActionText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 17,
    lineHeight: 25,
  },
  title: {
    color: colors.text,
    fontSize: 36,
    fontWeight: '800',
    lineHeight: 42,
  },
});
