import { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
  type BarcodeType,
} from 'expo-camera';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import PrimaryButton from '../components/PrimaryButton';
import { colors } from '../constants/colors';
import { normalizeBarcode } from '../utils/barcode';
import type { RootStackParamList } from '../utils/navigation';

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

// Keep the MVP focused on the most common retail barcode formats.
const SUPPORTED_BARCODE_TYPES = [
  'ean13',
  'ean8',
  'upc_a',
  'upc_e',
  'code128',
] satisfies BarcodeType[];

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const [cameraPermission, requestPermission] = useCameraPermissions();
  const [hasScanned, setHasScanned] = useState(false);
  const [isScanningEnabled, setIsScanningEnabled] = useState(false);
  const insets = useSafeAreaInsets();

  const handlePrimaryAction = async () => {
    if (!cameraPermission?.granted) {
      const response = await requestPermission();

      if (!response.granted) {
        return;
      }
    }

    setHasScanned(false);
    setIsScanningEnabled(true);
  };

  const handleBarcodeScanned = ({ data }: BarcodeScanningResult) => {
    if (hasScanned) {
      return;
    }

    // Guard against duplicate scan callbacks firing before navigation completes.
    setHasScanned(true);
    setIsScanningEnabled(false);

    navigation.navigate('Result', {
      barcode: normalizeBarcode(data),
    });
  };

  if (!cameraPermission) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  const hasPermission = cameraPermission.granted;

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Scan a food product</Text>
            <Text style={styles.subtitle}>
              Point your camera at the barcode, then open the result screen to
              see ingredient analysis placeholders.
            </Text>
          </View>

          <View style={styles.scannerCard}>
            {hasPermission ? (
              <View style={styles.cameraContainer}>
                <CameraView
                  barcodeScannerSettings={{
                    barcodeTypes: SUPPORTED_BARCODE_TYPES,
                  }}
                  facing="back"
                  onBarcodeScanned={
                    isScanningEnabled ? handleBarcodeScanned : undefined
                  }
                  style={styles.camera}
                />

                <View pointerEvents="none" style={styles.overlay}>
                  <View style={styles.scanFrame} />
                  <Text style={styles.overlayText}>
                    {isScanningEnabled
                      ? 'Looking for a barcode...'
                      : 'Tap the button below to start scanning'}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.permissionFallback}>
                <Text style={styles.permissionTitle}>Camera access needed</Text>
                <Text style={styles.permissionText}>
                  Allow camera access so the app can scan product barcodes.
                </Text>
              </View>
            )}
          </View>
        </View>

        <View
          style={[
            styles.bottomSection,
            { paddingBottom: Math.max(insets.bottom + 12, 24) },
          ]}
        >
          <View style={styles.buttonWrapper}>
            <PrimaryButton
              disabled={hasPermission && isScanningEnabled}
              label={
                hasPermission
                  ? isScanningEnabled
                    ? 'Scanning...'
                    : 'Scan Barcode'
                  : 'Allow Camera Access'
              }
              onPress={handlePrimaryAction}
            />
          </View>

          <Text style={styles.footerText}>
            This setup keeps the flow simple: scan once, then navigate to the
            product details screen.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bottomSection: {
    alignItems: 'center',
    gap: 16,
    paddingTop: 20,
    width: '100%',
  },
  buttonWrapper: {
    maxWidth: 320,
    width: '100%',
  },
  camera: {
    flex: 1,
  },
  cameraContainer: {
    flex: 1,
  },
  container: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  content: {
    alignItems: 'center',
    flex: 1,
    gap: 24,
    width: '100%',
  },
  footerText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 320,
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
    gap: 8,
    maxWidth: 360,
    width: '100%',
  },
  loadingContainer: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
  },
  overlay: {
    alignItems: 'center',
    backgroundColor: colors.scanOverlay,
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  overlayText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '600',
    marginTop: 18,
    textAlign: 'center',
  },
  permissionFallback: {
    alignItems: 'center',
    flex: 1,
    gap: 10,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  permissionText: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  permissionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  scanFrame: {
    borderColor: colors.surface,
    borderRadius: 24,
    borderWidth: 3,
    height: 190,
    width: '78%',
  },
  scannerCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 28,
    borderWidth: 1,
    elevation: 2,
    flex: 1,
    minHeight: 320,
    maxWidth: 360,
    overflow: 'hidden',
    width: '100%',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
});
