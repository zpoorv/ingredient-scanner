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
  const ingredients =
    product?.ingredients_text?.trim() || PLACEHOLDER_CONTENT.ingredients;
  const healthScore =
    product?.nutriscore_grade?.toUpperCase() ||
    PLACEHOLDER_CONTENT.healthScore;

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
          <Text style={styles.bodyText}>{ingredients}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.label}>Health Score</Text>
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreText}>{healthScore}</Text>
          </View>
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
  value: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
  },
});
