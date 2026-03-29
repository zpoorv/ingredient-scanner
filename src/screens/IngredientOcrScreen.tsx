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
import { loadCurrentPremiumEntitlement } from '../services/premiumEntitlementService';
import { showRewardedOcrUnlockAd } from '../services/rewardedAdService';
import { getPremiumSession } from '../store';
import { buildResolvedProductFromOcr } from '../utils/ocrResolvedProduct';

type IngredientOcrScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'IngredientOcr'
>;

export default function IngredientOcrScreen({
  navigation,
  route,
}: IngredientOcrScreenProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const selectedProfileId = route.params?.profileId || DEFAULT_DIET_PROFILE_ID;

  useEffect(() => {
    if (!isFocused) {
      // Clear the preview when this screen goes to the background so we do not
      // keep a large decoded bitmap alive behind the result screen.
      setIsGuidedCameraVisible(false);
      setPreviewUri(null);
    }
  }, [isFocused]);

  useEffect(() => {
    let isMounted = true;

    if (!isFocused) {
      return;
    }

    void loadCurrentPremiumEntitlement().then(async (entitlement) => {
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
  }: {
    height?: number | null;
    uri: string;
    width?: number | null;
  }) => {
    const entitlement = await loadCurrentPremiumEntitlement();
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
        height: height ?? null,
        uri,
        width: width ?? null,
      });
      const product = buildResolvedProductFromOcr(ocrResult);
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

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: isCropEnabled,
      aspect: [4, 3],
      mediaTypes: ['images'],
      quality: 1,
      selectionLimit: 1,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      await handleAsset({
        height: result.assets[0].height ?? null,
        uri: result.assets[0].uri,
        width: result.assets[0].width ?? null,
      });
    }
  };

  const handleGuidedCapture = async (photo: CameraCapturedPicture) => {
    setIsGuidedCameraVisible(false);
    await handleAsset({
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
    ? 'Crop Before OCR is on, and the guided camera keeps the ingredient area centered.'
    : 'Crop Before OCR is off. Keep the ingredient lines filling most of the frame.';
  const quotaSummaryText = featureQuotaSnapshot?.isUnlimited
    ? 'Premium keeps ingredient OCR unlimited and ad-free.'
    : featureQuotaSnapshot
      ? `${featureQuotaSnapshot.remaining} of 5 basic OCR scans left today.`
      : 'Checking your OCR allowance...';

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
          <Text style={styles.captureFlowText}>
            We now capture a higher-quality photo first, then retry OCR on tighter cropped
            variants for a cleaner ingredient read.
          </Text>
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
          <Text style={styles.usageLabel}>OCR plan access</Text>
          <Text style={styles.usageTitle}>
            {featureQuotaSnapshot?.isUnlimited
              ? 'Unlimited scans available'
              : featureQuotaSnapshot
                ? `${featureQuotaSnapshot.remaining} scan${featureQuotaSnapshot.remaining === 1 ? '' : 's'} left today`
                : 'Loading daily OCR access'}
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
                ? 'On: keep using manual crop before OCR and add an extra center crop retry.'
                : 'Off: use the original full image and OCR crop retries only.'}
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
          <Text style={styles.eyebrow}>Ingredient Label OCR</Text>
          <Text style={styles.title}>Photograph an ingredient list</Text>
          <Text style={styles.subtitle}>
            Take a clear photo of the ingredients section, and we will extract the
            text and run the same highlighting and scoring pipeline used for barcode scans.
          </Text>
        </View>

        {renderActionCard()}

        {previewUri ? (
          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>Selected Image</Text>
            <Image source={{ uri: previewUri }} style={styles.previewImage} />
          </View>
        ) : null}

        {isProcessing ? (
          <View style={styles.stateCard}>
            <ActivityIndicator color={colors.primary} size="small" />
            <Text style={styles.stateText}>
              Extracting text and isolating the ingredient section...
            </Text>
          </View>
        ) : null}

        {errorMessage ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>OCR needs another try</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (
  colors: ReturnType<typeof useAppTheme>['colors']
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
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  captureFlowText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  captureFlowTitle: {
    color: colors.text,
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
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  cropToggleBadgeTextActive: {
    color: colors.surface,
  },
  cropToggleHint: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  cropToggleHintActive: {
    color: colors.primary,
  },
  cropToggleLabel: {
    color: colors.text,
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
    fontSize: 14,
    lineHeight: 21,
  },
  errorTitle: {
    color: colors.danger,
    fontSize: 17,
    fontWeight: '800',
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  helperText: {
    color: colors.textMuted,
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
  previewImage: {
    backgroundColor: colors.background,
    borderRadius: 18,
    height: 220,
    width: '100%',
  },
  previewLabel: {
    color: colors.text,
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
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textMuted,
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
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  usageText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  usageTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
  },
  });
