import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type AppStateStatus,
  useWindowDimensions,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '../components/AppThemeProvider';
import BarcodeScannerPanel from '../components/BarcodeScannerPanel';
import ManualBarcodeEntry from '../components/ManualBarcodeEntry';
import PrimaryButton from '../components/PrimaryButton';
import { DEFAULT_DIET_PROFILE_ID } from '../constants/dietProfiles';
import {
  ProductLookupError,
  resolveProductByBarcode,
} from '../services/productLookup';
import { loadAdminAppConfig } from '../services/adminAppConfigService';
import type { RootStackParamList } from '../navigation/types';
import type { LastScanResult, ScannerState } from '../types/scanner';
import { normalizeBarcode } from '../utils/barcode';

type ScannerScreenProps = NativeStackScreenProps<RootStackParamList, 'Scanner'>;

const DUPLICATE_SCAN_WINDOW_MS = 2000;

function getOverlayLabel(scannerState: ScannerState) {
  switch (scannerState) {
    case 'loading':
      return 'Looking Up Product';
    case 'empty':
      return 'No Match Found';
    case 'error':
      return 'Scanner Paused';
    default:
      return 'Live Scanner';
  }
}

function getHelperText(scannerState: ScannerState) {
  switch (scannerState) {
    case 'loading':
      return 'Hold steady while we fetch product details.';
    case 'empty':
      return 'That barcode is paused so you do not get repeated empty results.';
    case 'error':
      return 'The scanner is paused until you reset and try again.';
    default:
      return 'Center the barcode inside the frame for the fastest read.';
  }
}

function getStatusContent(
  scannerState: ScannerState,
  lastScan: LastScanResult | null,
  errorMessage: string | null
) {
  if (scannerState === 'loading') {
    return {
      body: lastScan
        ? `Barcode ${lastScan.barcode} detected. We are loading the product details now.`
        : 'We are loading the product details now.',
      eyebrow: 'Lookup In Progress',
      title: 'Checking the product details',
    };
  }

  if (scannerState === 'empty') {
    return {
      body: lastScan
        ? `No product entry was found for ${lastScan.barcode}. You can scan a different package right away.`
        : 'No product entry was found for this barcode.',
      eyebrow: 'No Product Found',
      title: 'This barcode is not in the catalog yet',
    };
  }

  if (scannerState === 'error') {
    return {
      body:
        errorMessage ||
        'The product lookup stopped before we could open the result screen.',
      eyebrow: 'Lookup Failed',
      title: 'We could not load this product',
    };
  }

  return {
    body:
      'Point your camera at a retail barcode. We pause scanning during each lookup so the same code is not sent twice.',
    eyebrow: 'Scanner Ready',
    title: 'Scan a packaged food barcode',
  };
}

export default function ScannerScreen({ navigation, route }: ScannerScreenProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [cameraPermission, requestPermission] = useCameraPermissions();
  const [cameraResetKey, setCameraResetKey] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAppActive, setIsAppActive] = useState(AppState.currentState === 'active');
  const [isLookupInFlight, setIsLookupInFlight] = useState(false);
  const [lastScan, setLastScan] = useState<LastScanResult | null>(null);
  const [manualBarcodeInput, setManualBarcodeInput] = useState('');
  const [manualEntryError, setManualEntryError] = useState<string | null>(null);
  const [scannerState, setScannerState] = useState<ScannerState>('ready');
  const [isManualBarcodeEntryEnabled, setIsManualBarcodeEntryEnabled] =
    useState(true);
  const activeLookupRef = useRef(false);
  const recentScanRef = useRef<{ barcode: string; scannedAt: number } | null>(null);
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { height: windowHeight } = useWindowDimensions();
  const selectedProfileId =
    route.params?.profileId || DEFAULT_DIET_PROFILE_ID;

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    setErrorMessage(null);
    setCameraResetKey((value) => value + 1);
    setIsLookupInFlight(false);
    setLastScan(null);
    setManualEntryError(null);
    setScannerState('ready');
    activeLookupRef.current = false;
    recentScanRef.current = null;
  }, [isFocused]);

  useEffect(() => {
    let isMounted = true;

    const restoreAdminConfig = async () => {
      const config = await loadAdminAppConfig();

      if (isMounted) {
        setIsManualBarcodeEntryEnabled(config.enableManualBarcodeEntry);
      }
    };

    void restoreAdminConfig();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isFocused) {
      setIsAppActive(false);
      return;
    }

    setIsAppActive(AppState.currentState === 'active');
    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        setIsAppActive(nextState === 'active');
      }
    );

    return () => {
      subscription.remove();
    };
  }, [isFocused]);

  const lookupProduct = async (
    barcode: string,
    barcodeType?: string | null
  ) => {
    activeLookupRef.current = true;
    setErrorMessage(null);
    setManualEntryError(null);
    setIsLookupInFlight(true);
    setLastScan({ barcode, barcodeType: barcodeType ?? null });
    setScannerState('loading');

    try {
      const product = await resolveProductByBarcode(barcode, barcodeType);

      if (!navigation.isFocused()) {
        return;
      }

      if (!product) {
        setScannerState('empty');
        return;
      }

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.push('Result', {
        barcode,
        barcodeType,
        persistToHistory: true,
        profileId: selectedProfileId,
        product,
      });
    } catch (error) {
      if (!navigation.isFocused()) {
        return;
      }

      setScannerState('error');

      if (error instanceof ProductLookupError) {
        setErrorMessage(error.message);
        return;
      }

      setErrorMessage(
        'Product data providers are not reachable right now. Please try again in a moment.'
      );
    } finally {
      activeLookupRef.current = false;

      if (navigation.isFocused()) {
        setIsLookupInFlight(false);
      }
    }
  };

  const shouldSuppressDuplicateScan = (barcode: string) => {
    const recentScan = recentScanRef.current;

    if (!recentScan) {
      return false;
    }

    return (
      recentScan.barcode === barcode &&
      Date.now() - recentScan.scannedAt < DUPLICATE_SCAN_WINDOW_MS
    );
  };

  const handleBarcodeScanned = ({ data, type }: BarcodeScanningResult) => {
    if (activeLookupRef.current || scannerState !== 'ready') {
      return;
    }

    const barcode = normalizeBarcode(data);

    if (!barcode || shouldSuppressDuplicateScan(barcode)) {
      return;
    }

    recentScanRef.current = {
      barcode,
      scannedAt: Date.now(),
    };
    void lookupProduct(barcode, type);
  };

  const handleResetScanner = () => {
    setErrorMessage(null);
    setManualEntryError(null);
    setCameraResetKey((value) => value + 1);
    setLastScan(null);
    setScannerState('ready');
    activeLookupRef.current = false;
    recentScanRef.current = null;
  };

  const handleManualLookup = () => {
    if (activeLookupRef.current) {
      return;
    }

    const barcode = normalizeBarcode(manualBarcodeInput);

    if (!barcode || !/\d{6,}/.test(barcode)) {
      setManualEntryError('Enter a valid barcode number with at least 6 digits.');
      return;
    }

    recentScanRef.current = {
      barcode,
      scannedAt: Date.now(),
    };
    void lookupProduct(barcode, null);
  };

  const handlePermissionRequest = async () => {
    await requestPermission();
  };

  const handleCameraMountError = (message: string) => {
    setErrorMessage(
      message || 'The scanner could not start correctly. Reset it and try again.'
    );
    setScannerState('error');
  };

  if (!cameraPermission) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  const hasPermission = cameraPermission.granted;
  const statusContent = getStatusContent(scannerState, lastScan, errorMessage);
  const scannerHeight =
    windowHeight < 700 ? 330 : windowHeight < 780 ? 360 : 400;
  const cameraKey = `scanner-${cameraResetKey}-${isFocused ? 'focused' : 'idle'}`;
  const shouldRenderLiveCamera =
    hasPermission && isFocused && isAppActive && scannerState === 'ready' && !isLookupInFlight;

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.backgroundGlow} />
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom + 12, 24) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <View style={styles.eyebrowChip}>
                <Text style={styles.eyebrowText}>Camera Scanner</Text>
              </View>
              <Text style={styles.title}>Find product details from a barcode</Text>
              <Text style={styles.subtitle}>
                We fetch the product before opening the result screen, so loading,
                missing products, and network issues stay in the scan flow instead
                of interrupting the details page.
              </Text>
            </View>

            {hasPermission ? (
              <BarcodeScannerPanel
                cameraKey={cameraKey}
                helperText={getHelperText(scannerState)}
                height={scannerHeight}
                // Unmount the camera when the screen is paused or backgrounded so
                // Android can reclaim camera and preview memory immediately.
                isActive={shouldRenderLiveCamera}
                isFocused={isFocused && isAppActive}
                onCameraMountError={handleCameraMountError}
                onBarcodeScanned={handleBarcodeScanned}
                overlayLabel={getOverlayLabel(scannerState)}
              />
            ) : (
              <View style={styles.permissionCard}>
                <Text style={styles.permissionTitle}>Camera access needed</Text>
                <Text style={styles.permissionText}>
                  Allow camera access so the app can scan product barcodes and look
                  them up automatically.
                </Text>
                <PrimaryButton
                  label="Allow Camera Access"
                  onPress={handlePermissionRequest}
                />
              </View>
            )}

            {isManualBarcodeEntryEnabled ? (
              <ManualBarcodeEntry
                disabled={isLookupInFlight}
                errorMessage={manualEntryError}
                onChangeText={(value) => {
                  setManualBarcodeInput(value);
                  if (manualEntryError) {
                    setManualEntryError(null);
                  }
                }}
                onSubmit={handleManualLookup}
                value={manualBarcodeInput}
              />
            ) : null}
          </View>

          <View style={styles.statusCard}>
            <View style={styles.statusHeaderRow}>
              <Text style={styles.statusEyebrow}>{statusContent.eyebrow}</Text>
              <View style={styles.statusSourceChip}>
                <Text style={styles.statusSourceChipText}>Open Food Facts</Text>
              </View>
            </View>
            <Text style={styles.statusTitle}>{statusContent.title}</Text>
            <Text style={styles.statusBody}>{statusContent.body}</Text>
            <Text style={styles.statusHint}>
              Quick product-information guide only. Check the package if any detail looks incomplete.
            </Text>

            {scannerState === 'loading' ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={colors.primary} size="small" />
                <Text style={styles.loadingText}>Loading details from the catalog...</Text>
              </View>
            ) : null}

            {scannerState === 'error' ? (
              <>
                <PrimaryButton label="Scan Again" onPress={handleResetScanner} />
              </>
            ) : null}

            {scannerState === 'empty' ? (
              <PrimaryButton
                label="Scan Another Product"
                onPress={handleResetScanner}
              />
            ) : null}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (
  colors: ReturnType<typeof useAppTheme>['colors']
) =>
  StyleSheet.create({
    backgroundGlow: {
      backgroundColor: colors.primaryMuted,
      borderBottomLeftRadius: 40,
      borderBottomRightRadius: 40,
      height: 220,
      left: -24,
      opacity: 0.55,
      position: 'absolute',
      right: -24,
      top: -32,
    },
    container: {
      flex: 1,
      paddingHorizontal: 24,
      paddingTop: 16,
    },
    content: {
      gap: 20,
    },
    scrollContent: {
      gap: 18,
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
    header: {
      gap: 10,
    },
    loadingContainer: {
      alignItems: 'center',
      backgroundColor: colors.background,
      flex: 1,
      justifyContent: 'center',
    },
    loadingRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 10,
    },
    loadingText: {
      color: colors.textMuted,
      fontSize: 14,
      fontWeight: '600',
    },
    permissionCard: {
      alignItems: 'flex-start',
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 30,
      borderWidth: 1,
      gap: 12,
      padding: 24,
    },
    permissionText: {
      color: colors.textMuted,
      fontSize: 16,
      lineHeight: 24,
    },
    permissionTitle: {
      color: colors.text,
      fontSize: 22,
      fontWeight: '800',
    },
    safeArea: {
      backgroundColor: colors.background,
      flex: 1,
    },
    statusBody: {
      color: colors.textMuted,
      fontSize: 15,
      lineHeight: 22,
    },
    statusCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 28,
      borderWidth: 1,
      gap: 12,
      padding: 20,
    },
    statusEyebrow: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.3,
      textTransform: 'uppercase',
    },
    statusHeaderRow: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    statusHint: {
      color: colors.textMuted,
      fontSize: 13,
      lineHeight: 19,
    },
    statusSourceChip: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    statusSourceChipText: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    statusTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '800',
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: 15,
      lineHeight: 23,
    },
    title: {
      color: colors.text,
      fontSize: 26,
      fontWeight: '800',
      lineHeight: 32,
    },
  });
