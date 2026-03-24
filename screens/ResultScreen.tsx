import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import PrimaryButton from '../components/PrimaryButton';
import { colors } from '../constants/colors';
import {
  ProductLookupError,
  resolveProductByBarcode,
  type ProductSourceInfo,
  type ResolvedProduct,
} from '../services/productLookup';
import {
  findHarmfulIngredients,
  isHarmfulIngredientSegment,
  splitIngredients,
} from '../utils/healthScore';
import type { RootStackParamList } from '../utils/navigation';
import { analyzeProduct, type ProductMetric } from '../utils/productInsights';

type ResultScreenProps = NativeStackScreenProps<RootStackParamList, 'Result'>;
type ResultErrorState = 'network' | 'not_found' | 'service' | null;

function getToneColor(tone: 'good' | 'neutral' | 'warning') {
  if (tone === 'good') {
    return colors.success;
  }

  if (tone === 'warning') {
    return colors.warning;
  }

  return colors.textMuted;
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
  switch (grade) {
    case 'A':
    case 'B':
      return colors.success;
    case 'C':
      return colors.warning;
    case 'D':
    case 'E':
      return colors.danger;
    default:
      return colors.border;
  }
}

export default function ResultScreen({ route }: ResultScreenProps) {
  const { barcode, barcodeType } = route.params;
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorState, setErrorState] = useState<ResultErrorState>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [product, setProduct] = useState<ResolvedProduct | null>(null);
  const [requestKey, setRequestKey] = useState(0);

  useEffect(() => {
    let isActive = true;

    const loadProduct = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        setErrorState(null);

        const response = await resolveProductByBarcode(barcode, barcodeType);

        if (!isActive) {
          return;
        }

        if (!response) {
          setProduct(null);
          setErrorState('not_found');
          setErrorMessage(
            'No product entry was found for this barcode yet. Try another scan or check later.'
          );
          return;
        }

        setProduct(response);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setProduct(null);

        if (error instanceof ProductLookupError) {
          setErrorState(error.kind);
          setErrorMessage(error.message);
        } else {
          setErrorState('service');
          setErrorMessage(
            'Product data providers are not reachable right now. Tap Retry Lookup in a moment.'
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadProduct();

    return () => {
      isActive = false;
    };
  }, [barcode, barcodeType, requestKey]);

  const barcodeFormatLabel = barcodeType
    ? barcodeType.replace(/_/g, ' ').toUpperCase()
    : null;
  const harmfulIngredients = findHarmfulIngredients(product?.ingredientsText);
  const ingredientSegments = product?.ingredientsText
    ? splitIngredients(product.ingredientsText)
    : ['Ingredient details will appear when source data is available.'];
  const insights = product ? analyzeProduct(product) : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>Scanned Barcode</Text>
          <Text style={styles.barcodeText}>{barcode}</Text>
          {barcodeFormatLabel ? (
            <Text style={styles.statusText}>Format: {barcodeFormatLabel}</Text>
          ) : null}

          {isLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.primary} size="small" />
              <Text style={styles.statusText}>Loading product analysis...</Text>
            </View>
          ) : (
            <>
              <Text style={styles.statusText}>
                {errorMessage || 'Product data loaded and analyzed from available sources.'}
              </Text>
              {errorState === 'network' || errorState === 'service' ? (
                <View style={styles.retryButtonWrapper}>
                  <PrimaryButton
                    label="Retry Lookup"
                    onPress={() => setRequestKey((value) => value + 1)}
                  />
                </View>
              ) : null}
            </>
          )}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.label}>Quick Take</Text>

          {insights ? (
            <>
              <View style={styles.quickTakeRow}>
                <View
                  style={[
                    styles.scoreBadge,
                    {
                      backgroundColor:
                        insights.smartScore === null
                          ? colors.border
                          : insights.smartScore >= 80
                            ? colors.success
                            : insights.smartScore >= 65
                              ? colors.primary
                              : insights.smartScore >= 45
                                ? colors.warning
                                : colors.danger,
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
                <View style={styles.quickTakeText}>
                  <Text style={styles.value}>{insights.verdict}</Text>
                  <Text style={styles.statusText}>{insights.summary}</Text>
                </View>
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
                    <Text key={caution} style={styles.warningText}>
                      • {caution}
                    </Text>
                  ))}
                </View>
              ) : null}
            </>
          ) : (
            <Text style={styles.statusText}>
              Smart scoring will appear after product data is loaded.
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

          <Text style={styles.value}>
            {product?.name || 'Catalog entry unavailable'}
          </Text>
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

        <View style={styles.infoCard}>
          <Text style={styles.label}>Ingredients</Text>
          <Text style={styles.bodyText}>
            {ingredientSegments.map((ingredient, index) => (
              <Text
                key={`${ingredient}-${index}`}
                style={
                  isHarmfulIngredientSegment(ingredient)
                    ? styles.harmfulIngredientText
                    : undefined
                }
              >
                {ingredient}
                {index < ingredientSegments.length - 1 ? ', ' : ''}
              </Text>
            ))}
          </Text>

          {harmfulIngredients.length > 0 ? (
            <Text style={styles.warningText}>
              Flagged ingredients:{' '}
              {harmfulIngredients.map((ingredient) => ingredient.label).join(', ')}
            </Text>
          ) : product?.ingredientsText ? (
            <Text style={styles.goodText}>
              No tracked harmful ingredients were detected in the available ingredient list.
            </Text>
          ) : (
            <Text style={styles.statusText}>
              Ingredient-level highlighting will appear when source data provides an ingredient list.
            </Text>
          )}

          {product?.allergens.length ? (
            <Text style={styles.warningText}>
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
                  { backgroundColor: getOffScoreTone(product.nutriScore) },
                ]}
              >
                <Text
                  style={[
                    styles.gradeText,
                    {
                      color:
                        product.nutriScore === 'Unknown'
                          ? colors.text
                          : colors.surface,
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
  harmfulIngredientText: {
    color: colors.danger,
    fontWeight: '700',
  },
  heroCard: {
    backgroundColor: colors.primaryMuted,
    borderRadius: 24,
    gap: 10,
    padding: 24,
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
  productImage: {
    alignSelf: 'center',
    backgroundColor: colors.background,
    borderRadius: 16,
    height: 180,
    width: '100%',
  },
  quickTakeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
  },
  quickTakeText: {
    flex: 1,
    gap: 4,
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
  scoreBadge: {
    alignItems: 'center',
    borderRadius: 999,
    justifyContent: 'center',
    minHeight: 64,
    minWidth: 110,
    paddingHorizontal: 18,
    paddingVertical: 10,
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
  warningText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
  },
});
