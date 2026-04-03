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
import type {
  LastScanResult,
  ScanQuality,
  ScannerState,
} from '../types/scanner';
import { normalizeBarcode } from '../utils/barcode';

type ScannerScreenProps = NativeStackScreenProps<RootStackParamList, 'Scanner'>;

const DUPLICATE_SCAN_WINDOW_MS = 2000;
const RETRY_SCAN_PROMPT_MS = 2500;
const POOR_SCAN_PROMPT_MS = 6000;

function getOverlayLabel(scannerState: ScannerState, scanQuality: ScanQuality) {
  if (scannerState === 'loading') {
    return 'Checking Barcode';
  }

  if (scannerState === 'empty') {
    return 'No Match Yet';
  }

  if (scannerState === 'error') {
    return 'Scanner Paused';
  }

  return scanQuality === 'poor' ? 'Need A Clearer View' : 'Live Scanner';
}

function getHelperText(scannerState: ScannerState, scanQuality: ScanQuality) {
  if (scannerState === 'loading') {
    return 'Hold steady';
  }

  if (scannerState === 'empty') {
    return 'Type it instead';
  }

  if (scannerState === 'error') {
    return 'Scan again';
  }

  if (scanQuality === 'retry') {
    return 'Move closer';
  }

  if (scanQuality === 'poor') {
    return 'Type it instead';
  }

  return 'Hold steady';
}

function getStatusContent(
  scannerState: ScannerState,
  lastScan: LastScanResult | null,
  errorMessage: string | null,
  scanQuality: ScanQuality,
  showManualFallbackHint: boolean
) {
  if (scannerState === 'loading') {
    return {
      body: lastScan
        ? `Loading ${lastScan.barcode}.`
        : 'Loading product.',
      eyebrow: 'Loading',
      title: 'Checking product',
    };
  }

  if (scannerState === 'empty') {
    return {
      body: lastScan
        ? `No match for ${lastScan.barcode}.`
        : 'No match found.',
      eyebrow: 'No Match',
      title: 'Product not found',
    };
  }

  if (scannerState === 'error') {
    return {
      body:
        errorMessage ||
        'Could not load this product.',
      eyebrow: 'Error',
      title: 'Try again',
    };
  }

  if (showManualFallbackHint) {
    return {
      body: 'If the camera misses it, type the barcode number below.',
      eyebrow: 'Manual Entry',
      title: 'Need a faster route?',
    };
  }

  if (scanQuality === 'retry') {
    return {
      body: 'Move the barcode closer and keep the camera steady.',
      eyebrow: 'Retry',
      title: 'Almost there',
    };
  }

  if (scanQuality === 'poor') {
    return {
      body: 'Glare or distance may be getting in the way. Typing the barcode is quicker now.',
      eyebrow: 'Retry',
      title: 'Camera needs a cleaner read',
    };
  }

  return {
    body: 'Point the camera at a barcode.',
    eyebrow: 'Ready',
    title: 'Scan barcode',
  };
}

export default function ScannerScreen({ navigation, route }: ScannerScreenProps) {
  const { colors, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const [cameraPermission, requestPermission] = useCameraPermissions();
  const [cameraResetKey, setCameraResetKey] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAppActive, setIsAppActive] = useState(AppState.currentState === 'active');
  const [isLookupInFlight, setIsLookupInFlight] = useState(false);
  const [lastScan, setLastScan] = useState<LastScanResult | null>(null);
  const [manualBarcodeInput, setManualBarcodeInput] = useState('');
  const [manualEntryError, setManualEntryError] = useState<string | null>(null);
  const [readyStartedAt, setReadyStartedAt] = useState(Date.now());
  const [scanQuality, setScanQuality] = useState<ScanQuality>('good');
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
    setReadyStartedAt(Date.now());
    setScanQuality('good');
    setScannerState('ready');
    activeLookupRef.current = false;
    recentScanRef.current = null;
  }, [isFocused]);

  useEffect(() => {
    if (scannerState !== 'ready' || !isFocused || !isAppActive) {
      return;
    }

    const intervalId = setInterval(() => {
      const elapsed = Date.now() - readyStartedAt;

      if (elapsed >= POOR_SCAN_PROMPT_MS) {
        setScanQuality('poor');
      } else if (elapsed >= RETRY_SCAN_PROMPT_MS) {
        setScanQuality('retry');
      } else {
        setScanQuality('good');
      }
    }, 250);

    return () => {
      clearInterval(intervalId);
    };
  }, [isAppActive, isFocused, readyStartedAt, scannerState]);

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
    setReadyStartedAt(Date.now());
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
    setReadyStartedAt(Date.now());
    setScanQuality('good');
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
  const showManualFallbackHint =
    scannerState === 'ready' &&
    scanQuality === 'poor' &&
    isManualBarcodeEntryEnabled;
  const statusContent = getStatusContent(
    scannerState,
    lastScan,
    errorMessage,
    scanQuality,
    showManualFallbackHint
  );
  const scannerHeight =
    windowHeight < 700 ? 330 : windowHeight < 780 ? 360 : 400;
  const cameraKey = `scanner-${cameraResetKey}-${isFocused ? 'focused' : 'idle'}`;
  const shouldRenderLiveCamera =
    hasPermission && isFocused && isAppActive && scannerState === 'ready' && !isLookupInFlight;

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.backgroundGlow} />
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom + 122, 148) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {hasPermission ? (
              <BarcodeScannerPanel
                cameraKey={cameraKey}
                helperText={getHelperText(scannerState, scanQuality)}
                height={scannerHeight}
                // Unmount the camera when the screen is paused or backgrounded so
                // Android can reclaim camera and preview memory immediately.
                isActive={shouldRenderLiveCamera}
                isFocused={isFocused && isAppActive}
                onCameraMountError={handleCameraMountError}
                onBarcodeScanned={handleBarcodeScanned}
                overlayLabel={getOverlayLabel(scannerState, scanQuality)}
              />
            ) : (
              <View style={styles.permissionCard}>
                <Text style={styles.permissionTitle}>Camera access needed</Text>
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
            <Text style={styles.statusEyebrow}>{statusContent.eyebrow}</Text>
            <Text style={styles.statusTitle}>{statusContent.title}</Text>
            <Text style={styles.statusBody}>{statusContent.body}</Text>

            {scannerState === 'loading' ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={colors.primary} size="small" />
                <Text style={styles.loadingText}>Loading...</Text>
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
  colors: ReturnType<typeof useAppTheme>['colors'],
  typography: ReturnType<typeof useAppTheme>['typography']
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
      fontFamily: typography.bodyFontFamily,
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
      fontFamily: typography.bodyFontFamily,
      fontSize: 16,
      lineHeight: 24,
    },
    permissionTitle: {
      color: colors.text,
      fontFamily: typography.headingFontFamily,
      fontSize: 22,
      fontWeight: '800',
    },
    safeArea: {
      backgroundColor: colors.background,
      flex: 1,
    },
    statusBody: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
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
      fontFamily: typography.accentFontFamily,
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
      fontFamily: typography.bodyFontFamily,
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
      fontFamily: typography.accentFontFamily,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    statusTitle: {
      color: colors.text,
      fontFamily: typography.headingFontFamily,
      fontSize: 20,
      fontWeight: '800',
    },
  });
