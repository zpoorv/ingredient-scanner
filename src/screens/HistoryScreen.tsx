import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '../components/AppThemeProvider';
import BottomMenuBar from '../components/BottomMenuBar';
import HistoryInsightsCard from '../components/HistoryInsightsCard';
import HistoryListItemSkeleton from '../components/HistoryListItemSkeleton';
import HistoryListItem from '../components/HistoryListItem';
import ProductChangeAlertsCard from '../components/ProductChangeAlertsCard';
import ScreenReveal from '../components/ScreenReveal';
import UsualBuysCard from '../components/UsualBuysCard';
import type { ProductChangeAlert } from '../models/productChangeAlert';
import type { RootStackParamList } from '../navigation/types';
import { loadCurrentPremiumEntitlement } from '../services/premiumEntitlementService';
import { loadProductChangeAlerts } from '../services/productChangeAlertService';
import {
  deleteScanHistoryEntries,
  loadScanHistory,
  type ScanHistoryEntry,
} from '../services/scanHistoryStorage';
import { loadUserProfile } from '../services/userProfileService';
import { getDietProfileDefinition } from '../utils/dietProfiles';
import {
  buildHistoryOverview,
  type HistoryInsight,
  type HistoryReplacementCandidate,
  type HistoryRepeatBuyCandidate,
  type HistoryTrend,
} from '../utils/historyPersonalization';

type HistoryScreenProps = NativeStackScreenProps<RootStackParamList, 'History'>;
type SortOrder = 'newest' | 'oldest';
type HistoryListRow = ScanHistoryEntry | number;

function matchesQuery(entry: ScanHistoryEntry, query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  const searchableText = [
    entry.name,
    entry.barcode,
    entry.riskSummary,
    entry.gradeLabel,
    getDietProfileDefinition(entry.profileId).label,
  ]
    .join(' ')
    .toLowerCase();

  return searchableText.includes(normalizedQuery);
}

function isHistoryEntry(item: HistoryListRow): item is ScanHistoryEntry {
  return typeof item !== 'number';
}

export default function HistoryScreen({ navigation }: HistoryScreenProps) {
  const { colors, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const [historyEntries, setHistoryEntries] = useState<ScanHistoryEntry[]>([]);
  const [historyInsights, setHistoryInsights] = useState<HistoryInsight[]>([]);
  const [historyTrend, setHistoryTrend] = useState<HistoryTrend>('steady');
  const [isLoading, setIsLoading] = useState(true);
  const [productChangeAlerts, setProductChangeAlerts] = useState<ProductChangeAlert[]>([]);
  const [favoriteProductCodes, setFavoriteProductCodes] = useState<string[]>([]);
  const [replacementCandidates, setReplacementCandidates] = useState<
    HistoryReplacementCandidate[]
  >([]);
  const [repeatBuyCandidates, setRepeatBuyCandidates] = useState<
    HistoryRepeatBuyCandidate[]
  >([]);
  const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const isFocused = useIsFocused();
  const deferredSearchQuery = useDeferredValue(searchQuery);

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    let isMounted = true;

    const loadHistory = async () => {
      setIsLoading(true);

      try {
        const [nextEntries, entitlement, profile, changeAlerts] = await Promise.all([
          loadScanHistory(),
          loadCurrentPremiumEntitlement(),
          loadUserProfile(),
          loadProductChangeAlerts(),
        ]);

        if (isMounted) {
          setHistoryEntries(nextEntries);
          setProductChangeAlerts(changeAlerts);
          setFavoriteProductCodes(profile?.favoriteProductCodes ?? []);
          const overview = buildHistoryOverview(nextEntries, {
            includePremiumPatterns:
              entitlement.isPremium && (profile?.historyInsightsEnabled ?? true),
          });
          setHistoryInsights(overview.insights);
          setHistoryTrend(overview.weeklyTrend);
          setRepeatBuyCandidates(overview.repeatBuyCandidates);
          setReplacementCandidates(overview.replacementCandidates);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadHistory();

    return () => {
      isMounted = false;
    };
  }, [isFocused]);

  const visibleEntries = useMemo(() => {
    const filteredEntries = historyEntries.filter((entry) =>
      matchesQuery(entry, deferredSearchQuery)
    );

    return filteredEntries.sort((left, right) => {
      const leftTime = new Date(left.scannedAt).getTime();
      const rightTime = new Date(right.scannedAt).getTime();

      return sortOrder === 'newest' ? rightTime - leftTime : leftTime - rightTime;
    });
  }, [deferredSearchQuery, historyEntries, sortOrder]);
  const selectionMode = selectedEntryIds.length > 0;
  const selectedEntryIdSet = useMemo(
    () => new Set(selectedEntryIds),
    [selectedEntryIds]
  );

  const toggleEntrySelection = useCallback((entryId: string) => {
    setSelectedEntryIds((currentIds) =>
      currentIds.includes(entryId)
        ? currentIds.filter((id) => id !== entryId)
        : [...currentIds, entryId]
    );
  }, []);

  const handleDeleteEntries = useCallback(async (entryIds: string[]) => {
    const nextEntries = await deleteScanHistoryEntries(entryIds);

    setHistoryEntries(nextEntries);
    setSelectedEntryIds((currentIds) =>
      currentIds.filter((id) => !entryIds.includes(id))
    );
  }, []);

  const handleOpenChangedProduct = useCallback(
    (alert: ProductChangeAlert) => {
      const matchingEntry = historyEntries.find((entry) => entry.barcode === alert.barcode);

      if (!matchingEntry) {
        navigation.navigate('Search');
        return;
      }

      navigation.push('Result', {
        barcode: matchingEntry.barcode,
        barcodeType: matchingEntry.barcodeType,
        persistToHistory: false,
        profileId: matchingEntry.profileId,
        product: matchingEntry.product,
      });
    },
    [historyEntries, navigation]
  );

  const handleToggleSelectAll = useCallback(() => {
    if (selectedEntryIds.length === visibleEntries.length) {
      setSelectedEntryIds([]);
      return;
    }

    setSelectedEntryIds(visibleEntries.map((entry) => entry.id));
  }, [selectedEntryIds.length, visibleEntries]);

  const handleOpenEntry = useCallback(
    (entry: ScanHistoryEntry) => {
      if (selectionMode) {
        toggleEntrySelection(entry.id);
        return;
      }

      navigation.push('Result', {
        barcode: entry.barcode,
        barcodeType: entry.barcodeType,
        persistToHistory: false,
        profileId: entry.profileId,
        product: entry.product,
      });
    },
    [navigation, selectionMode, toggleEntrySelection]
  );

  const renderHistoryItem = useCallback(
    ({ item }: { item: ScanHistoryEntry }) => (
      <HistoryListItem
        entry={item}
        isFavorite={favoriteProductCodes.includes(item.product.code || item.barcode)}
        isSelected={selectedEntryIdSet.has(item.id)}
        onDelete={() => void handleDeleteEntries([item.id])}
        onLongPress={() => toggleEntrySelection(item.id)}
        onPress={() => handleOpenEntry(item)}
        selectionMode={selectionMode}
      />
    ),
    [
      handleDeleteEntries,
      favoriteProductCodes,
      handleOpenEntry,
      selectedEntryIdSet,
      selectionMode,
      toggleEntrySelection,
    ]
  );

  const headerContent = (
    <ScreenReveal style={styles.headerContent}>
      <View style={styles.header}>
        <View style={styles.eyebrowChip}>
          <Text style={styles.eyebrowText}>Saved Scans</Text>
        </View>
        <Text style={styles.title}>History</Text>
        <Text style={styles.subtitle}>Your recent scans, repeat buys, and watch-outs.</Text>
        <Text style={styles.headerMeta}>
          {historyTrend === 'improving'
            ? 'This week is trending stronger than usual.'
            : historyTrend === 'watch'
              ? 'This week leans more caution-heavy.'
              : 'This week looks fairly steady so far.'}
        </Text>
      </View>

      <View style={styles.controls}>
        <TextInput
          onChangeText={setSearchQuery}
          placeholder="Search scan history"
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          value={searchQuery}
        />

        <View style={styles.sortRow}>
          {(['newest', 'oldest'] as const).map((option) => {
            const isSelected = sortOrder === option;

            return (
              <Pressable
                key={option}
                onPress={() => setSortOrder(option)}
                style={[styles.sortChip, isSelected && styles.sortChipSelected]}
              >
                <Text
                  style={[
                    styles.sortChipText,
                    isSelected && styles.sortChipTextSelected,
                  ]}
                >
                  {option === 'newest' ? 'Newest' : 'Oldest'}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable
          onPress={() => navigation.navigate('Search')}
          style={styles.selectionActionChip}
        >
          <Text style={styles.selectionActionText}>Search Products</Text>
        </Pressable>
        {visibleEntries.length > 0 ? (
          <View style={styles.selectionActions}>
            <Pressable
              onPress={handleToggleSelectAll}
              style={styles.selectionActionChip}
            >
              <Text style={styles.selectionActionText}>
                {selectedEntryIds.length === visibleEntries.length
                  ? 'Clear All'
                  : 'Select All'}
              </Text>
            </Pressable>
            {selectionMode ? (
              <>
                <Pressable
                  onPress={() => setSelectedEntryIds([])}
                  style={styles.selectionActionChip}
                >
                  <Text style={styles.selectionActionText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => handleDeleteEntries(selectedEntryIds)}
                  style={styles.deleteActionChip}
                >
                  <Text style={styles.deleteActionText}>Delete Selected</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        ) : null}
      </View>

      {historyInsights.length > 0 ? (
        <View style={styles.insightsWrap}>
          <HistoryInsightsCard colors={colors} insights={historyInsights} />
        </View>
      ) : null}

      {productChangeAlerts.length > 0 ? (
        <View style={styles.insightsWrap}>
          <ProductChangeAlertsCard
            alerts={productChangeAlerts}
            onOpenAlert={handleOpenChangedProduct}
          />
        </View>
      ) : null}

      {repeatBuyCandidates.length > 0 ? (
        <View style={styles.insightsWrap}>
          <UsualBuysCard
            hideHistoryAction
            items={repeatBuyCandidates.map((candidate) => {
              const matchingEntry =
                historyEntries.find((entry) => entry.id === candidate.id) ?? null;
              const favoriteCode =
                matchingEntry?.product.code || matchingEntry?.barcode || candidate.id;

              return {
                id: candidate.id,
                isFavorite: favoriteProductCodes.includes(favoriteCode),
                name: candidate.name,
                score: matchingEntry?.score ?? null,
                summary: candidate.riskSummary,
                usageCount: candidate.scanCount,
              };
            })}
            onOpenHistory={() => undefined}
            onOpenSearch={() => navigation.navigate('Search')}
          />
        </View>
      ) : null}

      {replacementCandidates.length > 0 ? (
        <View style={styles.stateCard}>
          <Text style={styles.stateTitle}>Replace first</Text>
          {replacementCandidates.map((candidate) => (
            <Text key={candidate.id} style={styles.stateText}>
              • {candidate.name}: {candidate.reason}
            </Text>
          ))}
        </View>
      ) : null}
    </ScreenReveal>
  );

  const loadingItems: HistoryListRow[] = [1, 2, 3, 4];
  const listData: HistoryListRow[] = isLoading ? loadingItems : visibleEntries;

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.safeArea}>
      <View style={styles.screen}>
        <FlatList
          contentContainerStyle={styles.listContent}
          data={listData}
          initialNumToRender={8}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(item) =>
            isHistoryEntry(item) ? item.id : `history-skeleton-${item}`
          }
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.stateCard}>
                <Text style={styles.stateTitle}>
                  {searchQuery.trim()
                    ? 'No scans matched your search'
                    : 'No saved scans yet'}
                </Text>
                <Text style={styles.stateText}>
                  {searchQuery.trim()
                    ? 'Try a different name, barcode, or risk note.'
                    : 'Scan a packaged product and it will appear here automatically.'}
                </Text>
              </View>
            ) : null
          }
          ListHeaderComponent={headerContent}
          maxToRenderPerBatch={8}
          removeClippedSubviews
          renderItem={({ item }) =>
            isHistoryEntry(item) ? (
              renderHistoryItem({ item })
            ) : (
              <HistoryListItemSkeleton />
            )
          }
          showsVerticalScrollIndicator={false}
          style={styles.list}
          updateCellsBatchingPeriod={60}
          windowSize={5}
        />
        <BottomMenuBar activeRoute="History" />
      </View>
    </SafeAreaView>
  );
}

const createStyles = (
  colors: ReturnType<typeof useAppTheme>['colors'],
  typography: ReturnType<typeof useAppTheme>['typography']
) =>
  StyleSheet.create({
  controls: {
    gap: 12,
  },
  eyebrowChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  eyebrowText: {
    color: colors.primary,
    fontFamily: typography.accentFontFamily,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  header: {
    gap: 10,
  },
  headerContent: {
    gap: 18,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 18,
  },
  headerMeta: {
    color: colors.primary,
    fontFamily: typography.bodyFontFamily,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  insightsWrap: {
    marginTop: -2,
  },
  listContent: {
    gap: 12,
    paddingBottom: 132,
  },
  list: {
    flex: 1,
  },
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  screen: {
    flex: 1,
  },
  deleteActionChip: {
    backgroundColor: colors.dangerMuted,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  deleteActionText: {
    color: colors.danger,
    fontFamily: typography.accentFontFamily,
    fontSize: 13,
    fontWeight: '700',
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    color: colors.text,
    fontFamily: typography.bodyFontFamily,
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sortChip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  sortChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sortChipText: {
    color: colors.text,
    fontFamily: typography.accentFontFamily,
    fontSize: 13,
    fontWeight: '700',
  },
  sortChipTextSelected: {
    color: colors.surface,
  },
  sortRow: {
    flexDirection: 'row',
    gap: 10,
  },
  selectionActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  selectionActionChip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  selectionActionText: {
    color: colors.primary,
    fontFamily: typography.accentFontFamily,
    fontSize: 13,
    fontWeight: '700',
  },
  stateCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: 10,
    justifyContent: 'center',
    marginTop: 8,
    padding: 24,
  },
  stateText: {
    color: colors.textMuted,
    fontFamily: typography.bodyFontFamily,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  stateTitle: {
    color: colors.text,
    fontFamily: typography.headingFontFamily,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textMuted,
    fontFamily: typography.bodyFontFamily,
    fontSize: 15,
    lineHeight: 22,
  },
  title: {
    color: colors.text,
    fontFamily: typography.displayFontFamily,
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
  },
  });
