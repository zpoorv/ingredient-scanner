import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '../components/AppThemeProvider';
import BottomMenuBar from '../components/BottomMenuBar';
import ProductSearchResultRow from '../components/ProductSearchResultRow';
import ScreenReveal from '../components/ScreenReveal';
import type { DietProfileId } from '../constants/dietProfiles';
import type { RootStackParamList } from '../navigation/types';
import { loadEffectiveShoppingProfile } from '../services/householdProfilesService';
import {
  browseSearchProducts,
  searchProducts,
  type ProductSearchResult,
} from '../services/productSearchService';

type SearchScreenProps = NativeStackScreenProps<RootStackParamList, 'Search'>;

export default function SearchScreen({ navigation }: SearchScreenProps) {
  const { colors, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductSearchResult[]>([]);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeProfileId, setActiveProfileId] = useState<DietProfileId | undefined>(undefined);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    let isMounted = true;

    const restoreProfile = async () => {
      const effectiveProfile = await loadEffectiveShoppingProfile();

      if (isMounted) {
        setActiveProfileId(effectiveProfile.dietProfileId);
      }
    };

    void restoreProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const loadResults = useCallback(async (nextQuery: string) => {
    setIsLoading(true);

    try {
      const nextResults = nextQuery.trim()
        ? await searchProducts(nextQuery)
        : await browseSearchProducts();
      setResults(nextResults);
      setHasLoadedOnce(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadResults(deferredQuery);
  }, [deferredQuery, loadResults]);

  const handleOpenResult = (result: ProductSearchResult) => {
    navigation.push('Result', {
      barcode: result.product.barcode,
      persistToHistory: false,
      profileId: activeProfileId,
      product: result.product,
      resultSource: 'barcode',
    });
  };

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.safeArea}>
      <View style={styles.screen}>
        <ScreenReveal style={styles.container}>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setQuery}
            placeholder="Search products or brands"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            value={query}
          />

          {isLoading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Searching...</Text>
            </View>
          ) : results.length > 0 ? (
            <FlatList
              style={styles.resultsList}
              contentContainerStyle={styles.listContent}
              data={results}
              keyboardShouldPersistTaps="handled"
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <ProductSearchResultRow onPress={handleOpenResult} result={item} />
              )}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>
                {hasLoadedOnce ? 'No products found' : 'Start searching'}
              </Text>
              <Text style={styles.emptyText}>
                {query.trim()
                  ? 'Try a shorter name, a brand, or scan the barcode instead.'
                  : 'Search by product or brand.'}
              </Text>
            </View>
          )}
        </ScreenReveal>
        <BottomMenuBar activeRoute="Search" scannerProfileId={activeProfileId} />
      </View>
    </SafeAreaView>
  );
}

const createStyles = (
  colors: ReturnType<typeof useAppTheme>['colors'],
  typography: ReturnType<typeof useAppTheme>['typography']
) =>
  StyleSheet.create({
    container: {
      flex: 1,
      gap: 14,
      padding: 24,
    },
    emptyState: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 24,
      borderWidth: 1,
      gap: 8,
      marginTop: 10,
      padding: 24,
    },
    emptyText: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 14,
      lineHeight: 21,
      textAlign: 'center',
    },
    emptyTitle: {
      color: colors.text,
      fontFamily: typography.headingFontFamily,
      fontSize: 18,
      fontWeight: '700',
    },
    listContent: {
      gap: 12,
      paddingBottom: 132,
    },
    resultsList: {
      flex: 1,
    },
    safeArea: {
      backgroundColor: colors.background,
      flex: 1,
    },
    screen: {
      flex: 1,
    },
    searchInput: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 18,
      borderWidth: 1,
      color: colors.text,
      fontFamily: typography.bodyFontFamily,
      fontSize: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
  });
