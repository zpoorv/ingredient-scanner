import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '../components/AppThemeProvider';
import NativeSponsoredCard from '../components/NativeSponsoredCard';
import ProductSearchResultRow from '../components/ProductSearchResultRow';
import ScreenReveal from '../components/ScreenReveal';
import type { DietProfileId } from '../constants/dietProfiles';
import type { PremiumEntitlement } from '../models/premium';
import type { UserProfile } from '../models/userProfile';
import type { RootStackParamList } from '../navigation/types';
import {
  browseSearchProducts,
  searchProducts,
  type ProductSearchResult,
} from '../services/productSearchService';
import {
  loadSessionEffectiveShoppingProfile,
  loadSessionPremiumEntitlement,
  loadSessionUserProfile,
} from '../services/sessionDataService';
import { getPremiumSession, subscribePremiumSession } from '../store';
import {
  buildHouseholdFitResult,
  getHouseholdFitRank,
} from '../utils/householdFit';

type SearchScreenProps = NativeStackScreenProps<RootStackParamList, 'Search'>;
type SearchAdRow = { id: string; type: 'ad' };
type SearchListRow = ProductSearchResult | SearchAdRow;

function isSearchAdRow(item: SearchListRow): item is SearchAdRow {
  return 'type' in item;
}

export default function SearchScreen({ navigation }: SearchScreenProps) {
  const { colors, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductSearchResult[]>([]);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeProfileId, setActiveProfileId] = useState<DietProfileId | undefined>(undefined);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [premiumEntitlement, setPremiumEntitlement] = useState<PremiumEntitlement>(
    getPremiumSession()
  );
  const deferredQuery = useDeferredValue(query);
  const latestRequestIdRef = useRef(0);

  useEffect(() => {
    let isMounted = true;

    const restoreProfile = async () => {
      const [effectiveProfile, profile] = await Promise.all([
        loadSessionEffectiveShoppingProfile('stale-while-revalidate'),
        loadSessionUserProfile('stale-while-revalidate'),
      ]);

      if (isMounted) {
        setActiveProfileId(effectiveProfile.dietProfileId);
        setUserProfile(profile);
      }
    };

    void restoreProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    void loadSessionPremiumEntitlement('stale-while-revalidate').then((entitlement) => {
      if (isMounted) {
        setPremiumEntitlement(entitlement);
      }
    });

    const unsubscribe = subscribePremiumSession((entitlement) => {
      if (isMounted) {
        setPremiumEntitlement(entitlement);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const loadResults = useCallback(async (nextQuery: string, requestId: number) => {
    setIsLoading(true);

    try {
      const nextResults = nextQuery.trim()
        ? await searchProducts(nextQuery)
        : await browseSearchProducts();

      if (latestRequestIdRef.current !== requestId) {
        return;
      }

      setResults(nextResults);
      setHasLoadedOnce(true);
    } finally {
      if (latestRequestIdRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;
    const debounceMs = deferredQuery.trim() ? 180 : 0;

    setIsLoading(true);
    const timeoutId = setTimeout(() => {
      void loadResults(deferredQuery, requestId);
    }, debounceMs);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [deferredQuery, loadResults]);

  const rankedResults = useMemo(() => {
    const nextResults = results.map((result) => ({
      ...result,
      householdFit: buildHouseholdFitResult(
        result.product,
        userProfile,
        activeProfileId
      ),
    }));

    return nextResults.sort((left, right) => {
      const fitGap =
        getHouseholdFitRank(right.householdFit?.verdict) -
        getHouseholdFitRank(left.householdFit?.verdict);

      if (fitGap !== 0) {
        return fitGap;
      }

      if (left.sourceLabel !== right.sourceLabel) {
        return left.sourceLabel === 'saved' ? -1 : 1;
      }

      return left.product.name.localeCompare(right.product.name);
    });
  }, [activeProfileId, results, userProfile]);

  const handleOpenResult = (result: ProductSearchResult) => {
    navigation.push('Result', {
      barcode: result.product.barcode,
      persistToHistory: false,
      profileId: activeProfileId,
      product: result.product,
      resultSource: 'barcode',
    });
  };
  const listData = useMemo<SearchListRow[]>(() => {
    if (isLoading || premiumEntitlement.isPremium || rankedResults.length < 8) {
      return rankedResults;
    }

    const nextRows: SearchListRow[] = [...rankedResults];
    nextRows.splice(5, 0, { id: 'search-native-ad', type: 'ad' });
    return nextRows;
  }, [isLoading, premiumEntitlement.isPremium, rankedResults]);

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.safeArea}>
      <View style={styles.screen}>
        <ScreenReveal style={styles.container}>
          <View style={styles.heroCard}>
            <Text style={styles.heroLabel}>Shelf search</Text>
            <Text style={styles.heroTitle}>Find a better option fast</Text>
            <Text style={styles.heroSubtitle}>
              Search by product or brand, then open the clearest match.
            </Text>
            <View style={styles.heroPill}>
              <Text style={styles.heroPillText}>
                {rankedResults.length > 0
                  ? `${rankedResults.length} result${rankedResults.length === 1 ? '' : 's'} ready`
                  : 'Ready when you are'}
              </Text>
            </View>
          </View>

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
          ) : rankedResults.length > 0 ? (
            <FlatList
              style={styles.resultsList}
              contentContainerStyle={styles.listContent}
              data={listData}
              keyboardShouldPersistTaps="handled"
              keyExtractor={(item) => item.id}
              renderItem={({ item }) =>
                isSearchAdRow(item) ? (
                  <NativeSponsoredCard compact surface="search" />
                ) : (
                  <ProductSearchResultRow onPress={handleOpenResult} result={item} />
                )
              }
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
      gap: 16,
      padding: 24,
    },
    emptyState: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderBottomColor: colors.border,
      borderBottomWidth: 1,
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
    heroCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 28,
      gap: 10,
      padding: 22,
    },
    heroLabel: {
      color: colors.primary,
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    heroPill: {
      alignSelf: 'flex-start',
      backgroundColor: colors.primaryMuted,
      borderRadius: 999,
      marginTop: 4,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    heroPillText: {
      color: colors.primary,
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '800',
    },
    heroSubtitle: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 15,
      lineHeight: 21,
    },
    heroTitle: {
      color: colors.text,
      fontFamily: typography.displayFontFamily,
      fontSize: 30,
      fontWeight: '800',
      lineHeight: 34,
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
      borderRadius: 22,
      borderWidth: 1,
      color: colors.text,
      fontFamily: typography.bodyFontFamily,
      fontSize: 17,
      paddingHorizontal: 18,
      paddingVertical: 16,
    },
  });
