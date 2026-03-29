import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  InteractionManager,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import ViewShot from 'react-native-view-shot';

import { useAppTheme } from '../components/AppThemeProvider';
import IngredientExplanationModal from '../components/IngredientExplanationModal';
import ProductSuggestionsCard from '../components/ProductSuggestionsCard';
import ResultCardSkeleton from '../components/ResultCardSkeleton';
import ShareCardPickerModal from '../components/ShareCardPickerModal';
import ShareResultCard from '../components/ShareResultCard';
import type { AppColors } from '../constants/theme';
import {
  DEFAULT_DIET_PROFILE_ID,
  type DietProfileId,
} from '../constants/dietProfiles';
import type { PremiumEntitlement } from '../models/premium';
import type { ShareCardStyleId } from '../models/shareCardStyle';
import type { RootStackParamList } from '../navigation/types';
import type { ProductSourceInfo } from '../types/product';
import type { ScanResultSource } from '../types/scanner';
import { loadAdminAppConfig } from '../services/adminAppConfigService';
import { syncDietProfileForCurrentUser } from '../services/dietProfileStorage';
import {
  consumeFeatureQuota,
  loadFeatureQuotaSnapshot,
  type FeatureQuotaSnapshot,
} from '../services/featureUsageStorage';
import {
  loadCurrentPremiumEntitlement,
} from '../services/premiumEntitlementService';
import { saveScanToHistory } from '../services/scanHistoryStorage';
import {
  saveShareCardStyleId,
  syncShareCardStyleForCurrentUser,
} from '../services/shareCardPreferenceStorage';
import { getPremiumSession, subscribePremiumSession } from '../store';
import {
  SHARE_CARD_STYLE_DEFINITIONS,
} from '../constants/shareCardStyles';
import { getGradeTone } from '../utils/gradeTone';
import {
  type IngredientExplanationLookup,
} from '../utils/ingredientExplanations';
import {
  type HighlightedIngredient,
} from '../utils/ingredientHighlighting';
import { formatProductName } from '../utils/productDisplay';
import type { ProductMetric } from '../utils/productInsights';
import { isLikelyFoodProduct } from '../utils/productType';
import {
  buildResultAnalysis,
  type ExplainedIngredient,
  type ResultAnalysis,
} from '../utils/resultAnalysis';
import { buildShareableResultCaption } from '../utils/shareableResult';

type ResultScreenProps = NativeStackScreenProps<RootStackParamList, 'Result'>;

function getToneColor(colors: AppColors, tone: 'good' | 'neutral' | 'warning') {
  if (tone === 'good') {
    return colors.success;
  }

  if (tone === 'warning') {
    return colors.warning;
  }

  return colors.textMuted;
}

function getIngredientToneColor(colors: AppColors, risk: HighlightedIngredient['risk']) {
  switch (risk) {
    case 'high-risk':
      return colors.danger;
    case 'caution':
      return colors.warning;
    default:
      return colors.success;
  }
}

function getIngredientToneBackground(colors: AppColors, risk: HighlightedIngredient['risk']) {
  switch (risk) {
    case 'high-risk':
      return colors.dangerMuted;
    case 'caution':
      return colors.warningMuted;
    default:
      return colors.successMuted;
  }
}

function getIngredientRiskLabel(risk: HighlightedIngredient['risk']) {
  switch (risk) {
    case 'high-risk':
      return 'High Risk';
    case 'caution':
      return 'Caution';
    default:
      return 'Safe';
  }
}

function getOffScoreTone(grade?: string | null) {
  return getGradeTone(grade);
}

function getHealthScoreTheme(colors: AppColors, score: number | null) {
  if (score === null) {
    return {
      accent: colors.textMuted,
      background: colors.background,
      label: 'Needs More Data',
      progress: 0,
      text: colors.text,
    };
  }

  if (score >= 80) {
    return {
      accent: colors.success,
      background: colors.successMuted,
      label: 'Great Choice',
      progress: score,
      text: colors.success,
    };
  }

  if (score >= 50) {
    return {
      accent: colors.warning,
      background: colors.warningMuted,
      label: 'Moderate',
      progress: score,
      text: colors.warning,
    };
  }

  return {
    accent: colors.danger,
    background: colors.dangerMuted,
    label: 'Needs Caution',
    progress: score,
    text: colors.danger,
  };
}

function getScanCompletionCopy(resultSource: ScanResultSource) {
  if (resultSource === 'ingredient-ocr') {
    return {
      body: 'Ingredients read.',
      label: 'Done',
    };
  }

  return {
    body: 'Product loaded.',
    label: 'Done',
  };
}

function getQuickUseGuidance(score: number | null, isFoodProduct: boolean) {
  if (!isFoodProduct || score === null) {
    return 'Not scored as a food item';
  }

  if (score >= 80) {
    return 'Good for regular use';
  }

  if (score >= 60) {
    return 'Okay in moderation';
  }

  if (score >= 40) {
    return 'Best kept occasional';
  }

  return 'Not ideal for frequent use';
}

function getSourceAttributionText(
  sources: ProductSourceInfo[] | undefined,
  resultSource: ScanResultSource
) {
  if (resultSource === 'ingredient-ocr') {
    return 'Based on the ingredient photo.';
  }

  const primarySource = sources?.find((source) => source.status === 'used');

  if (!primarySource) {
    return 'Based on available product details.';
  }

  return `Based on ${primarySource.label}.`;
}

export default function ResultScreen({ navigation, route }: ResultScreenProps) {
  const { colors, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const {
    barcode,
    barcodeType,
    persistToHistory,
    product,
    resultSource = 'barcode',
  } = route.params;
  const shareCardRef = useRef<ViewShot | null>(null);
  const shareCardImageReadyRef = useRef(false);
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [isShareCaptureMounted, setIsShareCaptureMounted] = useState(false);
  const [, setShareCardImageReady] = useState(false);
  const [isSharePickerVisible, setIsSharePickerVisible] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [hasResolvedProfile, setHasResolvedProfile] = useState(
    Boolean(route.params.profileId)
  );
  const [adminConfig, setAdminConfig] = useState<{
    enableRuleBasedSuggestions: boolean;
    resultDisclaimer: string | null;
    shareFooterText: string | null;
    showSourceAttribution: boolean;
  } | null>(null);
  const [analysisResult, setAnalysisResult] = useState<ResultAnalysis | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<DietProfileId>(
    route.params.profileId || DEFAULT_DIET_PROFILE_ID
  );
  const [selectedIngredient, setSelectedIngredient] =
    useState<ExplainedIngredient | null>(null);
  const [premiumEntitlement, setPremiumEntitlement] = useState<PremiumEntitlement>(
    getPremiumSession()
  );
  const [shareCardStyleId, setShareCardStyleId] =
    useState<ShareCardStyleId>('classic');
  const [draftShareCardStyleId, setDraftShareCardStyleId] =
    useState<ShareCardStyleId>('classic');
  const [captureShareCardStyleId, setCaptureShareCardStyleId] =
    useState<ShareCardStyleId>('classic');
  const [shareQuotaSnapshot, setShareQuotaSnapshot] =
    useState<FeatureQuotaSnapshot | null>(null);
  const displayProductName = useMemo(
    () => formatProductName(product?.name),
    [product?.name]
  );
  const isFoodProduct = useMemo(() => isLikelyFoodProduct(product), [product]);

  const barcodeFormatLabel = barcodeType
    ? barcodeType.replace(/_/g, ' ').toUpperCase()
    : null;
  const heroEyebrow =
    resultSource === 'ingredient-ocr' ? 'Ingredient Label OCR' : 'Scanned Barcode';
  const heroPrimaryText =
    resultSource === 'ingredient-ocr' ? 'Ingredient text extracted' : barcode;
  const heroBodyText =
    resultSource === 'ingredient-ocr'
      ? 'Ingredient label read.'
      : 'Barcode matched.';
  const scanCompletionCopy = getScanCompletionCopy(resultSource);
  const insights = analysisResult?.insights ?? null;
  const ingredientAnalysis = analysisResult?.ingredientAnalysis ?? null;
  const alternativeSuggestions = useMemo(
    () => analysisResult?.suggestions ?? [],
    [analysisResult?.suggestions]
  );
  const displayedSuggestions = useMemo(() => {
    if (
      adminConfig &&
      adminConfig.enableRuleBasedSuggestions === false &&
      !product.adminMetadata?.hasCustomAlternatives
    ) {
      return [];
    }

    return alternativeSuggestions;
  }, [
    adminConfig,
    alternativeSuggestions,
    product.adminMetadata?.hasCustomAlternatives,
  ]);
  const healthScoreTheme = useMemo(
    () => getHealthScoreTheme(colors, insights?.smartScore ?? null),
    [colors, insights?.smartScore]
  );
  const gradeTone = useMemo(
    () => getGradeTone(insights?.gradeLabel),
    [insights?.gradeLabel]
  );
  const selectedIngredientExplanation: IngredientExplanationLookup | null =
    selectedIngredient?.explanationLookup ?? null;
  const shareableResult = analysisResult?.shareableResult ?? null;
  const shareCardWidth = useMemo(
    () => Math.min(windowWidth - 64, 360),
    [windowWidth]
  );
  const quickUseGuidance = useMemo(
    () => getQuickUseGuidance(insights?.smartScore ?? null, isFoodProduct),
    [insights?.smartScore, isFoodProduct]
  );
  const sourceAttributionText = useMemo(
    () => getSourceAttributionText(product?.sources, resultSource),
    [product?.sources, resultSource]
  );
  const disclaimerText =
    adminConfig?.resultDisclaimer ||
    'Quick guide only.';
  const showSourceAttribution = adminConfig?.showSourceAttribution ?? true;
  const activeSharePreviewStyleId = premiumEntitlement.isPremium
    ? draftShareCardStyleId
    : 'classic';
  const shareLimitText = useMemo(() => {
    if (shareQuotaSnapshot?.isUnlimited) {
      return 'Premium sharing is unlimited and ad-free.';
    }

    if (shareQuotaSnapshot) {
      return `${shareQuotaSnapshot.remaining} of 5 basic share exports left today.`;
    }

    return 'Checking your daily share allowance.';
  }, [shareQuotaSnapshot]);

  useLayoutEffect(() => {
    navigation.setOptions({ title: displayProductName });
  }, [displayProductName, navigation]);

  useEffect(() => {
    if (route.params.profileId) {
      setSelectedProfileId(route.params.profileId);
      setHasResolvedProfile(true);
      return;
    }

    let isMounted = true;

    const restoreProfile = async () => {
      const savedProfileId = await syncDietProfileForCurrentUser();

      if (isMounted) {
        setSelectedProfileId(savedProfileId);
        setHasResolvedProfile(true);
      }
    };

    void restoreProfile();

    return () => {
      isMounted = false;
    };
  }, [route.params.profileId]);

  useEffect(() => {
    let isMounted = true;

    const restoreShareAccess = async () => {
      const entitlement = await loadCurrentPremiumEntitlement();
      const [quotaSnapshot, syncedShareCardStyleId] = await Promise.all([
        loadFeatureQuotaSnapshot('share-result-card', entitlement),
        syncShareCardStyleForCurrentUser(),
      ]);

      if (!isMounted) {
        return;
      }

      setPremiumEntitlement(entitlement);
      setShareQuotaSnapshot(quotaSnapshot);
      setShareCardStyleId(entitlement.isPremium ? syncedShareCardStyleId : 'classic');
      setDraftShareCardStyleId(
        entitlement.isPremium ? syncedShareCardStyleId : 'classic'
      );
    };

    const unsubscribe = subscribePremiumSession((entitlement) => {
      setPremiumEntitlement(entitlement);
      if (!isMounted) {
        return;
      }

      if (!entitlement.isPremium) {
        setShareCardStyleId('classic');
        setDraftShareCardStyleId('classic');
      }

      void loadFeatureQuotaSnapshot('share-result-card', entitlement).then((quotaSnapshot) => {
        if (isMounted) {
          setShareQuotaSnapshot(quotaSnapshot);
        }
      });
    });
    void restoreShareAccess();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const restoreAdminConfig = async () => {
      const config = await loadAdminAppConfig();

      if (!isMounted) {
        return;
      }

      setAdminConfig({
        enableRuleBasedSuggestions: config.enableRuleBasedSuggestions,
        resultDisclaimer: config.resultDisclaimer,
        shareFooterText: config.shareFooterText,
        showSourceAttribution: config.showSourceAttribution,
      });
    };

    void restoreAdminConfig();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setAnalysisResult(null);
    setSelectedIngredient(null);

    // Heavy ingredient parsing and score synthesis run after the first frame so
    // the product screen can paint quickly on slower Android devices.
    const interactionHandle = InteractionManager.runAfterInteractions(() => {
      setAnalysisResult(buildResultAnalysis(product, selectedProfileId));
    });

    return () => {
      interactionHandle.cancel();
    };
  }, [product, selectedProfileId]);

  useEffect(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  useEffect(() => {
    if (persistToHistory === false || !hasResolvedProfile) {
      return;
    }

    let isMounted = true;

    const persistHistoryEntry = async () => {
      try {
        await saveScanToHistory({
          barcode,
          barcodeType,
          profileId: selectedProfileId,
          product,
        });
      } catch (error) {
        if (__DEV__ && isMounted) {
          console.warn('Failed to save scan history entry', error);
        }
      }
    };

    void persistHistoryEntry();

    return () => {
      isMounted = false;
    };
  }, [
    barcode,
    barcodeType,
    hasResolvedProfile,
    persistToHistory,
    product,
    selectedProfileId,
  ]);

  const updateShareCardImageReady = (ready: boolean) => {
    shareCardImageReadyRef.current = ready;
    setShareCardImageReady(ready);
  };

  const handleOpenSharePicker = () => {
    if (!shareableResult || isSharing) {
      return;
    }

    setDraftShareCardStyleId(premiumEntitlement.isPremium ? shareCardStyleId : 'classic');
    updateShareCardImageReady(!Boolean(shareableResult.imageUrl));
    setIsSharePickerVisible(true);
  };

  const handleSelectShareCardStyle = (styleId: ShareCardStyleId) => {
    if (!premiumEntitlement.isPremium && styleId !== 'classic') {
      return;
    }

    setDraftShareCardStyleId(styleId);
  };

  const waitForShareCardToRender = async (needsRemoteImage: boolean) => {
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    await new Promise((resolve) => setTimeout(resolve, 40));

    if (!needsRemoteImage) {
      return;
    }

    for (let attempt = 0; attempt < 15; attempt += 1) {
      if (shareCardImageReadyRef.current) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 80));
    }
  };

  const handleShareResult = async () => {
    if (!shareableResult || isSharing) {
      return;
    }

    const entitlement = premiumEntitlement;
    const selectedStyleId = entitlement.isPremium ? draftShareCardStyleId : 'classic';
    const quotaResult = await consumeFeatureQuota('share-result-card', entitlement);
    setShareQuotaSnapshot(quotaResult.snapshot);

    if (!quotaResult.allowed) {
      Alert.alert(
        'Daily share limit reached',
        'Basic includes 5 result-card exports per day. Premium adds unlimited sharing and five extra share-card styles.',
        [
          { style: 'cancel', text: 'Not now' },
          {
            text: 'View Premium',
            onPress: () => navigation.navigate('Premium', { featureId: 'share-result-card' }),
          },
        ]
      );
      return;
    }

    if (!entitlement.isPremium && selectedStyleId !== 'classic') {
      setIsSharePickerVisible(false);
      navigation.navigate('Premium', { featureId: 'share-result-card' });
      return;
    }

    setIsSharing(true);
    setIsSharePickerVisible(false);
    setCaptureShareCardStyleId(selectedStyleId);
    setIsShareCaptureMounted(true);
    updateShareCardImageReady(!Boolean(shareableResult.imageUrl));

    try {
      if (entitlement.isPremium && selectedStyleId !== shareCardStyleId) {
        setShareCardStyleId(selectedStyleId);
        void saveShareCardStyleId(selectedStyleId).catch(() => {
          // Sharing should stay responsive even if preference sync lags.
        });
      }

      // Keep the off-screen capture surface unmounted until the user shares so
      // we do not hold a second large product image in memory during normal browsing.
      if (shareableResult.imageUrl) {
        await Image.prefetch(shareableResult.imageUrl);
      }

      await waitForShareCardToRender(Boolean(shareableResult.imageUrl));

      const imageUri = await shareCardRef.current?.capture?.();
      const shareMessage = buildShareableResultCaption(shareableResult);

      if (imageUri && (await Sharing.isAvailableAsync())) {
        try {
          await Sharing.shareAsync(imageUri, {
            dialogTitle: `Share ${shareableResult.productName}`,
            mimeType: 'image/png',
          });

          return;
        } catch (shareImageError) {
          if (__DEV__) {
            console.warn('Image share failed, falling back to text share', shareImageError);
          }
        }
      }

      await Share.share({
        message: shareMessage,
        title: shareableResult.productName,
      });
    } catch (error) {
      if (__DEV__) {
        console.warn('Failed to share result card', error);
      }

      Alert.alert(
        'Share unavailable',
        'Could not open the share sheet right now. Please try again.'
      );
    } finally {
      updateShareCardImageReady(false);
      setIsShareCaptureMounted(false);
      setIsSharing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {shareableResult && (isSharePickerVisible || isShareCaptureMounted) ? (
          <View style={styles.hiddenShareCapture}>
            <View collapsable={false}>
              <ViewShot
                options={{
                  fileName: `scan-result-${barcode}`,
                  format: 'png',
                  quality: 1,
                  result: 'tmpfile',
                }}
                ref={shareCardRef}
                style={{ width: shareCardWidth }}
              >
                <ShareResultCard
                  data={shareableResult}
                  footerText={adminConfig?.shareFooterText ?? null}
                  onImageLoadEnd={() => updateShareCardImageReady(true)}
                  variantId={
                    isShareCaptureMounted ? captureShareCardStyleId : activeSharePreviewStyleId
                  }
                />
              </ViewShot>
            </View>
          </View>
        ) : null}

        <View style={styles.scoreHeroCard}>
          <View style={styles.scoreHeroTopRow}>
            <View style={styles.completionPill}>
              <Ionicons color={colors.success} name="checkmark-circle" size={16} />
              <Text style={styles.completionPillText}>{scanCompletionCopy.label}</Text>
            </View>
            <View style={styles.profileChip}>
              <Text style={styles.profileChipText}>
                {insights?.profileLabel || 'Loading...'}
              </Text>
            </View>
          </View>

          <Text style={styles.scoreHeroProductName}>{displayProductName}</Text>
          <Text style={styles.scoreHeroSubtext}>{scanCompletionCopy.body}</Text>

          {!analysisResult ? (
            <ResultCardSkeleton />
          ) : insights && isFoodProduct ? (
            <>
              <View style={styles.scoreHeroMainRow}>
                <View
                  style={[
                    styles.scoreHeroBadge,
                    {
                      backgroundColor:
                        insights.smartScore === null
                          ? colors.surface
                          : healthScoreTheme.accent,
                      borderColor:
                        insights.smartScore === null
                          ? colors.border
                          : healthScoreTheme.accent,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.scoreHeroValue,
                      {
                        color:
                          insights.smartScore === null
                            ? colors.text
                            : colors.surface,
                      },
                    ]}
                  >
                    {insights.smartScore === null ? 'N/A' : insights.smartScore}
                  </Text>
                  <Text
                    style={[
                      styles.scoreHeroSuffix,
                      {
                        color:
                          insights.smartScore === null
                            ? colors.textMuted
                            : colors.surface,
                      },
                    ]}
                  >
                    /100
                  </Text>
                </View>

                <View style={styles.scoreHeroTextBlock}>
                  <Text
                    style={[
                      styles.scoreHeroGrade,
                      { color: gradeTone.color },
                    ]}
                  >
                    {`Grade ${insights.gradeLabel} • ${healthScoreTheme.label}`}
                  </Text>
                  <Text style={styles.scoreHeroVerdict}>{quickUseGuidance}</Text>
                  <Text style={styles.scoreHeroSummary}>{insights.summary}</Text>
                </View>
              </View>

              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: healthScoreTheme.accent,
                      width: `${healthScoreTheme.progress}%`,
                    },
                  ]}
                />
              </View>
              <View style={styles.scoreLegendRow}>
                <Text style={[styles.scoreLegendText, { color: colors.danger }]}>
                  Red &lt;50
                </Text>
                <Text style={[styles.scoreLegendText, { color: colors.warning }]}>
                  Yellow 50-79
                </Text>
                <Text style={[styles.scoreLegendText, { color: colors.success }]}>
                  Green 80+
                </Text>
              </View>

              {insights.cautions.length > 0 ? (
                <View style={styles.messageGroup}>
                  {insights.cautions.slice(0, 2).map((caution) => (
                    <Text key={caution} style={styles.cautionText}>
                      • {caution}
                    </Text>
                  ))}
                </View>
              ) : insights.highlights.length > 0 ? (
                <View style={styles.messageGroup}>
                  {insights.highlights.slice(0, 2).map((highlight) => (
                    <Text key={highlight} style={styles.goodText}>
                      • {highlight}
                    </Text>
                  ))}
                </View>
              ) : null}

              <View style={styles.trustBlock}>
                {showSourceAttribution ? (
                  <>
                    <Text style={styles.trustLabel}>Source</Text>
                    <Text style={styles.trustText}>{sourceAttributionText}</Text>
                  </>
                ) : null}
                <Text style={styles.disclaimerText}>{disclaimerText}</Text>
              </View>
            </>
          ) : (
            <View style={styles.trustBlock}>
              <Text style={styles.scoreHeroVerdict}>Not scored as food</Text>
              <Text style={styles.scoreHeroSummary}>
                Health scoring is only shown for edible food and drink products.
              </Text>
              <Text style={styles.disclaimerText}>{disclaimerText}</Text>
            </View>
          )}
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>{heroEyebrow}</Text>
          <Text style={styles.heroMetaPrimary}>{heroPrimaryText}</Text>
          {resultSource === 'barcode' && barcodeFormatLabel ? (
            <Text style={styles.heroMetaSecondary}>Format: {barcodeFormatLabel}</Text>
          ) : null}
          <Text style={styles.heroMetaSecondary}>{heroBodyText}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.label}>Product Overview</Text>

          {product?.imageUrl ? (
            <Image
              source={{ uri: product.imageUrl }}
              // This image can be large on Android, so keep it out of the
              // share tree and decode it only once in the visible layout.
              style={styles.productImage}
              resizeMode="contain"
            />
          ) : null}

          <Text style={styles.value}>{displayProductName}</Text>
          {product?.nameReason ? (
            <Text style={styles.statusText}>{product.nameReason}</Text>
          ) : null}
          {product ? (
            <>
              {product.brand || product.quantity ? (
                <Text style={styles.metaText}>
                  {[product.brand, product.quantity].filter(Boolean).join(' • ')}
                </Text>
              ) : null}
              {product.categories.length > 0 ? (
                <View style={styles.tagWrap}>
                  {product.categories.slice(0, 4).map((category) => (
                    <View key={category} style={styles.tagChip}>
                      <Text style={styles.tagText}>{category}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </>
          ) : (
            <Text style={styles.statusText}>No product details yet.</Text>
          )}
        </View>

        {!analysisResult ? (
          <ResultCardSkeleton />
        ) : (
          <ProductSuggestionsCard suggestions={displayedSuggestions} />
        )}

        <View style={styles.infoCard}>
          <Text style={styles.label}>Ingredients</Text>
          {!ingredientAnalysis ? (
            <ResultCardSkeleton />
          ) : ingredientAnalysis.explainedIngredients.length > 0 ? (
            <>
              <View style={styles.ingredientWrap}>
                {ingredientAnalysis.explainedIngredients.map((ingredient) => (
                  <Pressable
                    key={ingredient.id}
                    accessibilityHint="Shows a short explanation for this ingredient"
                    accessibilityRole="button"
                    onPress={() => setSelectedIngredient(ingredient)}
                    style={[
                      styles.ingredientRow,
                      {
                        backgroundColor: getIngredientToneBackground(colors, ingredient.risk),
                        borderColor: getIngredientToneColor(colors, ingredient.risk),
                      },
                    ]}
                  >
                    <View style={styles.ingredientRowTextBlock}>
                      <Text
                        style={[
                          styles.ingredientRowText,
                          {
                            color: getIngredientToneColor(colors, ingredient.risk),
                            fontWeight: ingredient.risk === 'safe' ? '600' : '700',
                          },
                        ]}
                      >
                        {ingredient.displayName}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.ingredientRiskBadge,
                        {
                          backgroundColor: getIngredientToneColor(colors, ingredient.risk),
                        },
                      ]}
                    >
                      <Text style={styles.ingredientRiskBadgeText}>
                        {getIngredientRiskLabel(ingredient.risk)}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.statusText}>
                Tap an ingredient for details.
              </Text>
            </>
          ) : (
            <Text style={styles.statusText}>No ingredient list available.</Text>
          )}

          {ingredientAnalysis?.highRiskIngredients.length ? (
            <Text style={styles.highRiskText}>
              High-risk: {ingredientAnalysis.highRiskIngredients.join(', ')}
            </Text>
          ) : null}

          {ingredientAnalysis?.cautionIngredients.length ? (
            <Text style={styles.cautionText}>
              Caution: {ingredientAnalysis.cautionIngredients.join(', ')}
            </Text>
          ) : product?.ingredientsText ? (
            <Text style={styles.safeText}>
              Current rule set marks the listed ingredients as safe.
            </Text>
          ) : (
            <Text style={styles.statusText}>No ingredient flags found.</Text>
          )}

          {product?.allergens.length ? (
            <Text style={styles.highRiskText}>
              Allergens: {product.allergens.join(', ')}
            </Text>
          ) : null}

          {product ? (
            <Text style={styles.statusText}>
              Additives reported: {product.additiveCount}
            </Text>
          ) : null}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.label}>Nutrition Snapshot</Text>
          {!analysisResult ? (
            <ResultCardSkeleton compact />
          ) : insights?.metrics.length ? (
            <View style={styles.metricWrap}>
              {insights.metrics.map((metric) => (
                <MetricChip key={metric.label} metric={metric} />
              ))}
            </View>
          ) : (
            <Text style={styles.statusText}>Nutrition details not available.</Text>
          )}

          {insights?.processingLabel ? (
            <Text style={styles.statusText}>
              Processing: {insights.processingLabel}
            </Text>
          ) : null}

          {product?.nutriScore ? (
            <View style={styles.scoreRow}>
              <Text style={styles.statusText}>Nutrition grade</Text>
              <View
                style={[
                  styles.gradeBadge,
                  {
                    backgroundColor: getOffScoreTone(product.nutriScore).backgroundColor,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.gradeText,
                    {
                      color: getOffScoreTone(product.nutriScore).color,
                    },
                  ]}
                >
                  {product.nutriScore}
                </Text>
              </View>
            </View>
          ) : null}

        {product?.novaGroup ? (
          <Text style={styles.statusText}>NOVA group: {product.novaGroup}</Text>
        ) : null}
        {product?.ecoScore ? (
          <Text style={styles.statusText}>Eco-Score: {product.ecoScore}</Text>
        ) : null}
      </View>

      </ScrollView>
      {shareableResult ? (
        <Pressable
          accessibilityLabel="Share result card"
          accessibilityRole="button"
          disabled={isSharing}
          onPress={handleOpenSharePicker}
          style={({ pressed }) => [
            styles.floatingShareButton,
            { bottom: Math.max(insets.bottom + 20, 36) },
            isSharing && styles.floatingShareButtonDisabled,
            pressed && !isSharing && styles.floatingShareButtonPressed,
          ]}
        >
          <Ionicons
            color={colors.surface}
            name={
              isSharing
                ? 'hourglass-outline'
                : 'share-social-outline'
            }
            size={24}
          />
        </Pressable>
      ) : null}
      <IngredientExplanationModal
        lookup={selectedIngredientExplanation}
        onClose={() => setSelectedIngredient(null)}
        visible={selectedIngredient !== null}
      />
      {shareableResult ? (
        <ShareCardPickerModal
          dailyLimitText={shareLimitText}
          footerText={adminConfig?.shareFooterText ?? null}
          isPremium={premiumEntitlement.isPremium}
          isSharing={isSharing}
          onClose={() => setIsSharePickerVisible(false)}
          onSelectStyle={handleSelectShareCardStyle}
          onShare={() => {
            void handleShareResult();
          }}
          onUpgrade={() => {
            setIsSharePickerVisible(false);
            navigation.navigate('Premium', { featureId: 'share-result-card' });
          }}
          selectedStyleId={premiumEntitlement.isPremium ? draftShareCardStyleId : 'classic'}
          shareData={shareableResult}
          styleDefinitions={SHARE_CARD_STYLE_DEFINITIONS}
          visible={isSharePickerVisible}
        />
      ) : null}
    </SafeAreaView>
  );
}

const MetricChip = memo(function MetricChip({ metric }: { metric: ProductMetric }) {
  const { colors, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);

  return (
    <View
      style={[
        styles.metricChip,
        { borderColor: getToneColor(colors, metric.tone) },
      ]}
    >
      <Text style={styles.metricLabel}>{metric.label}</Text>
      <Text style={[styles.metricValue, { color: getToneColor(colors, metric.tone) }]}>
        {metric.value}
      </Text>
    </View>
  );
});

const createStyles = (
  colors: AppColors,
  typography: ReturnType<typeof useAppTheme>['typography']
) =>
  StyleSheet.create({
  barcodeText: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  bodyText: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 24,
  },
  completionPill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.successMuted,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  completionPillText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  cautionText: {
    color: colors.warning,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
  },
  contentContainer: {
    gap: 18,
    padding: 24,
  },
  disclaimerText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  goodText: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
  },
  gradeBadge: {
    borderRadius: 999,
    minWidth: 44,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  gradeText: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  healthScoreLabel: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  healthScorePanel: {
    alignItems: 'center',
    borderRadius: 24,
    flexDirection: 'row',
    gap: 16,
    padding: 18,
  },
  healthScoreText: {
    flex: 1,
    gap: 4,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: 8,
    padding: 20,
  },
  heroMetaPrimary: {
    color: colors.text,
    fontFamily: typography.headingFontFamily,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  heroMetaSecondary: {
    color: colors.textMuted,
    fontFamily: typography.bodyFontFamily,
    fontSize: 14,
    lineHeight: 21,
  },
  hiddenShareCapture: {
    opacity: 0.01,
    pointerEvents: 'none',
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: -1,
  },
  heroEyebrow: {
    color: colors.primary,
    fontFamily: typography.accentFontFamily,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    padding: 20,
  },
  ingredientRiskBadge: {
    alignItems: 'center',
    borderRadius: 999,
    justifyContent: 'center',
    minWidth: 76,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  ingredientRiskBadgeText: {
    color: colors.surface,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  ingredientRow: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    width: '100%',
  },
  ingredientRowText: {
    fontSize: 14,
    lineHeight: 20,
  },
  ingredientRowTextBlock: {
    flex: 1,
  },
  ingredientWrap: {
    gap: 10,
  },
  label: {
    color: colors.textMuted,
    fontFamily: typography.accentFontFamily,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  loadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  messageGroup: {
    backgroundColor: colors.background,
    borderRadius: 18,
    gap: 8,
    padding: 14,
  },
  metaText: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 24,
  },
  metricChip: {
    backgroundColor: colors.background,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
    minWidth: 132,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  metricWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  profileChip: {
    backgroundColor: colors.primaryMuted,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  profileChipText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  profileLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  profileRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  productImage: {
    alignSelf: 'center',
    backgroundColor: colors.background,
    borderRadius: 16,
    height: 180,
    width: '100%',
  },
  progressFill: {
    borderRadius: 999,
    height: '100%',
  },
  progressTrack: {
    backgroundColor: colors.border,
    borderRadius: 999,
    height: 12,
    overflow: 'hidden',
    width: '100%',
  },
  retryButtonWrapper: {
    marginTop: 6,
    maxWidth: 220,
    width: '100%',
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  scoreHeroBadge: {
    alignItems: 'center',
    borderRadius: 28,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 148,
    minWidth: 148,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  scoreHeroCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 28,
    borderWidth: 1,
    gap: 16,
    padding: 22,
  },
  scoreHeroGrade: {
    fontFamily: typography.accentFontFamily,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  scoreHeroMainRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 18,
  },
  scoreHeroProductName: {
    color: colors.text,
    fontFamily: typography.displayFontFamily,
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 36,
  },
  scoreHeroSubtext: {
    color: colors.textMuted,
    fontFamily: typography.bodyFontFamily,
    fontSize: 15,
    lineHeight: 22,
  },
  scoreHeroSuffix: {
    fontFamily: typography.numericFontFamily,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  scoreHeroSummary: {
    color: colors.textMuted,
    fontFamily: typography.bodyFontFamily,
    fontSize: 15,
    lineHeight: 22,
  },
  scoreHeroTextBlock: {
    flex: 1,
    gap: 6,
  },
  scoreHeroTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scoreHeroValue: {
    fontFamily: typography.numericFontFamily,
    fontSize: 44,
    fontWeight: '800',
    lineHeight: 48,
  },
  scoreHeroVerdict: {
    color: colors.text,
    fontFamily: typography.headingFontFamily,
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
  },
  safeText: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
  },
  floatingShareButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 999,
    bottom: 24,
    justifyContent: 'center',
    height: 58,
    position: 'absolute',
    right: 20,
    shadowColor: '#0F1615',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    width: 58,
    elevation: 6,
  },
  floatingShareButtonDisabled: {
    backgroundColor: colors.textMuted,
  },
  floatingShareButtonPressed: {
    opacity: 0.92,
  },
  scoreBadge: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 999,
    justifyContent: 'center',
    minHeight: 64,
    minWidth: 110,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  scoreLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scoreLegendText: {
    fontFamily: typography.accentFontFamily,
    fontSize: 12,
    fontWeight: '700',
  },
  scoreRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scoreText: {
    fontSize: 18,
    fontWeight: '800',
  },
  sourceDot: {
    borderRadius: 999,
    height: 10,
    marginTop: 6,
    width: 10,
  },
  sourceRow: {
    flexDirection: 'row',
    gap: 12,
  },
  sourceTextBlock: {
    flex: 1,
    gap: 2,
  },
  sourceTitle: {
    color: colors.text,
    fontFamily: typography.headingFontFamily,
    fontSize: 15,
    fontWeight: '700',
  },
  statusText: {
    color: colors.textMuted,
    fontFamily: typography.bodyFontFamily,
    fontSize: 14,
    lineHeight: 21,
  },
  tagChip: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tagText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  value: {
    color: colors.text,
    fontFamily: typography.headingFontFamily,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
  },
  highRiskText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
  },
  trustBlock: {
    backgroundColor: colors.background,
    borderRadius: 20,
    gap: 6,
    padding: 16,
  },
  trustLabel: {
    color: colors.primary,
    fontFamily: typography.accentFontFamily,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  trustText: {
    color: colors.text,
    fontFamily: typography.bodyFontFamily,
    fontSize: 14,
    lineHeight: 21,
  },
  });
