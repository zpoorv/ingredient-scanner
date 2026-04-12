import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '../components/AppThemeProvider';
import NativeSponsoredCard from '../components/NativeSponsoredCard';
import ProductSearchResultRow from '../components/ProductSearchResultRow';
import ScreenReveal from '../components/ScreenReveal';
import SearchSuggestionRow from '../components/SearchSuggestionRow';
import { SEARCH_QUERY_DEBOUNCE_MS } from '../constants/search';
import type { DietProfileId } from '../constants/dietProfiles';
import type {
  SearchExperience,
  SearchProductHit,
  SearchSuggestion,
} from '../models/search';
import type { PremiumEntitlement } from '../models/premium';
import type { UserProfile } from '../models/userProfile';
import type { RootStackParamList } from '../navigation/types';
import { loadSearchExperience } from '../services/searchCoordinatorService';
import { saveRecentSearchQuery } from '../services/recentSearchStorage';
import {
  loadSessionEffectiveShoppingProfile,
  loadSessionPremiumEntitlement,
  loadSessionUserProfile,
} from '../services/sessionDataService';
import { getPremiumSession, subscribePremiumSession } from '../store';
import { buildHouseholdFitResult } from '../utils/householdFit';

type SearchScreenProps = NativeStackScreenProps<RootStackParamList, 'Search'>;
type SearchListRow =
  | { id: string; title: string; type: 'header' }
  | { id: string; type: 'ad' }
  | SearchProductHit
  | SearchSuggestion;

export default function SearchScreen({ navigation }: SearchScreenProps) {
  const { colors, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const [query, setQuery] = useState('');
  const [experience, setExperience] = useState<SearchExperience | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeProfileId, setActiveProfileId] = useState<DietProfileId | undefined>(undefined);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [premiumEntitlement, setPremiumEntitlement] = useState<PremiumEntitlement>(
    getPremiumSession()
  );
  const latestRequestIdRef = useRef(0);

  useEffect(() => {
    let isMounted = true;

    void Promise.all([
      loadSessionEffectiveShoppingProfile('stale-while-revalidate'),
      loadSessionUserProfile('stale-while-revalidate'),
    ]).then(([effectiveProfile, profile]) => {
      if (!isMounted) {
        return;
      }

      setActiveProfileId(effectiveProfile.dietProfileId);
      setUserProfile(profile);
    });

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

  const loadExperience = useCallback(async (nextQuery: string, requestId: number) => {
    try {
      const nextExperience = await loadSearchExperience(nextQuery);

      if (latestRequestIdRef.current !== requestId) {
        return;
      }

      setExperience(nextExperience);
      setSearchError(null);
    } catch {
      if (latestRequestIdRef.current !== requestId) {
        return;
      }

      setSearchError('Search is using saved results only. Check internet and try again.');
      setExperience({
        query: nextQuery.trim(),
        sections: [],
        usedRemoteSearch: false,
      });
    } finally {
      if (latestRequestIdRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const requestId = latestRequestIdRef.current + 1;
    latestRequestIdRef.current = requestId;
    const timeoutId = setTimeout(() => {
      setIsLoading(true);
      void loadExperience(query, requestId);
    }, SEARCH_QUERY_DEBOUNCE_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [loadExperience, query]);

  const decorateProductHit = useCallback(
    (result: SearchProductHit): SearchProductHit => ({
      ...result,
      householdFit: buildHouseholdFitResult(result.product, userProfile, activeProfileId),
    }),
    [activeProfileId, userProfile]
  );

  const decoratedExperience = useMemo(() => {
    if (!experience) {
      return null;
    }

    return {
      ...experience,
      sections: experience.sections.map((section) => ({
        ...section,
        results: section.results.map((result) =>
          result.type === 'product' ? decorateProductHit(result) : result
        ),
      })),
    };
  }, [decorateProductHit, experience]);

  const listData = useMemo<SearchListRow[]>(() => {
    if (!decoratedExperience) {
      return [];
    }

    const nextRows: SearchListRow[] = [];

    decoratedExperience.sections.forEach((section) => {
      if (section.results.length === 0) {
        return;
      }

      nextRows.push({
        id: `header:${section.id}`,
        title: section.title,
        type: 'header',
      });

      section.results.forEach((result, index) => {
        if (result.type === 'fallback') {
          return;
        }

        if (
          section.id === 'catalog' &&
          !premiumEntitlement.isPremium &&
          index === 4 &&
          section.results.filter((item) => item.type === 'product').length >= 6
        ) {
          nextRows.push({ id: 'search-native-ad', type: 'ad' });
        }

        nextRows.push(result);
      });
    });

    return nextRows;
  }, [decoratedExperience, premiumEntitlement.isPremium]);

  const handleOpenResult = useCallback(
    async (result: SearchProductHit) => {
      const normalizedQuery = query.trim();

      if (normalizedQuery) {
        void saveRecentSearchQuery(normalizedQuery);
      }

      navigation.push('Result', {
        barcode: result.product.barcode,
        persistToHistory: false,
        product: result.product,
        productSnapshotSource: 'search-cache',
        profileId: activeProfileId,
        resultSource: 'barcode',
        revalidateOnOpen: true,
      });
    },
    [activeProfileId, navigation, query]
  );

  const handleOpenSuggestion = useCallback(async (suggestion: SearchSuggestion) => {
    void saveRecentSearchQuery(suggestion.query);
    setQuery(suggestion.query);
  }, []);

  const resultCount = decoratedExperience?.sections.reduce(
    (count, section) =>
      count + section.results.filter((result) => result.type === 'product').length,
    0
  ) ?? 0;

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.safeArea}>
      <View style={styles.screen}>
        <ScreenReveal style={styles.container}>
          <View style={styles.heroCard}>
            <View style={styles.heroHeader}>
              <View>
                <Text style={styles.heroLabel}>Instant search</Text>
                <Text style={styles.heroTitle}>Find the right product faster</Text>
              </View>
              {isLoading ? (
                <View style={styles.statusPill}>
                  <Ionicons color={colors.primary} name="sync-outline" size={14} />
                  <Text style={styles.statusPillText}>Updating</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.heroSubtitle}>
              Search by product name, brand, or barcode. New scans and admin-added products show up here from the shared Firestore catalog.
            </Text>
            <View style={styles.heroMetaRow}>
              <View style={styles.heroPill}>
                <Text style={styles.heroPillText}>
                  {resultCount > 0
                    ? `${resultCount} product${resultCount === 1 ? '' : 's'} ready`
                    : 'Ready when you are'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.searchInputWrap}>
            <Ionicons color={colors.textMuted} name="search-outline" size={18} />
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setQuery}
              placeholder="Search products, brands, or barcode"
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
              value={query}
            />
            {query.trim() ? (
              <Pressable onPress={() => setQuery('')} style={styles.clearButton}>
                <Ionicons color={colors.textMuted} name="close" size={16} />
              </Pressable>
            ) : null}
          </View>

          {listData.length > 0 ? (
            <FlatList
              contentContainerStyle={styles.listContent}
              data={listData}
              keyboardShouldPersistTaps="handled"
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                if (item.type === 'header') {
                  return <Text style={styles.sectionTitle}>{item.title}</Text>;
                }

                if (item.type === 'ad') {
                  return <NativeSponsoredCard compact surface="search" />;
                }

                if (item.type === 'suggestion') {
                  return (
                    <SearchSuggestionRow onPress={handleOpenSuggestion} suggestion={item} />
                  );
                }

                return <ProductSearchResultRow onPress={handleOpenResult} result={item} />;
              }}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>
                {isLoading
                  ? 'Finding strong matches...'
                  : searchError
                    ? 'Search needs a connection'
                    : 'No products found'}
              </Text>
              <Text style={styles.emptyText}>
                {searchError ||
                (query.trim()
                  ? 'Try a shorter name, a brand, or the barcode number.'
                  : 'Search by product, brand, or barcode to jump straight into a result.')}
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
    clearButton: {
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: 12,
      height: 24,
      justifyContent: 'center',
      width: 24,
    },
    container: {
      flex: 1,
      gap: 16,
      padding: 24,
    },
    emptyState: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 24,
      borderWidth: 1,
      gap: 8,
      marginTop: 8,
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
      fontWeight: '800',
    },
    heroCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 24,
      borderWidth: 1,
      gap: 14,
      padding: 20,
    },
    heroHeader: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    heroLabel: {
      color: colors.primary,
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    heroMetaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    heroPill: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    heroPillText: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 12,
      fontWeight: '700',
    },
    heroSubtitle: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 14,
      lineHeight: 21,
    },
    heroTitle: {
      color: colors.text,
      fontFamily: typography.headingFontFamily,
      fontSize: 24,
      fontWeight: '800',
      marginTop: 4,
    },
    listContent: {
      gap: 12,
      paddingBottom: 120,
    },
    safeArea: {
      backgroundColor: colors.background,
      flex: 1,
    },
    screen: {
      backgroundColor: colors.background,
      flex: 1,
    },
    searchInput: {
      color: colors.text,
      flex: 1,
      fontFamily: typography.bodyFontFamily,
      fontSize: 15,
      paddingVertical: 0,
    },
    searchInputWrap: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 20,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
    sectionTitle: {
      color: colors.text,
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '800',
      marginTop: 8,
      textTransform: 'uppercase',
    },
    statusPill: {
      alignItems: 'center',
      backgroundColor: colors.primaryMuted,
      borderRadius: 999,
      flexDirection: 'row',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    statusPillText: {
      color: colors.primary,
      fontFamily: typography.bodyFontFamily,
      fontSize: 12,
      fontWeight: '700',
    },
  });
