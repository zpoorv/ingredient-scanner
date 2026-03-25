import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import PrimaryButton from '../components/PrimaryButton';
import { colors } from '../constants/colors';
import type { RootStackParamList } from '../navigation/types';

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

const HOME_FEATURES = [
  'Live barcode scanning with Expo camera',
  'Open Food Facts product lookup before navigation',
  'Ingredient and nutrition analysis on the result screen',
  'Saved scan history with search and quick reopen',
];

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.backgroundGlow} />

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
        </View>

        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom + 12, 24) },
          ]}
        >
          <View style={styles.footerActions}>
            <PrimaryButton
              label="Open Scanner"
              onPress={() => navigation.navigate('Scanner')}
            />
            <Pressable
              onPress={() => navigation.navigate('History')}
              style={styles.secondaryAction}
            >
              <Text style={styles.secondaryActionText}>View Scan History</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    justifyContent: 'space-between',
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
  footer: {
    width: '100%',
  },
  footerActions: {
    gap: 12,
  },
  heroBlock: {
    gap: 14,
    paddingTop: 8,
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
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
