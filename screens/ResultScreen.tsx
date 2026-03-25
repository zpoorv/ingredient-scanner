import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Sharing from 'expo-sharing';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Image,
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

import IngredientExplanationModal from '../components/IngredientExplanationModal';
import ProductSuggestionsCard from '../components/ProductSuggestionsCard';
import ShareResultCard from '../components/ShareResultCard';
import { colors } from '../constants/colors';
import {
  DEFAULT_DIET_PROFILE_ID,
  type DietProfileId,
} from '../constants/dietProfiles';
import type { RootStackParamList } from '../navigation/types';
import {
  type ProductSourceInfo,
} from '../services/productLookup';
import { loadDietProfile } from '../services/dietProfileStorage';
import { saveScanToHistory } from '../services/scanHistoryStorage';
import { getGradeTone } from '../utils/gradeTone';
import {
  explainIngredient,
  type IngredientExplanationLookup,
} from '../utils/ingredientExplanations';
import {
  highlightIngredients,
  type HighlightedIngredient,
} from '../utils/ingredientHighlighting';
import { formatProductName } from '../utils/productDisplay';
import { analyzeProduct, type ProductMetric } from '../utils/productInsights';
import { getAlternativeProductSuggestions } from '../utils/productSuggestions';
import { isLikelyFoodProduct } from '../utils/productType';
import {
  buildShareableResultCaption,
  buildShareableResultData,
} from '../utils/shareableResult';

type ResultScreenProps = NativeStackScreenProps<RootStackParamList, 'Result'>;

function getToneColor(tone: 'good' | 'neutral' | 'warning') {
  if (tone === 'good') {
    return colors.success;
  }

  if (tone === 'warning') {
    return colors.warning;
  }

  return colors.textMuted;
}

function getIngredientToneColor(risk: HighlightedIngredient['risk']) {
  switch (risk) {
    case 'high-risk':
      return colors.danger;
    case 'caution':
      return colors.warning;
    default:
      return colors.success;
  }
}

function getIngredientToneBackground(risk: HighlightedIngredient['risk']) {
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

function getSourceTone(status: ProductSourceInfo['status']) {
  switch (status) {
    case 'used':
      return colors.success;
    case 'missed':
      return colors.warning;
    default:
      return colors.textMuted;
  }
}

function getOffScoreTone(grade?: string | null) {
  return getGradeTone(grade);
}

function getHealthScoreTheme(score: number | null) {
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

export default function ResultScreen({ navigation, route }: ResultScreenProps) {
  const {
    barcode,
    barcodeType,
    persistToHistory,
    product,
    resultSource = 'barcode',
  } = route.params;
  const shareCardRef = useRef<ViewShot | null>(null);
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [isSharing, setIsSharing] = useState(false);
  const [isShareCardImageReady, setIsShareCardImageReady] = useState(false);
  const [hasResolvedProfile, setHasResolvedProfile] = useState(
    Boolean(route.params.profileId)
  );
  const [selectedProfileId, setSelectedProfileId] = useState<DietProfileId>(
    route.params.profileId || DEFAULT_DIET_PROFILE_ID
  );
  const [selectedIngredient, setSelectedIngredient] =
    useState<HighlightedIngredient | null>(null);
  const displayProductName = formatProductName(product?.name);
  const isFoodProduct = isLikelyFoodProduct(product);

  const barcodeFormatLabel = barcodeType
    ? barcodeType.replace(/_/g, ' ').toUpperCase()
    : null;
  const heroEyebrow =
    resultSource === 'ingredient-ocr' ? 'Ingredient Label OCR' : 'Scanned Barcode';
  const heroPrimaryText =
    resultSource === 'ingredient-ocr' ? 'Ingredient text extracted' : barcode;
  const heroBodyText =
    resultSource === 'ingredient-ocr'
      ? 'This result comes from OCR text extracted from a photographed ingredient label, then analyzed with the same ingredient scoring pipeline.'
      : 'Product data was fetched before this screen opened, so you can review the result immediately.';
  const highlightedIngredients = highlightIngredients(product?.ingredientsText);
  const explainedIngredients = highlightedIngredients.map((ingredient) => {
    const explanationLookup = explainIngredient(ingredient.ingredient);

    return {
      ...ingredient,
      explanationLookup,
      displayName: explanationLookup.explanation?.name || ingredient.ingredient,
    };
  });
  const highRiskIngredients = Array.from(
    new Set(
      highlightedIngredients
        .filter((ingredient) => ingredient.risk === 'high-risk')
        .map((ingredient) => ingredient.match?.label)
        .filter(Boolean)
    )
  );
  const cautionIngredients = Array.from(
    new Set(
      highlightedIngredients
        .filter((ingredient) => ingredient.risk === 'caution')
        .map((ingredient) => ingredient.match?.label)
        .filter(Boolean)
    )
  );
  const insights = product ? analyzeProduct(product, selectedProfileId) : null;
  const alternativeSuggestions = getAlternativeProductSuggestions(
    product,
    selectedProfileId
  );
  const healthScoreTheme = getHealthScoreTheme(insights?.smartScore ?? null);
  const gradeTone = getGradeTone(insights?.gradeLabel);
  const selectedIngredientExplanation: IngredientExplanationLookup | null =
    selectedIngredient ? explainIngredient(selectedIngredient.ingredient) : null;
  const shareableResult = buildShareableResultData(product, selectedProfileId);
  const shareCardWidth = Math.min(windowWidth - 64, 360);

  useEffect(() => {
    setIsShareCardImageReady(!shareableResult?.imageUrl);
  }, [shareableResult?.imageUrl]);

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
      const savedProfileId = await loadDietProfile();

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

  const handleShareResult = async () => {
    if (!shareCardRef.current || !shareableResult || isSharing) {
      return;
    }

    setIsSharing(true);

    try {
      if (shareableResult.imageUrl && !isShareCardImageReady) {
        await Image.prefetch(shareableResult.imageUrl);
        await new Promise((resolve) => setTimeout(resolve, 250));
      }

      const imageUri = await shareCardRef.current.capture?.();
      const shareMessage = buildShareableResultCaption(shareableResult);

      if (imageUri && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(imageUri, {
          dialogTitle: `Share ${shareableResult.productName}`,
          mimeType: 'image/png',
        });

        return;
      }

      await Share.share({
        message: shareMessage,
        title: shareableResult.productName,
      });
    } catch (error) {
      if (__DEV__) {
        console.warn('Failed to share result card', error);
      }
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {shareableResult ? (
          <View style={styles.hiddenShareCapture}>
            <ViewShot
              options={{ fileName: `scan-result-${barcode}`, format: 'png', quality: 1 }}
              ref={shareCardRef}
              style={{ width: shareCardWidth }}
            >
              <ShareResultCard
                data={shareableResult}
                onImageLoadEnd={() => setIsShareCardImageReady(true)}
              />
            </ViewShot>
          </View>
        ) : null}

        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>{heroEyebrow}</Text>
          <Text style={styles.barcodeText}>{heroPrimaryText}</Text>
          {resultSource === 'barcode' && barcodeFormatLabel ? (
            <Text style={styles.statusText}>Format: {barcodeFormatLabel}</Text>
          ) : null}
          <Text style={styles.statusText}>{heroBodyText}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.label}>Health Score</Text>
          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>Scoring Mode</Text>
            <View style={styles.profileChip}>
              <Text style={styles.profileChipText}>
                {insights?.profileLabel || 'General'}
              </Text>
            </View>
          </View>
          {insights?.profileSummary ? (
            <Text style={styles.statusText}>{insights.profileSummary}</Text>
          ) : null}

          {insights && isFoodProduct ? (
            <>
              <View
                style={[
                  styles.healthScorePanel,
                  { backgroundColor: healthScoreTheme.background },
                ]}
              >
                <View
                  style={[
                    styles.scoreBadge,
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
                      styles.scoreText,
                      {
                        color:
                          insights.smartScore === null
                            ? colors.text
                            : colors.surface,
                      },
                    ]}
                  >
                    {insights.smartScore === null
                      ? 'N/A'
                      : `${insights.smartScore}/100`}
                  </Text>
                </View>
                <View style={styles.healthScoreText}>
                  <Text
                    style={[
                      styles.healthScoreLabel,
                      { color: gradeTone.color },
                    ]}
                  >
                    {`Grade ${insights.gradeLabel} • ${healthScoreTheme.label}`}
                  </Text>
                  <Text style={styles.value}>{insights.verdict}</Text>
                  <Text style={styles.statusText}>{insights.summary}</Text>
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

              {insights.highlights.length > 0 ? (
                <View style={styles.messageGroup}>
                  {insights.highlights.slice(0, 3).map((highlight) => (
                    <Text key={highlight} style={styles.goodText}>
                      • {highlight}
                    </Text>
                  ))}
                </View>
              ) : null}

              {insights.cautions.length > 0 ? (
                <View style={styles.messageGroup}>
                  {insights.cautions.slice(0, 3).map((caution) => (
                    <Text key={caution} style={styles.cautionText}>
                      • {caution}
                    </Text>
                  ))}
                </View>
              ) : null}
            </>
          ) : (
            <Text style={styles.statusText}>
              Health scoring is only shown for edible food and drink products.
            </Text>
          )}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.label}>Product Overview</Text>

          {product?.imageUrl ? (
            <Image
              source={{ uri: product.imageUrl }}
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
              <Text style={styles.statusText}>Catalog code: {product.code}</Text>
              {product.categories.length > 0 ? (
                <View style={styles.tagWrap}>
                  {product.categories.slice(0, 4).map((category) => (
                    <View key={category} style={styles.tagChip}>
                      <Text style={styles.tagText}>{category}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              {product.labels.length > 0 ? (
                <Text style={styles.statusText}>
                  Labels: {product.labels.slice(0, 4).join(', ')}
                </Text>
              ) : null}
            </>
          ) : (
            <Text style={styles.statusText}>
              Product overview will update after a successful lookup.
            </Text>
          )}
        </View>

        <ProductSuggestionsCard suggestions={alternativeSuggestions} />

        <View style={styles.infoCard}>
          <Text style={styles.label}>Ingredients</Text>
          {explainedIngredients.length > 0 ? (
            <>
              <View style={styles.ingredientWrap}>
                {explainedIngredients.map((ingredient) => (
                  <Pressable
                    key={ingredient.id}
                    accessibilityHint="Shows a short explanation for this ingredient"
                    accessibilityRole="button"
                    onPress={() => setSelectedIngredient(ingredient)}
                    style={[
                      styles.ingredientRow,
                      {
                        backgroundColor: getIngredientToneBackground(ingredient.risk),
                        borderColor: getIngredientToneColor(ingredient.risk),
                      },
                    ]}
                  >
                    <View style={styles.ingredientRowTextBlock}>
                      <Text
                        style={[
                          styles.ingredientRowText,
                          {
                            color: getIngredientToneColor(ingredient.risk),
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
                          backgroundColor: getIngredientToneColor(ingredient.risk),
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
                Tap an ingredient to see a short explanation.
              </Text>
            </>
          ) : (
            <Text style={styles.statusText}>
              Ingredient details will appear when source data is available.
            </Text>
          )}

          {highRiskIngredients.length > 0 ? (
            <Text style={styles.highRiskText}>
              High-risk: {highRiskIngredients.join(', ')}
            </Text>
          ) : null}

          {cautionIngredients.length > 0 ? (
            <Text style={styles.cautionText}>
              Caution: {cautionIngredients.join(', ')}
            </Text>
          ) : product?.ingredientsText ? (
            <Text style={styles.safeText}>
              Current rule set marks the listed ingredients as safe.
            </Text>
          ) : (
            <Text style={styles.statusText}>
              Ingredient risk highlighting will appear when source data provides an ingredient list.
            </Text>
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
          {insights?.metrics.length ? (
            <View style={styles.metricWrap}>
              {insights.metrics.map((metric) => (
                <MetricChip key={metric.label} metric={metric} />
              ))}
            </View>
          ) : (
            <Text style={styles.statusText}>
              Nutrition metrics will appear when the data source provides them.
            </Text>
          )}

          {insights?.processingLabel ? (
            <Text style={styles.statusText}>
              Processing: {insights.processingLabel}
            </Text>
          ) : null}

          {product?.nutriScore ? (
            <View style={styles.scoreRow}>
              <Text style={styles.statusText}>Open Food Facts score</Text>
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

        <View style={styles.infoCard}>
          <Text style={styles.label}>Data Sources</Text>
          {product?.sources?.length ? (
            product.sources.map((source) => (
              <View key={source.id} style={styles.sourceRow}>
                <View
                  style={[
                    styles.sourceDot,
                    { backgroundColor: getSourceTone(source.status) },
                  ]}
                />
                <View style={styles.sourceTextBlock}>
                  <Text style={styles.sourceTitle}>{source.label}</Text>
                  <Text style={styles.statusText}>{source.note}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.statusText}>
              Source details will appear after a successful lookup.
            </Text>
          )}
        </View>
      </ScrollView>
      {shareableResult ? (
        <Pressable
          accessibilityLabel="Share result card"
          accessibilityRole="button"
          disabled={isSharing}
          onPress={handleShareResult}
          style={({ pressed }) => [
            styles.floatingShareButton,
            { bottom: Math.max(insets.bottom + 20, 36) },
            isSharing && styles.floatingShareButtonDisabled,
            pressed && !isSharing && styles.floatingShareButtonPressed,
          ]}
        >
          <Ionicons
            color={colors.surface}
            name={isSharing ? 'hourglass-outline' : 'share-social-outline'}
            size={24}
          />
        </Pressable>
      ) : null}
      <IngredientExplanationModal
        lookup={selectedIngredientExplanation}
        onClose={() => setSelectedIngredient(null)}
        visible={selectedIngredient !== null}
      />
    </SafeAreaView>
  );
}

function MetricChip({ metric }: { metric: ProductMetric }) {
  return (
    <View
      style={[
        styles.metricChip,
        { borderColor: getToneColor(metric.tone) },
      ]}
    >
      <Text style={styles.metricLabel}>{metric.label}</Text>
      <Text style={[styles.metricValue, { color: getToneColor(metric.tone) }]}>
        {metric.value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
  cautionText: {
    color: colors.warning,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
  },
  contentContainer: {
    gap: 16,
    padding: 24,
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
    backgroundColor: colors.primaryMuted,
    borderRadius: 24,
    gap: 10,
    padding: 24,
  },
  hiddenShareCapture: {
    left: -9999,
    opacity: 0,
    position: 'absolute',
    top: -9999,
  },
  heroEyebrow: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
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
    gap: 6,
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
    paddingVertical: 7,
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
    height: 10,
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
    fontSize: 15,
    fontWeight: '700',
  },
  statusText: {
    color: colors.textMuted,
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
});
