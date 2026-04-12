import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import FeaturePageLayout from '../components/FeaturePageLayout';
import { useAppTheme } from '../components/AppThemeProvider';
import type { ProductOverrideRecord } from '../models/productOverride';
import type { RootStackParamList } from '../navigation/types';
import { loadFeaturedProductRecords } from '../services/productCatalogService';
import { applyProductOverride } from '../services/productOverrideService';
import type { ResolvedProduct } from '../types/product';

type FeaturedProductsScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'FeaturedProducts'
>;

type FeaturedProduct = {
  note: string | null;
  product: ResolvedProduct;
};

export default function FeaturedProductsScreen({
  navigation,
}: FeaturedProductsScreenProps) {
  const { colors, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const [featuredProducts, setFeaturedProducts] = useState<FeaturedProduct[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    void loadFeaturedProductRecords().then((records) => {
      if (!isMounted) {
        return;
      }

      setFeaturedProducts(
        records
          .map((record: ProductOverrideRecord) => {
            const product = applyProductOverride(null, record);

            if (!product) {
              return null;
            }

            return {
              note: record.featuredNote?.trim() || null,
              product,
            };
          })
          .filter((item): item is FeaturedProduct => Boolean(item))
      );
      setHasLoaded(true);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleOpenProduct = useCallback(
    (product: ResolvedProduct) => {
      navigation.push('Result', {
        barcode: product.barcode,
        persistToHistory: false,
        product,
        productSnapshotSource: 'search-cache',
        resultSource: 'barcode',
        revalidateOnOpen: true,
      });
    },
    [navigation]
  );

  return (
    <FeaturePageLayout
      eyebrow="Featured"
      subtitle="Curated picks from Inqoura product records. Add or reorder these from the admin panel."
      title="Featured products"
    >
      {!hasLoaded ? (
        <View style={styles.card}>
          <Text style={styles.title}>Loading picks</Text>
          <Text style={styles.body}>Checking the latest curated product records.</Text>
        </View>
      ) : featuredProducts.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.title}>No featured products yet</Text>
          <Text style={styles.body}>
            Mark products as featured in the admin panel and they will appear here.
          </Text>
        </View>
      ) : (
        featuredProducts.map(({ note, product }) => (
          <Pressable
            key={product.code || product.barcode}
            onPress={() => handleOpenProduct(product)}
            style={styles.productCard}
          >
            {product.imageUrl ? (
              <Image
                contentFit="cover"
                source={{ uri: product.imageUrl }}
                style={styles.productImage}
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.imagePlaceholderText}>
                  {product.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.productCopy}>
              <Text numberOfLines={2} style={styles.productName}>
                {product.name}
              </Text>
              {product.brand ? <Text style={styles.meta}>{product.brand}</Text> : null}
              <Text numberOfLines={2} style={styles.body}>
                {note || product.quantity || product.categories.slice(0, 2).join(' • ') || product.barcode}
              </Text>
            </View>
          </Pressable>
        ))
      )}
      <View style={styles.card}>
        <Text style={styles.title}>How this list works</Text>
        <Text style={styles.body}>
          Featured items are admin-curated. Scores and warnings still stay independent.
        </Text>
      </View>
    </FeaturePageLayout>
  );
}

const createStyles = (
  colors: ReturnType<typeof useAppTheme>['colors'],
  typography: ReturnType<typeof useAppTheme>['typography']
) =>
  StyleSheet.create({
    body: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 15,
      lineHeight: 22,
    },
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 24,
      borderWidth: 1,
      gap: 8,
      padding: 20,
    },
    imagePlaceholder: {
      alignItems: 'center',
      backgroundColor: colors.primaryMuted,
      borderRadius: 20,
      height: 82,
      justifyContent: 'center',
      width: 82,
    },
    imagePlaceholderText: {
      color: colors.primary,
      fontFamily: typography.headingFontFamily,
      fontSize: 26,
      fontWeight: '800',
    },
    meta: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 14,
      lineHeight: 20,
    },
    productCard: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 24,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 16,
      padding: 16,
    },
    productCopy: {
      flex: 1,
      gap: 5,
    },
    productImage: {
      backgroundColor: colors.background,
      borderRadius: 20,
      height: 82,
      width: 82,
    },
    productName: {
      color: colors.text,
      fontFamily: typography.headingFontFamily,
      fontSize: 17,
      fontWeight: '800',
      lineHeight: 22,
    },
    title: {
      color: colors.text,
      fontFamily: typography.headingFontFamily,
      fontSize: 20,
      fontWeight: '800',
    },
  });
