import { CameraView, type CameraCapturedPicture } from 'expo-camera';
import { useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useI18n } from './AppLanguageProvider';
import { useAppTheme } from './AppThemeProvider';

type OcrCapturePanelProps = {
  isBusy: boolean;
  onCancel: () => void;
  onCapture: (photo: CameraCapturedPicture) => Promise<void> | void;
  onMountError?: (message: string) => void;
};

const GUIDANCE_CHIPS = ['Move closer', 'Avoid glare', 'Hold steady'];

export default function OcrCapturePanel({
  isBusy,
  onCancel,
  onCapture,
  onMountError,
}: OcrCapturePanelProps) {
  const { t } = useI18n();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const cameraRef = useRef<CameraView | null>(null);

  const handleCapture = async () => {
    if (!cameraRef.current || isBusy) {
      return;
    }

    const photo = await cameraRef.current.takePictureAsync({
      exif: false,
      quality: 1,
      shutterSound: false,
      skipProcessing: false,
    });

    await onCapture(photo);
  };

  return (
    <View style={styles.card}>
      <View style={styles.cameraWrap}>
        <CameraView
          ref={cameraRef}
          autofocus="on"
          facing="back"
          onMountError={(event) => onMountError?.(event.message)}
          ratio="4:3"
          style={styles.camera}
          zoom={0.04}
        />

        <View pointerEvents="none" style={styles.overlay}>
          <View style={styles.overlayTop}>
            <View style={styles.overlayBadge}>
              <Text style={styles.overlayBadgeText}>{t('Ingredients')}</Text>
            </View>
          </View>

          <View style={styles.frame} />

          <View style={styles.guidanceRow}>
            {GUIDANCE_CHIPS.map((chip) => (
              <View key={chip} style={styles.guidanceChip}>
                <Text style={styles.guidanceChipText}>{chip}</Text>
              </View>
            ))}
          </View>

        </View>
      </View>

      <View style={styles.footer}>
        <Pressable onPress={onCancel} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>{t('Cancel')}</Text>
        </Pressable>

        <Pressable
          disabled={isBusy}
          onPress={() => void handleCapture()}
          style={({ pressed }) => [
            styles.captureButton,
            isBusy && styles.captureButtonDisabled,
            pressed && !isBusy && styles.captureButtonPressed,
          ]}
        >
          {isBusy ? (
            <ActivityIndicator color={colors.surface} size="small" />
          ) : (
            <Text style={styles.captureButtonText}>{t('Capture')}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (
  colors: ReturnType<typeof useAppTheme>['colors']
) =>
  StyleSheet.create({
    camera: {
      flex: 1,
    },
    cameraWrap: {
      borderRadius: 24,
      height: 430,
      overflow: 'hidden',
      position: 'relative',
    },
    captureButton: {
      alignItems: 'center',
      backgroundColor: colors.primary,
      borderRadius: 999,
      flex: 1,
      justifyContent: 'center',
      minHeight: 52,
      paddingHorizontal: 18,
    },
    captureButtonDisabled: {
      opacity: 0.72,
    },
    captureButtonPressed: {
      opacity: 0.9,
    },
    captureButtonText: {
      color: colors.surface,
      fontSize: 15,
      fontWeight: '800',
    },
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 28,
      borderWidth: 1,
      gap: 16,
      padding: 18,
    },
    footer: {
      flexDirection: 'row',
      gap: 12,
    },
    frame: {
      borderColor: 'rgba(255,255,255,0.92)',
      borderRadius: 24,
      borderWidth: 2,
      height: '54%',
      width: '84%',
    },
    guidanceChip: {
      backgroundColor: 'rgba(255,255,255,0.14)',
      borderColor: 'rgba(255,255,255,0.28)',
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    guidanceChipText: {
      color: colors.surface,
      fontSize: 12,
      fontWeight: '700',
    },
    guidanceRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      justifyContent: 'center',
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
    overlayBadge: {
      backgroundColor: 'rgba(255,255,255,0.14)',
      borderColor: 'rgba(255,255,255,0.3)',
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    overlayBadgeText: {
      color: colors.surface,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.3,
      textTransform: 'uppercase',
    },
    overlayTop: {
      alignItems: 'flex-start',
      width: '100%',
    },
    secondaryButton: {
      alignItems: 'center',
      borderColor: colors.border,
      borderRadius: 999,
      borderWidth: 1,
      justifyContent: 'center',
      minHeight: 52,
      paddingHorizontal: 18,
    },
    secondaryButtonText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '700',
    },
  });
