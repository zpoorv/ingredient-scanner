import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors } from '../constants/colors';
import {
  fetchProductByBarcode,
  type OpenFoodFactsProduct,
} from '../services/openFoodFacts';
import {
  calculateHealthScore,
  findHarmfulIngredients,
  isHarmfulIngredientSegment,
  splitIngredients,
} from '../utils/healthScore';
import type { RootStackParamList } from '../utils/navigation';

type ResultScreenProps = NativeStackScreenProps<RootStackParamList, 'Result'>;

const PLACEHOLDER_CONTENT = {
  healthScore: 'Pending',
  ingredients:
    'Ingredients will appear here after the barcode is resolved from Open Food Facts.',
  productName: 'Product name',
};

export default function ResultScreen({ route }: ResultScreenProps) {
  const { barcode } = route.params;

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [product, setProduct] = useState<OpenFoodFactsProduct | null>(null);

  useEffect(() => {
    let isActive = true;

    const loadProduct = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const response = await fetchProductByBarcode(barcode);

        if (!isActive) {
          return;
        }

        if (!response) {
          setProduct(null);
          setErrorMessage(
            'No matching product was found yet, so placeholder details are shown.'
          );
          return;
        }

        setProduct(response);
      } catch {
        if (!isActive) {
          return;
        }

        setProduct(null);
        setErrorMessage(
          'Product data could not be loaded right now, so placeholder details are shown.'
        );
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    // Keep the placeholders visible even when the API has no product for this barcode.
    loadProduct();

    return () => {
      isActive = false;
    };
  }, [barcode]);

  const productName =
    product?.product_name?.trim() || PLACEHOLDER_CONTENT.productName;
  const productIngredients = product?.ingredients_text?.trim() || null;
  const harmfulIngredients = findHarmfulIngredients(productIngredients);
  const healthScore = calculateHealthScore(productIngredients);
  const ingredientSegments = productIngredients
    ? splitIngredients(productIngredients)
    : [PLACEHOLDER_CONTENT.ingredients];
  const healthScoreLabel =
    healthScore === null ? PLACEHOLDER_CONTENT.healthScore : `${healthScore}/100`;
  const healthScoreTone =
    healthScore === null
      ? colors.textMuted
      : healthScore >= 80
        ? colors.primary
        : healthScore >= 60
          ? '#C28518'
          : colors.danger;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>Scanned Barcode</Text>
          <Text style={styles.barcodeText}>{barcode}</Text>

          {isLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.primary} size="small" />
              <Text style={styles.statusText}>Loading product details...</Text>
            </View>
          ) : (
            <Text style={styles.statusText}>
              {errorMessage || 'Live product data loaded when available.'}
            </Text>
          )}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.label}>Product Name</Text>
          <Text style={styles.value}>{productName}</Text>
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
          ) : (
            <Text style={styles.statusText}>
              {productIngredients
                ? 'No tracked harmful ingredients were found in this ingredient list.'
                : 'Highlighting will update when real ingredient data is available.'}
            </Text>
          )}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.label}>Health Score</Text>
          <View
            style={[
              styles.scoreBadge,
              {
                backgroundColor:
                  healthScore === null ? colors.border : healthScoreTone,
              },
            ]}
          >
            <Text
              style={[
                styles.scoreText,
                { color: healthScore === null ? colors.text : colors.surface },
              ]}
            >
              {healthScoreLabel}
            </Text>
          </View>
          <Text style={styles.statusText}>
            {healthScore === null
              ? 'Health score will be calculated once real ingredients are available.'
              : 'Score starts at 100 and drops when tracked harmful ingredients are detected.'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
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
  harmfulIngredientText: {
    color: colors.danger,
    fontWeight: '700',
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
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  scoreBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  scoreText: {
    color: colors.surface,
    fontSize: 18,
    fontWeight: '800',
  },
  statusText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  warningText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
  },
  value: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
  },
});
