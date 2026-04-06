import {
  CameraView,
  type BarcodeScanningResult,
  type BarcodeType,
} from 'expo-camera';
import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from './AppThemeProvider';

const SUPPORTED_BARCODE_TYPES = [
  'ean13',
  'ean8',
  'upc_a',
  'upc_e',
  'code39',
  'code93',
  'code128',
  'codabar',
  'itf14',
] satisfies BarcodeType[];

type BarcodeScannerPanelProps = {
  cameraKey: string;
  helperText: string;
  height: number;
  isActive: boolean;
  isFocused: boolean;
  onCameraMountError?: (message: string) => void;
  onBarcodeScanned: (result: BarcodeScanningResult) => void;
  overlayActionLabel?: string;
  onOverlayActionPress?: () => void;
  overlayLabel: string;
};

function BarcodeScannerPanel({
  cameraKey,
  helperText,
  height,
  isActive,
  isFocused,
  onCameraMountError,
  onBarcodeScanned,
  overlayActionLabel,
  onOverlayActionPress,
  overlayLabel,
}: BarcodeScannerPanelProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const frameHeight = Math.min(220, Math.max(164, Math.round(height * 0.52)));
  const shouldRenderCamera = isFocused && isActive;

  return (
    <View style={[styles.scannerCard, { height }]}>
      <View style={styles.cameraContainer}>
        {shouldRenderCamera ? (
          <CameraView
            key={cameraKey}
            barcodeScannerSettings={{
              barcodeTypes: SUPPORTED_BARCODE_TYPES,
            }}
            facing="back"
            onMountError={(event) => onCameraMountError?.(event.message)}
            onBarcodeScanned={onBarcodeScanned}
            style={styles.camera}
          />
        ) : (
          <View style={styles.cameraPlaceholder} />
        )}

        <View style={styles.overlay}>
          <View style={styles.overlayTopRow}>
            <View style={styles.overlayPill}>
              <Text style={styles.overlayPillText}>{overlayLabel}</Text>
            </View>
          </View>

          <View style={[styles.scanFrame, { height: frameHeight }]}>
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
          </View>

          <View style={styles.overlayBottom}>
            <Text style={styles.helperText}>{helperText}</Text>
            {overlayActionLabel && onOverlayActionPress ? (
              <Pressable onPress={onOverlayActionPress} style={styles.overlayAction}>
                <Text style={styles.overlayActionText}>{overlayActionLabel}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

export default memo(BarcodeScannerPanel);

const createStyles = (
  colors: ReturnType<typeof useAppTheme>['colors']
) =>
  StyleSheet.create({
    camera: {
      flex: 1,
    },
    cameraContainer: {
      flex: 1,
    },
    cameraPlaceholder: {
      backgroundColor: colors.text,
      flex: 1,
    },
    corner: {
      borderColor: colors.surface,
      height: 30,
      position: 'absolute',
      width: 30,
    },
    cornerBottomLeft: {
      borderBottomWidth: 3,
      borderLeftWidth: 3,
      borderRadius: 8,
      bottom: -1,
      left: -1,
    },
    cornerBottomRight: {
      borderBottomWidth: 3,
      borderRadius: 8,
      borderRightWidth: 3,
      bottom: -1,
      right: -1,
    },
    cornerTopLeft: {
      borderLeftWidth: 3,
      borderRadius: 8,
      borderTopWidth: 3,
      left: -1,
      top: -1,
    },
    cornerTopRight: {
      borderRadius: 8,
      borderRightWidth: 3,
      borderTopWidth: 3,
      right: -1,
      top: -1,
    },
    helperText: {
      color: colors.surface,
      fontSize: 14,
      fontWeight: '600',
      lineHeight: 20,
      textAlign: 'center',
    },
    overlay: {
      alignItems: 'center',
      backgroundColor: colors.scanOverlay,
      bottom: 0,
      justifyContent: 'space-between',
      left: 0,
      paddingHorizontal: 18,
      paddingVertical: 20,
      position: 'absolute',
      right: 0,
      top: 0,
    },
    overlayPill: {
      backgroundColor: 'rgba(255, 255, 255, 0.12)',
      borderColor: 'rgba(255, 255, 255, 0.25)',
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    overlayPillText: {
      color: colors.surface,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.3,
      textTransform: 'uppercase',
    },
    overlayTopRow: {
      alignItems: 'flex-start',
      width: '100%',
    },
    overlayBottom: {
      alignItems: 'center',
      gap: 12,
      width: '100%',
    },
    overlayAction: {
      backgroundColor: 'rgba(255,255,255,0.92)',
      borderRadius: 999,
      paddingHorizontal: 18,
      paddingVertical: 10,
    },
    overlayActionText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    scanFrame: {
      borderColor: 'rgba(255, 255, 255, 0.32)',
      borderRadius: 24,
      borderWidth: 1,
      height: 220,
      width: '86%',
    },
    scannerCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 30,
      borderWidth: 1,
      overflow: 'hidden',
      width: '100%',
    },
  });
