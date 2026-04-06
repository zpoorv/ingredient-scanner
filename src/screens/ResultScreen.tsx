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
import EnvironmentalImpactCard from '../components/EnvironmentalImpactCard';
import HouseholdFitCard from '../components/HouseholdFitCard';
import IngredientExplanationModal from '../components/IngredientExplanationModal';
import MicroCelebrationBanner from '../components/MicroCelebrationBanner';
import PremiumGuidanceCard from '../components/PremiumGuidanceCard';
import ProductTimelineCard from '../components/ProductTimelineCard';
import ProductRestrictionCard from '../components/ProductRestrictionCard';
import ProductSuggestionsCard from '../components/ProductSuggestionsCard';
import ReportProductIssueModal from '../components/ReportProductIssueModal';
import ResultCardSkeleton from '../components/ResultCardSkeleton';
import ResultTrustCard from '../components/ResultTrustCard';
import ShareCardPickerModal from '../components/ShareCardPickerModal';
import ShareResultCard from '../components/ShareResultCard';
import type { AppColors } from '../constants/theme';
import {
  DEFAULT_DIET_PROFILE_ID,
  type DietProfileId,
} from '../constants/dietProfiles';
import type { PremiumEntitlement } from '../models/premium';
import type { RestrictionId, RestrictionSeverity } from '../models/restrictions';
import type { ShareCardStyleId } from '../models/shareCardStyle';
import type { RootStackParamList } from '../navigation/types';
import type { ScanResultSource } from '../types/scanner';
import { loadAdminAppConfig } from '../services/adminAppConfigService';
import { upsertComparisonSessionEntry } from '../services/comparisonSessionStorage';
import {
  buildCorrectionReportSummary,
  submitCorrectionReport,
  submitTrustConfirmation,
} from '../services/correctionReportService';
import {
  loadSavedProductCollections,
  toggleComparisonProductCode,
  toggleFavoriteProductCode,
} from '../services/favoriteProductsService';
import {
  consumeFeatureQuota,
  loadFeatureQuotaSnapshot,
  type FeatureQuotaSnapshot,
} from '../services/featureUsageStorage';
import type { GamificationCelebration } from '../models/gamification';
import {
  recordGamificationForSavedScan,
  recordGamificationTrustHelper,
} from '../services/gamificationService';
import {
  hasPremiumFeatureAccess,
} from '../services/premiumEntitlementService';
import { saveScanToHistory } from '../services/scanHistoryStorage';
import {
  loadSessionEffectiveShoppingProfile,
  loadSessionPremiumEntitlement,
  loadSessionScanHistory,
  loadSessionUserProfile,
} from '../services/sessionDataService';
import {
  saveShareCardStyleId,
  syncShareCardStyleForCurrentUser,
} from '../services/shareCardPreferenceStorage';
import {
  loadProductTrustConfirmation,
  recordProductTrustConfirmation,
  type ProductTrustConfirmation,
} from '../services/productTrustConfirmationStorage';
import {
  loadCommonProductByBarcode,
} from '../services/commonProductStorage';
import {
  subscribeScanHistoryChanges,
  type ScanHistoryEntry,
} from '../services/scanHistoryStorage';
import { getPremiumSession, subscribePremiumSession } from '../store';
import {
  markPerformanceTrace,
  measurePerformanceTrace,
} from '../services/performanceTrace';
import { getRestrictionDefinition } from '../constants/restrictions';
import {
  SHARE_CARD_STYLE_DEFINITIONS,
} from '../constants/shareCardStyles';
import type { HouseholdFitResult } from '../models/householdFit';
import { getGradeTone } from '../utils/gradeTone';
import {
  type IngredientExplanationLookup,
} from '../utils/ingredientExplanations';
import {
  type HighlightedIngredient,
} from '../utils/ingredientHighlighting';
import { formatProductName } from '../utils/productDisplay';
import type { ProductMetric } from '../utils/productInsights';
import {
  type DecisionVerdict,
  buildResultAnalysis,
  type ExplainedIngredient,
  type ResultConfidence,
  type ResultAnalysis,
} from '../utils/resultAnalysis';
import { buildHouseholdFitResult } from '../utils/householdFit';
import { assessProductRestrictions } from '../utils/restrictionMatching';
import { buildShareableResultCaption } from '../utils/shareableResult';
import { buildEnvironmentalImpactInsight } from '../utils/environmentalImpact';
import type { UserProfile } from '../models/userProfile';

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
    };
  }

  return {
    body: 'Product loaded.',
  };
}

function getQuickUseGuidance(
  verdict: DecisionVerdict | null,
  score: number | null,
  foodStatus: ResultAnalysis['foodStatus'] | null,
  confidence: ResultConfidence | null
) {
  if (verdict === 'good-regular-pick') {
    return 'Good regular pick';
  }

  if (verdict === 'okay-occasionally') {
    return 'Okay occasionally';
  }

  if (verdict === 'not-ideal-often') {
    return 'Not ideal often';
  }

  if (verdict === 'need-better-data') {
    return 'Need better data';
  }

  if (foodStatus === 'non-food') {
    return 'Not scored as food';
  }

  if (foodStatus === 'unclear') {
    return 'Needs a closer look';
  }

  if (confidence === 'low') {
    return 'Use as a rough guide';
  }

  if (score === null) {
    return 'Needs more detail';
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

function getConfidenceTone(colors: AppColors, confidence: ResultConfidence | null) {
  if (confidence === 'high') {
    return colors.success;
  }

  if (confidence === 'medium') {
    return colors.warning;
  }

  return colors.danger;
}

function getConfidenceBackground(colors: AppColors, confidence: ResultConfidence | null) {
  if (confidence === 'high') {
    return colors.successMuted;
  }

  if (confidence === 'medium') {
    return colors.warningMuted;
  }

  return colors.dangerMuted;
}

function getConfidenceLabel(confidence: ResultConfidence | null) {
  if (confidence === 'high') {
    return 'High confidence';
  }

  if (confidence === 'medium') {
    return 'Partial data';
  }

  return 'Needs review';
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
  const [favoriteProductCodes, setFavoriteProductCodes] = useState<string[]>([]);
  const [comparisonProductCodes, setComparisonProductCodes] = useState<string[]>([]);
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);
  const [shareCardStyleId, setShareCardStyleId] =
    useState<ShareCardStyleId>('classic');
  const [draftShareCardStyleId, setDraftShareCardStyleId] =
    useState<ShareCardStyleId>('classic');
  const [captureShareCardStyleId, setCaptureShareCardStyleId] =
    useState<ShareCardStyleId>('classic');
  const [shareQuotaSnapshot, setShareQuotaSnapshot] =
    useState<FeatureQuotaSnapshot | null>(null);
  const [activeRestrictionIds, setActiveRestrictionIds] = useState<RestrictionId[]>([]);
  const [restrictionSeverity, setRestrictionSeverity] =
    useState<RestrictionSeverity>('strict');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [historyEntry, setHistoryEntry] = useState<ScanHistoryEntry | null>(null);
  const [trustConfirmation, setTrustConfirmation] =
    useState<ProductTrustConfirmation | null>(null);
  const [isSubmittingTrustConfirmation, setIsSubmittingTrustConfirmation] =
    useState(false);
  const [isSecondaryStageReady, setIsSecondaryStageReady] = useState(false);
  const [gamificationCelebration, setGamificationCelebration] =
    useState<GamificationCelebration | null>(null);
  const displayProductName = useMemo(
    () => formatProductName(product?.name),
    [product?.name]
  );
  const scanCompletionCopy = getScanCompletionCopy(resultSource);
  const insights = analysisResult?.insights ?? null;
  const confidence = analysisResult?.confidence ?? null;
  const confidenceReason = analysisResult?.confidenceReason ?? null;
  const decisionSummary = analysisResult?.decisionSummary ?? null;
  const decisionVerdict = analysisResult?.decisionVerdict ?? null;
  const foodStatus = analysisResult?.foodStatus ?? null;
  const ingredientAnalysis = analysisResult?.ingredientAnalysis ?? null;
  const topConcern = analysisResult?.topConcern ?? null;
  const trustSnapshot = analysisResult?.trustSnapshot ?? null;
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
  const premiumGuidance = analysisResult?.premiumGuidance ?? null;
  const shareCardWidth = useMemo(
    () => Math.min(windowWidth - 64, 360),
    [windowWidth]
  );
  const environmentalInsight = useMemo(
    () => buildEnvironmentalImpactInsight(product),
    [product]
  );
  const productIdentifier = product.code || barcode;
  const timelinePreview = useMemo(
    () => historyEntry?.productTimeline.slice(0, 2) ?? [],
    [historyEntry?.productTimeline]
  );
  const selectedRestrictionLabels = useMemo(
    () =>
      activeRestrictionIds
        .map((restrictionId) => getRestrictionDefinition(restrictionId)?.label ?? null)
        .filter((label): label is string => Boolean(label)),
    [activeRestrictionIds]
  );
  const restrictionAssessment = useMemo(
    () => assessProductRestrictions(product, activeRestrictionIds, restrictionSeverity),
    [activeRestrictionIds, product, restrictionSeverity]
  );
  const restrictionSummary = useMemo(() => {
    if (activeRestrictionIds.length === 0) {
      return null;
    }

    if (restrictionAssessment.summary) {
      return restrictionAssessment.summary;
    }

    if (selectedRestrictionLabels.length === 0) {
      return 'No strong matches found for your selected filters.';
    }

    return `No strong matches found for ${selectedRestrictionLabels.join(', ')}.`;
  }, [activeRestrictionIds.length, restrictionAssessment.summary, selectedRestrictionLabels]);
  const householdFit = useMemo<HouseholdFitResult | null>(
    () =>
      hasResolvedProfile
        ? buildHouseholdFitResult(product, userProfile, selectedProfileId)
        : null,
    [hasResolvedProfile, product, selectedProfileId, userProfile]
  );
  const isFavorite = favoriteProductCodes.includes(productIdentifier);
  const isSavedForCompare = comparisonProductCodes.includes(productIdentifier);
  const canShowPremiumGuidance = hasPremiumFeatureAccess(
    'deeper-result-guidance',
    premiumEntitlement
  );
  const canShowAdvancedOcrRecovery = hasPremiumFeatureAccess(
    'advanced-ocr-recovery',
    premiumEntitlement
  );
  const canUseSavedProducts = hasPremiumFeatureAccess(
    'favorites-and-comparisons',
    premiumEntitlement
  );
  const renderedPremiumGuidance =
    canShowPremiumGuidance && premiumGuidance
      ? {
          ...premiumGuidance,
          confidenceAssist: canShowAdvancedOcrRecovery
            ? premiumGuidance.confidenceAssist
            : null,
        }
      : null;
  const quickUseGuidance = useMemo(
    () =>
      getQuickUseGuidance(
        decisionVerdict,
        insights?.smartScore ?? null,
        foodStatus,
        confidence
      ),
    [confidence, decisionVerdict, foodStatus, insights?.smartScore]
  );
  const disclaimerText =
    adminConfig?.resultDisclaimer ||
    'Quick guide only.';
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
    markPerformanceTrace('result-open', { barcode });
    setIsSecondaryStageReady(false);

    const interactionHandle = InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => {
        setIsSecondaryStageReady(true);
      });
    });

    return () => {
      interactionHandle.cancel();
    };
  }, [barcode]);

  useEffect(() => {
    if (route.params.profileId) {
      setSelectedProfileId(route.params.profileId);
      setHasResolvedProfile(true);
      return;
    }

    let isMounted = true;

    const restoreProfile = async () => {
      const effectiveProfile = await loadSessionEffectiveShoppingProfile('cache-first');

      if (isMounted) {
        setSelectedProfileId(effectiveProfile.dietProfileId);
        setHasResolvedProfile(true);
      }
    };

    void restoreProfile();

    return () => {
      isMounted = false;
    };
  }, [route.params.profileId]);

  useEffect(() => {
    if (!isSecondaryStageReady) {
      return;
    }

    let isMounted = true;

    const restoreRestrictions = async () => {
      const [profile, effectiveProfile] = await Promise.all([
        loadSessionUserProfile('stale-while-revalidate'),
        loadSessionEffectiveShoppingProfile('stale-while-revalidate'),
      ]);

      if (!isMounted) {
        return;
      }

      setUserProfile(profile);
      setActiveRestrictionIds(effectiveProfile.restrictionIds ?? profile?.restrictionIds ?? []);
      setRestrictionSeverity(
        effectiveProfile.restrictionSeverity ?? profile?.restrictionSeverity ?? 'strict'
      );
    };

    void restoreRestrictions();

    return () => {
      isMounted = false;
    };
  }, [isSecondaryStageReady]);

  useEffect(() => {
    if (!isSecondaryStageReady) {
      return;
    }

    let isMounted = true;

    const restoreHistoryContext = async () => {
      const [historyEntries, confirmation] = await Promise.all([
        loadSessionScanHistory('stale-while-revalidate'),
        loadProductTrustConfirmation(barcode),
      ]);
      const matchingHistoryEntry =
        historyEntries.find((entry) => entry.barcode === barcode || entry.id === barcode) ??
        null;

      if (!isMounted) {
        return;
      }

      setHistoryEntry(matchingHistoryEntry);
      setTrustConfirmation(confirmation);
    };

    const unsubscribe = subscribeScanHistoryChanges(() => {
      void restoreHistoryContext();
    });

    void restoreHistoryContext();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [barcode, isSecondaryStageReady]);

  useEffect(() => {
    if (!isSecondaryStageReady) {
      return;
    }

    let isMounted = true;

    const restoreShareAccess = async () => {
      const entitlement = await loadSessionPremiumEntitlement('stale-while-revalidate');
      const [quotaSnapshot, syncedShareCardStyleId, savedCollections] = await Promise.all([
        loadFeatureQuotaSnapshot('share-result-card', entitlement),
        syncShareCardStyleForCurrentUser(),
        loadSavedProductCollections(),
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
      setFavoriteProductCodes(savedCollections.favoriteProductCodes);
      setComparisonProductCodes(savedCollections.comparisonProductCodes);
    };

    const unsubscribe = subscribePremiumSession((entitlement) => {
      setPremiumEntitlement(entitlement);
      if (!isMounted) {
        return;
      }

      if (!entitlement.isPremium) {
        setShareCardStyleId('classic');
        setDraftShareCardStyleId('classic');
        setFavoriteProductCodes([]);
        setComparisonProductCodes([]);
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
  }, [isSecondaryStageReady]);

  const handleToggleFavorite = async () => {
    if (!canUseSavedProducts) {
      navigation.navigate('Premium', { featureId: 'favorites-and-comparisons' });
      return;
    }

    const nextCodes = await toggleFavoriteProductCode(productIdentifier);
    setFavoriteProductCodes(nextCodes);
  };

  const handleToggleCompare = async () => {
    if (!canUseSavedProducts) {
      navigation.navigate('Premium', { featureId: 'favorites-and-comparisons' });
      return;
    }

    const nextCodes = await toggleComparisonProductCode(productIdentifier);
    setComparisonProductCodes(nextCodes);
  };

  useEffect(() => {
    if (!isSecondaryStageReady) {
      return;
    }

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
      });
    };

    void restoreAdminConfig();

    return () => {
      isMounted = false;
    };
  }, [isSecondaryStageReady]);

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
    if (!analysisResult) {
      return;
    }

    measurePerformanceTrace('result-open', 'result-analysis-complete', {
      barcode,
    });
  }, [analysisResult, barcode]);

  useEffect(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  useEffect(() => {
    if (!gamificationCelebration) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setGamificationCelebration(null);
    }, 4200);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [gamificationCelebration]);

  useEffect(() => {
    if (persistToHistory === false || !hasResolvedProfile) {
      return;
    }

    let isMounted = true;
    const interactionHandle = InteractionManager.runAfterInteractions(() => {
      void (async () => {
        try {
          const nextEntry = await saveScanToHistory({
            barcode,
            barcodeType,
            profileId: selectedProfileId,
            product,
          });
          const gamificationResult = await recordGamificationForSavedScan({
            householdFitVerdict: householdFit?.verdict ?? null,
            newEntry: nextEntry,
          });

          if (isMounted) {
            setHistoryEntry(nextEntry);
            setGamificationCelebration(gamificationResult.celebration);
          }
        } catch (error) {
          if (__DEV__ && isMounted) {
            console.warn('Failed to save scan history entry', error);
          }
        }
      })();
    });

    return () => {
      isMounted = false;
      interactionHandle.cancel();
    };
  }, [
    barcode,
    barcodeType,
    hasResolvedProfile,
    householdFit?.verdict,
    persistToHistory,
    product,
    selectedProfileId,
  ]);

  useEffect(() => {
    if (!analysisResult) {
      return;
    }

    const syncTripContext = async () => {
      const commonProduct = await loadCommonProductByBarcode(barcode);
      const repeatBuyWeight = Math.max(
        historyEntry?.scanCount ?? 0,
        commonProduct?.usageCount ?? 0
      );
      const latestTimelineEntry = historyEntry?.productTimeline[0] ?? null;
      const isChangedProduct = Boolean(latestTimelineEntry);
      const tripDecision =
        isChangedProduct
          ? 'changed-product'
          : repeatBuyWeight >= 3
            ? 'usual-buy'
            : analysisResult.decisionVerdict === 'good-regular-pick' &&
                householdFit?.verdict !== 'doesnt-fit-this-household'
              ? 'buy'
              : analysisResult.decisionVerdict === 'not-ideal-often' ||
                  analysisResult.foodStatus === 'non-food' ||
                  analysisResult.foodStatus === 'unclear'
                ? 'skip'
                : 'compare';

      await upsertComparisonSessionEntry({
        addedAt: new Date().toISOString(),
        barcode,
        categoryLabel: product.categories[0] ?? null,
        confidence: analysisResult.confidence,
        decisionSummary: analysisResult.decisionSummary,
        decisionVerdict: analysisResult.decisionVerdict,
        householdBlockingReason: householdFit?.blockingReason ?? null,
        householdFitVerdict: householdFit?.verdict ?? null,
        isChangedProduct,
        name: displayProductName,
        product,
        profileId: selectedProfileId,
        topConcern: analysisResult.topConcern,
        tripDecision,
      });
    };

    void syncTripContext();
  }, [
    analysisResult,
    barcode,
    displayProductName,
    historyEntry?.productTimeline,
    historyEntry?.scanCount,
    householdFit?.blockingReason,
    householdFit?.verdict,
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

  const handleOpenShelfMode = () => {
    navigation.navigate('ShelfMode');
  };

  const handleSubmitCorrectionReport = async (
    reason: Parameters<typeof buildCorrectionReportSummary>[0]
  ) => {
    if (!analysisResult) {
      return;
    }

    setIsReportModalVisible(false);

    try {
      await submitCorrectionReport({
        barcode,
        confirmationCount:
          (trustConfirmation?.differentCount ?? 0) + (trustConfirmation?.matchCount ?? 0),
        confidence: analysisResult.confidence,
        foodStatus: analysisResult.foodStatus,
        priorityScore:
          product.adminMetadata?.adminPriorityScore ??
          (analysisResult.confidence === 'low' ? 90 : 55),
        productName: displayProductName,
        reason,
        repeatBuyWeight: historyEntry?.scanCount ?? 0,
        resultSource,
        summary: buildCorrectionReportSummary(reason, analysisResult.topConcern),
        timelineSeverity: timelinePreview[0]?.severity ?? null,
        topConcern: analysisResult.topConcern,
      });
      Alert.alert('Review request sent', 'We queued this product for a manual trust check.');
    } catch {
      Alert.alert(
        'Could not send request',
        'Try again in a moment if this product still looks off.'
      );
    }
  };

  const handleTrustConfirmation = async (
    trustConfirmationType: 'looks-different' | 'matches-pack'
  ) => {
    if (!analysisResult || isSubmittingTrustConfirmation) {
      return;
    }

    setIsSubmittingTrustConfirmation(true);

    try {
      const nextConfirmation = await recordProductTrustConfirmation(
        barcode,
        trustConfirmationType
      );
      const confirmationCount =
        trustConfirmationType === 'looks-different'
          ? nextConfirmation.differentCount
          : nextConfirmation.matchCount;
      const gamificationResult = await recordGamificationTrustHelper({
        barcode,
        confirmationCount,
        trustConfirmationType,
      });

      setTrustConfirmation(nextConfirmation);
      setGamificationCelebration(gamificationResult.celebration);

      await submitTrustConfirmation({
        barcode,
        confirmationCount,
        confidence: analysisResult.confidence,
        foodStatus: analysisResult.foodStatus,
        productName: displayProductName,
        repeatBuyWeight: historyEntry?.scanCount ?? 0,
        resultSource,
        timelineSeverity: timelinePreview[0]?.severity ?? null,
        topConcern: analysisResult.topConcern,
        trustConfirmationType,
      });

      Alert.alert(
        'Thanks for the check',
        trustConfirmationType === 'looks-different'
          ? 'We flagged this product for a closer review.'
          : 'We saved your pack confirmation for future trust checks.'
      );
    } catch {
      Alert.alert(
        'Could not save that right now',
        'Try again in a moment if this pack still needs a review.'
      );
    } finally {
      setIsSubmittingTrustConfirmation(false);
    }
  };

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: Math.max(insets.bottom + 136, 160) },
        ]}
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

        <MicroCelebrationBanner celebration={gamificationCelebration} />

        <View style={styles.scoreHeroCard}>
          <View style={styles.scoreHeroHeaderRow}>
            {product?.imageUrl ? (
              <Image
                source={{ uri: product.imageUrl }}
                resizeMode="contain"
                style={styles.scoreHeroImage}
              />
            ) : null}
            <View style={styles.scoreHeroHeaderText}>
              <Text style={styles.scoreHeroProductName}>{displayProductName}</Text>
              <Text style={styles.scoreHeroSubtext}>
                {[product?.brand, product?.quantity].filter(Boolean).join(' • ') ||
                  scanCompletionCopy.body}
              </Text>
              <View style={styles.scoreHeroMetaRow}>
                {confidence ? (
                  <View
                    style={[
                      styles.confidencePill,
                      {
                        backgroundColor: getConfidenceBackground(colors, confidence),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.confidencePillText,
                        { color: getConfidenceTone(colors, confidence) },
                      ]}
                    >
                      {getConfidenceLabel(confidence)}
                    </Text>
                  </View>
                ) : null}
                {insights?.profileLabel ? (
                  <View style={styles.profileChip}>
                    <Text style={styles.profileChipText}>{insights.profileLabel}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          {!analysisResult ? (
            <ResultCardSkeleton />
          ) : insights && foodStatus !== 'non-food' && foodStatus !== 'unclear' ? (
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
                  <Text style={styles.scoreHeroSummary}>
                    {decisionSummary || insights.summary}
                  </Text>
                  {confidence && confidenceReason ? (
                    <Text
                      style={[
                        styles.scoreHeroConfidence,
                        { color: getConfidenceTone(colors, confidence) },
                      ]}
                    >
                      {confidenceReason}
                    </Text>
                  ) : null}
                  {topConcern ? (
                    <Text style={styles.topConcernText}>Main issue: {topConcern}</Text>
                  ) : null}
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

              {confidence === 'low' ? (
                <View style={styles.trustBlock}>
                  <Text style={styles.disclaimerText}>{disclaimerText}</Text>
                </View>
              ) : null}
            </>
          ) : (
            <View style={styles.trustBlock}>
              <Text style={styles.scoreHeroVerdict}>{quickUseGuidance}</Text>
              <Text style={styles.scoreHeroSummary}>
                {confidenceReason || insights?.summary || 'We need clearer product details before scoring this.'}
              </Text>
              <Text style={styles.disclaimerText}>{disclaimerText}</Text>
            </View>
          )}
        </View>

        {householdFit ? <HouseholdFitCard fit={householdFit} /> : null}

        <View style={styles.infoCard}>
          <Text style={styles.label}>Quick actions</Text>
          {product.adminMetadata?.reviewStatus &&
          product.adminMetadata.reviewStatus !== 'draft' ? (
            <View style={styles.reviewBadge}>
              <Text style={styles.reviewBadgeText}>
                {product.adminMetadata.reviewBadgeCopy ||
                  (product.adminMetadata.reviewStatus === 'reviewed'
                    ? 'Reviewed by Inqoura'
                    : 'Improved by Inqoura')}
              </Text>
            </View>
          ) : null}
          {product ? (
            <>
              {product.categories.length > 0 ? (
                <View style={styles.tagWrap}>
                  {product.categories.slice(0, 2).map((category) => (
                    <View key={category} style={styles.tagChip}>
                      <Text style={styles.tagText}>{category}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              <View style={styles.savedActionRow}>
                <Pressable onPress={handleOpenShelfMode} style={styles.savedActionChip}>
                  <Text style={styles.savedActionText}>Open Shelf Mode</Text>
                </Pressable>
                <Pressable
                  onPress={() => setIsReportModalVisible(true)}
                  style={styles.savedActionChip}
                >
                  <Text style={styles.savedActionText}>Report Wrong Info</Text>
                </Pressable>
              </View>
              <View style={styles.savedActionRow}>
                <Pressable
                  onPress={() => void handleToggleFavorite()}
                  style={[
                    styles.savedActionChip,
                    isFavorite && styles.savedActionChipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.savedActionText,
                      isFavorite && styles.savedActionTextSelected,
                    ]}
                  >
                    {isFavorite ? 'Saved Favorite' : 'Save Favorite'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => void handleToggleCompare()}
                  style={[
                    styles.savedActionChip,
                    isSavedForCompare && styles.savedActionChipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.savedActionText,
                      isSavedForCompare && styles.savedActionTextSelected,
                    ]}
                  >
                    {isSavedForCompare ? 'Saved For Compare' : 'Save For Compare'}
                  </Text>
                </Pressable>
              </View>
              {!canUseSavedProducts ? (
                <Text style={styles.statusText}>
                  Premium saves favorites and keeps two products ready to compare.
                </Text>
              ) : null}
            </>
          ) : (
            <Text style={styles.statusText}>No product details yet.</Text>
          )}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.label}>Trust check</Text>
          <Text style={styles.statusText}>
            {historyEntry?.scanCount && historyEntry.scanCount >= 2
              ? historyEntry.scanCount === 2
                ? 'You have scanned this before.'
                : `You have scanned this ${historyEntry.scanCount} times.`
              : 'Confirm whether this pack still matches what you are holding.'}
          </Text>
          {timelinePreview.length > 0 ? (
            <ProductTimelineCard entries={timelinePreview} title="Changed since last buy" />
          ) : (
            <Text style={styles.statusText}>No meaningful pack changes seen yet.</Text>
          )}
          <View style={styles.savedActionRow}>
            <Pressable
              disabled={isSubmittingTrustConfirmation}
              onPress={() => void handleTrustConfirmation('matches-pack')}
              style={styles.savedActionChip}
            >
              <Text style={styles.savedActionText}>Matches pack today</Text>
            </Pressable>
            <Pressable
              disabled={isSubmittingTrustConfirmation}
              onPress={() => void handleTrustConfirmation('looks-different')}
              style={styles.savedActionChip}
            >
              <Text style={styles.savedActionText}>Looks different today</Text>
            </Pressable>
          </View>
          {trustConfirmation ? (
            <Text style={styles.statusText}>
              {trustConfirmation.matchCount} match check
              {trustConfirmation.matchCount === 1 ? '' : 's'} •{' '}
              {trustConfirmation.differentCount} difference report
              {trustConfirmation.differentCount === 1 ? '' : 's'}
            </Text>
          ) : null}
        </View>

        {trustSnapshot && confidence === 'low' ? (
          <ResultTrustCard trust={trustSnapshot} />
        ) : null}

        {restrictionSummary ? (
          <ProductRestrictionCard
            matches={restrictionAssessment.matches}
            selectedLabels={selectedRestrictionLabels}
            summary={restrictionSummary}
            tone={restrictionAssessment.tone}
          />
        ) : null}

        {!analysisResult ? (
          <ResultCardSkeleton />
        ) : (
          <ProductSuggestionsCard suggestions={displayedSuggestions} />
        )}

        {renderedPremiumGuidance ? (
          <PremiumGuidanceCard guidance={renderedPremiumGuidance} />
        ) : null}

        <View style={styles.infoCard}>
          <Text style={styles.label}>What&apos;s inside</Text>
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
                Tap any ingredient to learn more.
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
          {product && product.additiveCount > 0 ? (
            <Text style={styles.statusText}>
              Additives listed: {product.additiveCount}
            </Text>
          ) : null}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.label}>Nutrition</Text>
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
              Processing level: {insights.processingLabel}
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

        {foodStatus === 'unclear' ? (
          <Text style={styles.statusText}>
            This item needs clearer ingredient or nutrition details before we score it fully.
          </Text>
        ) : null}
      </View>

      {environmentalInsight ? <EnvironmentalImpactCard insight={environmentalInsight} /> : null}

      </ScrollView>
      {shareableResult ? (
        <Pressable
          accessibilityLabel="Share result card"
          accessibilityRole="button"
          disabled={isSharing}
          onPress={handleOpenSharePicker}
          style={({ pressed }) => [
            styles.floatingShareButton,
            { bottom: Math.max(insets.bottom + 96, 112) },
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
        dietProfileId={selectedProfileId}
        lookup={selectedIngredientExplanation}
        onClose={() => setSelectedIngredient(null)}
        restrictionIds={activeRestrictionIds}
        visible={selectedIngredient !== null}
      />
      <ReportProductIssueModal
        onClose={() => setIsReportModalVisible(false)}
        onSelectReason={(reason) => void handleSubmitCorrectionReport(reason)}
        visible={isReportModalVisible}
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
  confidencePill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  confidencePillText: {
    fontFamily: typography.accentFontFamily,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
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
  scoreHeroHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
  },
  scoreHeroHeaderText: {
    flex: 1,
    gap: 8,
  },
  scoreHeroGrade: {
    fontFamily: typography.accentFontFamily,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  scoreHeroImage: {
    backgroundColor: colors.background,
    borderRadius: 20,
    height: 92,
    width: 92,
  },
  scoreHeroMainRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 18,
  },
  scoreHeroMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  scoreHeroProductName: {
    color: colors.text,
    fontFamily: typography.displayFontFamily,
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
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
  scoreHeroConfidence: {
    fontFamily: typography.accentFontFamily,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  reviewBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryMuted,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  reviewBadgeText: {
    color: colors.primary,
    fontFamily: typography.accentFontFamily,
    fontSize: 12,
    fontWeight: '800',
  },
  scoreHeroTextBlock: {
    flex: 1,
    gap: 8,
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
  topConcernText: {
    color: colors.warning,
    fontFamily: typography.bodyFontFamily,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
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
  savedActionChip: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  savedActionChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  savedActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  savedActionText: {
    color: colors.primary,
    fontFamily: typography.accentFontFamily,
    fontSize: 12,
    fontWeight: '700',
  },
  savedActionTextSelected: {
    color: colors.surface,
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
