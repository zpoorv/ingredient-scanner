import * as ImagePicker from 'expo-image-picker';
import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  useCameraPermissions,
  type CameraCapturedPicture,
} from 'expo-camera';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '../components/AppThemeProvider';
import OcrCapturePanel from '../components/OcrCapturePanel';
import PrimaryButton from '../components/PrimaryButton';
import { DEFAULT_DIET_PROFILE_ID } from '../constants/dietProfiles';
import type { PremiumEntitlement } from '../models/premium';
import type { RootStackParamList } from '../navigation/types';
import {
  consumeFeatureQuota,
  grantRewardedOcrBonus,
  loadFeatureQuotaSnapshot,
  type FeatureQuotaSnapshot,
} from '../services/featureUsageStorage';
import {
  IngredientLabelOcrError,
  recognizeIngredientLabelImage,
} from '../services/ingredientLabelOcr';
import {
  hasPremiumFeatureAccess,
} from '../services/premiumEntitlementService';
import { showRewardedOcrUnlockAd } from '../services/rewardedAdService';
import { loadSessionPremiumEntitlement } from '../services/sessionDataService';
import { getPremiumSession } from '../store';
import { buildResolvedProductFromOcr } from '../utils/ocrResolvedProduct';

type IngredientOcrScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'IngredientOcr'
>;

type PendingOcrAsset = {
  height?: number | null;
  uri: string;
  width?: number | null;
};

export default function IngredientOcrScreen({
  navigation,
  route,
}: IngredientOcrScreenProps) {
  const { colors, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [featureQuotaSnapshot, setFeatureQuotaSnapshot] =
    useState<FeatureQuotaSnapshot | null>(null);
  const [isGuidedCameraVisible, setIsGuidedCameraVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCropEnabled, setIsCropEnabled] = useState(true);
  const [isRewardedAdLoading, setIsRewardedAdLoading] = useState(false);
  const [premiumEntitlement, setPremiumEntitlement] = useState<PremiumEntitlement>(
    getPremiumSession()
  );
  const [pendingAsset, setPendingAsset] = useState<PendingOcrAsset | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const selectedProfileId = route.params?.profileId || DEFAULT_DIET_PROFILE_ID;

  useEffect(() => {
    if (!isFocused) {
      // Clear the preview when this screen goes to the background so we do not
      // keep a large decoded bitmap alive behind the result screen.
      setIsGuidedCameraVisible(false);
      setPendingAsset(null);
      setPreviewUri(null);
    }
  }, [isFocused]);

  useEffect(() => {
    let isMounted = true;

    if (!isFocused) {
      return;
    }

    void loadSessionPremiumEntitlement('stale-while-revalidate').then(async (entitlement) => {
      const quotaSnapshot = await loadFeatureQuotaSnapshot('ingredient-ocr', entitlement);

      if (isMounted) {
        setPremiumEntitlement(entitlement);
        setFeatureQuotaSnapshot(quotaSnapshot);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isFocused]);

  const handleAsset = async ({
    uri,
    width,
    height,
  }: PendingOcrAsset) => {
    const entitlement = await loadSessionPremiumEntitlement('stale-while-revalidate');
    const quotaResult = await consumeFeatureQuota('ingredient-ocr', entitlement);

    setPremiumEntitlement(entitlement);
    setFeatureQuotaSnapshot(quotaResult.snapshot);

    if (!quotaResult.allowed) {
      setErrorMessage(
        'Your 5 basic OCR scans are used for today. Watch one rewarded ad to unlock one more scan, or upgrade for unlimited OCR.'
      );
      return;
    }

    setPreviewUri(uri);
    setErrorMessage(null);
    setCameraError(null);
    setIsProcessing(true);

    try {
      const ocrResult = await recognizeIngredientLabelImage({
        enhancedRecovery: hasPremiumFeatureAccess(
          'advanced-ocr-recovery',
          entitlement
        ),
        height: height ?? null,
        uri,
        width: width ?? null,
      });
      const product = buildResolvedProductFromOcr(ocrResult);
      setPendingAsset(null);
      setPreviewUri(null);
      setIsGuidedCameraVisible(false);

      navigation.push('Result', {
        barcode: 'OCR INGREDIENT SCAN',
        persistToHistory: false,
        product,
        profileId: selectedProfileId,
        resultSource: 'ingredient-ocr',
      });
    } catch (error) {
      if (error instanceof IngredientLabelOcrError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('We could not read that label right now. Try another photo.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const stageAssetForConfirmation = (asset: PendingOcrAsset) => {
    setPendingAsset(asset);
    setPreviewUri(asset.uri);
    setErrorMessage(null);
    setCameraError(null);
    setIsGuidedCameraVisible(false);
  };

  const handleOpenGuidedCamera = async () => {
    if (
      featureQuotaSnapshot &&
      !featureQuotaSnapshot.canUse &&
      !featureQuotaSnapshot.isUnlimited
    ) {
      setErrorMessage(
        'Your daily basic OCR scans are used. Watch a rewarded ad below to unlock one more scan.'
      );
      return;
    }

    const permission = cameraPermission?.granted
      ? cameraPermission
      : await requestCameraPermission();

    if (!permission.granted) {
      setErrorMessage('Camera permission is required to photograph an ingredient label.');
      return;
    }

    setPendingAsset(null);
    setPreviewUri(null);
    setErrorMessage(null);
    setCameraError(null);
    setIsGuidedCameraVisible(true);
  };

  const handleChoosePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setErrorMessage('Photo access is required to import an ingredient label image.');
      return;
    }

    setPendingAsset(null);
    setPreviewUri(null);
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: isCropEnabled,
      aspect: [4, 3],
      mediaTypes: ['images'],
      quality: 1,
      selectionLimit: 1,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      stageAssetForConfirmation({
        height: result.assets[0].height ?? null,
        uri: result.assets[0].uri,
        width: result.assets[0].width ?? null,
      });
    }
  };

  const handleGuidedCapture = async (photo: CameraCapturedPicture) => {
    stageAssetForConfirmation({
      height: photo.height,
      uri: photo.uri,
      width: photo.width,
    });
  };

  const handleCameraMountError = (message: string) => {
    setCameraError(message);
    setIsGuidedCameraVisible(false);
    setErrorMessage(
      'The guided camera could not start right now. You can still use the gallery import instead.'
    );
  };

  const helperCopy = isCropEnabled
    ? 'Crop before reading.'
    : 'Use the full image.';
  const quotaSummaryText = featureQuotaSnapshot?.isUnlimited
    ? 'Premium keeps ingredient photo scans unlimited and ad-free.'
    : featureQuotaSnapshot
      ? `${featureQuotaSnapshot.remaining} of 5 daily ingredient scans left.`
      : 'Checking your daily ingredient scans...';

  const liveCaptureTips = [
    'Center the ingredient lines inside the capture box.',
    'Fill most of the frame with text before capturing.',
    'Avoid reflections and strong glare on glossy packaging.',
  ];

  const captureStatusMessage =
    cameraPermission && !cameraPermission.granted
      ? 'Allow camera access to use the guided ingredient capture flow.'
      : cameraError;

  const handleCloseGuidedCamera = () => {
    setIsGuidedCameraVisible(false);
    setCameraError(null);
  };

  const handleWatchRewardedAd = async () => {
    setIsRewardedAdLoading(true);

    try {
      const result = await showRewardedOcrUnlockAd();

      if (result === 'rewarded') {
        const nextSnapshot = await grantRewardedOcrBonus();
        setFeatureQuotaSnapshot(nextSnapshot);
        setErrorMessage(null);
        return;
      }

      setErrorMessage(
        result === 'dismissed'
          ? 'The ad closed before the reward completed, so no extra OCR scan was unlocked.'
          : 'A rewarded ad is not available right now. Try again in a moment.'
      );
    } finally {
      setIsRewardedAdLoading(false);
    }
  };

  const renderActionCard = () => {
    if (isGuidedCameraVisible) {
      return (
        <View style={styles.captureFlowCard}>
          <Text style={styles.captureFlowLabel}>Live guided capture</Text>
          <Text style={styles.captureFlowTitle}>Frame the ingredient block tightly</Text>
          <Text style={styles.captureFlowText}>Capture the ingredient lines clearly, then confirm the photo before OCR starts.</Text>
          <OcrCapturePanel
            isBusy={isProcessing}
            onCancel={handleCloseGuidedCamera}
            onCapture={handleGuidedCapture}
            onMountError={handleCameraMountError}
          />
          {captureStatusMessage ? (
            <View style={styles.inlineNoticeCard}>
              <Text style={styles.inlineNoticeText}>{captureStatusMessage}</Text>
            </View>
          ) : null}
        </View>
      );
    }

    return (
      <View style={styles.actionCard}>
        <View style={styles.usageCard}>
          <Text style={styles.usageLabel}>Daily scans</Text>
          <Text style={styles.usageTitle}>
            {featureQuotaSnapshot?.isUnlimited
              ? 'Unlimited scans'
              : featureQuotaSnapshot
                ? `${featureQuotaSnapshot.remaining} scan${featureQuotaSnapshot.remaining === 1 ? '' : 's'} left today`
                : 'Loading...'}
          </Text>
          <Text style={styles.usageText}>{quotaSummaryText}</Text>
          {!premiumEntitlement.isPremium &&
          featureQuotaSnapshot &&
          !featureQuotaSnapshot.canUse ? (
            <View style={styles.rewardActions}>
              <PrimaryButton
                disabled={isRewardedAdLoading}
                label={
                  isRewardedAdLoading
                    ? 'Loading Rewarded Ad...'
                    : 'Watch Ad For 1 More OCR Scan'
                }
                onPress={() => void handleWatchRewardedAd()}
              />
              <PrimaryButton
                label="View Premium"
                onPress={() => navigation.navigate('Premium', { featureId: 'ingredient-ocr' })}
              />
            </View>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => setIsCropEnabled((value) => !value)}
          style={[
            styles.cropToggle,
            isCropEnabled && styles.cropToggleActive,
          ]}
        >
          <View style={styles.cropToggleContent}>
            <Text
              style={[
                styles.cropToggleLabel,
                isCropEnabled && styles.cropToggleLabelActive,
              ]}
            >
              Crop Before OCR
            </Text>
            <Text
              style={[
                styles.cropToggleHint,
                isCropEnabled && styles.cropToggleHintActive,
              ]}
            >
              {isCropEnabled
                ? 'Crop before reading.'
                : 'Use the full image.'}
            </Text>
          </View>
          <View
            style={[
              styles.cropToggleBadge,
              isCropEnabled && styles.cropToggleBadgeActive,
            ]}
          >
            <Text
              style={[
                styles.cropToggleBadgeText,
                isCropEnabled && styles.cropToggleBadgeTextActive,
              ]}
            >
              {isCropEnabled ? 'On' : 'Off'}
            </Text>
          </View>
        </Pressable>
        <PrimaryButton
          disabled={
            isProcessing ||
            (!premiumEntitlement.isPremium &&
              featureQuotaSnapshot !== null &&
              !featureQuotaSnapshot.canUse)
          }
          label={isProcessing ? 'Reading Label...' : 'Open Guided Camera'}
          onPress={() => void handleOpenGuidedCamera()}
        />
        <PrimaryButton
          disabled={
            isProcessing ||
            (!premiumEntitlement.isPremium &&
              featureQuotaSnapshot !== null &&
              !featureQuotaSnapshot.canUse)
          }
          label={isProcessing ? 'Reading Label...' : 'Choose From Gallery'}
          onPress={() => void handleChoosePhoto()}
        />
        <Text style={styles.helperText}>{helperCopy}</Text>
        <View style={styles.tipList}>
          {liveCaptureTips.map((tip) => (
            <View key={tip} style={styles.tipRow}>
              <View style={styles.tipDot} />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom + 24, 32) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>Ingredient Photo</Text>
          <Text style={styles.title}>Photograph the ingredient list</Text>
        </View>

        {renderActionCard()}

        {previewUri ? (
          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>
              {pendingAsset ? 'Confirm photo' : 'Selected image'}
            </Text>
            <Image source={{ uri: previewUri }} style={styles.previewImage} />
            {pendingAsset ? (
              <View style={styles.previewActions}>
                <PrimaryButton
                  disabled={isProcessing}
                  label={isProcessing ? 'Reading Label...' : 'Use This Photo'}
                  onPress={() => void handleAsset(pendingAsset)}
                />
                <PrimaryButton
                  disabled={isProcessing}
                  label="Retake"
                  onPress={() => {
                    setPendingAsset(null);
                    setPreviewUri(null);
                    setErrorMessage(null);
                  }}
                />
              </View>
            ) : null}
          </View>
        ) : null}

        {isProcessing ? (
          <View style={styles.stateCard}>
            <ActivityIndicator color={colors.primary} size="small" />
            <Text style={styles.stateText}>Reading label...</Text>
          </View>
        ) : null}

        {errorMessage ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Try again</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
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
  actionCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
    padding: 20,
  },
  content: {
    gap: 18,
    paddingHorizontal: 24,
    paddingTop: 18,
  },
  captureFlowCard: {
    gap: 14,
  },
  captureFlowLabel: {
    color: colors.primary,
    fontFamily: typography.accentFontFamily,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  captureFlowText: {
    color: colors.textMuted,
    fontFamily: typography.bodyFontFamily,
    fontSize: 14,
    lineHeight: 21,
  },
  captureFlowTitle: {
    color: colors.text,
    fontFamily: typography.headingFontFamily,
    fontSize: 22,
    fontWeight: '800',
  },
  cropToggle: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cropToggleActive: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  cropToggleContent: {
    flex: 1,
    paddingRight: 12,
  },
  cropToggleBadge: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    flexShrink: 0,
    minWidth: 52,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  cropToggleBadgeActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  cropToggleBadgeText: {
    color: colors.textMuted,
    fontFamily: typography.accentFontFamily,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  cropToggleBadgeTextActive: {
    color: colors.surface,
  },
  cropToggleHint: {
    color: colors.textMuted,
    fontFamily: typography.bodyFontFamily,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  cropToggleHintActive: {
    color: colors.primary,
  },
  cropToggleLabel: {
    color: colors.text,
    fontFamily: typography.headingFontFamily,
    fontSize: 15,
    fontWeight: '800',
  },
  cropToggleLabelActive: {
    color: colors.primary,
  },
  errorCard: {
    backgroundColor: colors.dangerMuted,
    borderRadius: 20,
    gap: 8,
    padding: 18,
  },
  errorText: {
    color: colors.danger,
    fontFamily: typography.bodyFontFamily,
    fontSize: 14,
    lineHeight: 21,
  },
  errorTitle: {
    color: colors.danger,
    fontFamily: typography.headingFontFamily,
    fontSize: 17,
    fontWeight: '800',
  },
  eyebrow: {
    color: colors.primary,
    fontFamily: typography.accentFontFamily,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  helperText: {
    color: colors.textMuted,
    fontFamily: typography.bodyFontFamily,
    fontSize: 14,
    lineHeight: 21,
  },
  inlineNoticeCard: {
    backgroundColor: colors.warningMuted,
    borderRadius: 18,
    padding: 14,
  },
  inlineNoticeText: {
    color: colors.warning,
    fontFamily: typography.bodyFontFamily,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
  },
  heroCard: {
    backgroundColor: colors.primaryMuted,
    borderRadius: 24,
    gap: 10,
    padding: 20,
  },
  previewCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
    padding: 20,
  },
  previewActions: {
    gap: 10,
  },
  previewImage: {
    backgroundColor: colors.background,
    borderRadius: 18,
    height: 220,
    width: '100%',
  },
  previewLabel: {
    color: colors.text,
    fontFamily: typography.headingFontFamily,
    fontSize: 16,
    fontWeight: '700',
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  stateCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
    padding: 18,
  },
  stateText: {
    color: colors.textMuted,
    fontFamily: typography.bodyFontFamily,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: typography.bodyFontFamily,
    fontSize: 15,
    lineHeight: 23,
  },
  rewardActions: {
    gap: 10,
    marginTop: 6,
  },
  tipDot: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: 8,
    marginTop: 6,
    width: 8,
  },
  tipList: {
    gap: 10,
  },
  tipRow: {
    flexDirection: 'row',
    gap: 10,
  },
  tipText: {
    color: colors.text,
    flex: 1,
    fontFamily: typography.bodyFontFamily,
    fontSize: 14,
    lineHeight: 20,
  },
  usageCard: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  usageLabel: {
    color: colors.primary,
    fontFamily: typography.accentFontFamily,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  usageText: {
    color: colors.textMuted,
    fontFamily: typography.bodyFontFamily,
    fontSize: 14,
    lineHeight: 21,
  },
  usageTitle: {
    color: colors.text,
    fontFamily: typography.headingFontFamily,
    fontSize: 20,
    fontWeight: '800',
  },
  title: {
    color: colors.text,
    fontFamily: typography.displayFontFamily,
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
  },
  });
