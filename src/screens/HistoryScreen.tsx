import { useCallback, useDeferredValue, useMemo, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import HistoryListItem from '../components/HistoryListItem';
import HistoryListItemSkeleton from '../components/HistoryListItemSkeleton';
import NativeSponsoredCard from '../components/NativeSponsoredCard';
import ScreenReveal from '../components/ScreenReveal';
import { useAppTheme } from '../components/AppThemeProvider';
import type { PremiumEntitlement } from '../models/premium';
import { openMainRoute } from '../navigation/navigationRef';
import type { RootStackParamList } from '../navigation/types';
import { measurePerformanceTrace } from '../services/performanceTrace';
import {
  loadSessionPremiumEntitlement,
  loadSessionScanHistory,
  loadSessionUserProfile,
} from '../services/sessionDataService';
import {
  deleteScanHistoryEntries,
  subscribeScanHistoryChanges,
  type ScanHistoryEntry,
} from '../services/scanHistoryStorage';
import { getDietProfileDefinition } from '../utils/dietProfiles';
import { getPremiumSession } from '../store';

type HistoryScreenProps = NativeStackScreenProps<RootStackParamList, 'History'>;
type SortOrder = 'newest' | 'oldest';
type HistoryAdRow = { id: string; type: 'ad' };
type HistoryListRow = HistoryAdRow | ScanHistoryEntry | number;

function matchesQuery(entry: ScanHistoryEntry, query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return [entry.name, entry.barcode, entry.riskSummary, entry.gradeLabel, getDietProfileDefinition(entry.profileId).label]
    .join(' ')
    .toLowerCase()
    .includes(normalizedQuery);
}

function isHistoryAdRow(item: HistoryListRow): item is HistoryAdRow {
  return typeof item !== 'number' && 'type' in item;
}

export default function HistoryScreen({ navigation }: HistoryScreenProps) {
  const { colors, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);
  const [favoriteProductCodes, setFavoriteProductCodes] = useState<string[]>([]);
  const [hasMeasuredList, setHasMeasuredList] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<ScanHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [premiumEntitlement, setPremiumEntitlement] = useState<PremiumEntitlement>(
    getPremiumSession()
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const deferredSearchQuery = useDeferredValue(searchQuery);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const loadHistory = async (
        policy: Parameters<typeof loadSessionScanHistory>[0] = 'cache-first',
        showLoading = historyEntries.length === 0
      ) => {
        if (showLoading) {
          setIsLoading(true);
        }

        try {
          const [nextEntries, entitlement, profile] = await Promise.all([
            loadSessionScanHistory(policy),
            loadSessionPremiumEntitlement('cache-first'),
            loadSessionUserProfile('cache-first'),
          ]);

          if (!isMounted) {
            return;
          }

          setFavoriteProductCodes(profile?.favoriteProductCodes ?? []);
          setHistoryEntries(nextEntries);
          setPremiumEntitlement(entitlement ?? getPremiumSession());

          if (!hasMeasuredList) {
            measurePerformanceTrace('app-start', 'history-overview-ready');
            setHasMeasuredList(true);
          }
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      };

      const unsubscribe = subscribeScanHistoryChanges(() => {
        void loadHistory('stale-while-revalidate', false);
      });

      void loadHistory(historyEntries.length > 0 ? 'stale-while-revalidate' : 'cache-first');

      return () => {
        isMounted = false;
        unsubscribe();
      };
    }, [hasMeasuredList, historyEntries.length])
  );

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
  const selectedEntryIdSet = useMemo(() => new Set(selectedEntryIds), [selectedEntryIds]);

  const listData = useMemo<HistoryListRow[]>(() => {
    if (isLoading) {
      return [1, 2, 3, 4];
    }

    if (premiumEntitlement.isPremium || visibleEntries.length < 6) {
      return visibleEntries;
    }

    const nextRows: HistoryListRow[] = [...visibleEntries];
    nextRows.splice(4, 0, { id: 'history-native-ad', type: 'ad' });
    return nextRows;
  }, [isLoading, premiumEntitlement.isPremium, visibleEntries]);

  const handleDeleteEntries = useCallback(async (entryIds: string[]) => {
    const nextEntries = await deleteScanHistoryEntries(entryIds);
    setHistoryEntries(nextEntries);
    setSelectedEntryIds((currentIds) => currentIds.filter((id) => !entryIds.includes(id)));
  }, []);

  const renderHistoryItem = useCallback(
    ({ item }: { item: ScanHistoryEntry }) => (
      <HistoryListItem
        entry={item}
        isFavorite={favoriteProductCodes.includes(item.product.code || item.barcode)}
        isSelected={selectedEntryIdSet.has(item.id)}
        onDelete={() => void handleDeleteEntries([item.id])}
        onLongPress={() =>
          setSelectedEntryIds((currentIds) =>
            currentIds.includes(item.id)
              ? currentIds.filter((id) => id !== item.id)
              : [...currentIds, item.id]
          )
        }
        onPress={() => {
          if (selectionMode) {
            setSelectedEntryIds((currentIds) =>
              currentIds.includes(item.id)
                ? currentIds.filter((id) => id !== item.id)
                : [...currentIds, item.id]
            );
            return;
          }

          navigation.push('Result', {
            barcode: item.barcode,
            barcodeType: item.barcodeType,
            persistToHistory: false,
            profileId: item.profileId,
            product: item.product,
          });
        }}
        selectionMode={selectionMode}
      />
    ),
    [favoriteProductCodes, handleDeleteEntries, navigation, selectedEntryIdSet, selectionMode]
  );

  const headerContent = (
    <ScreenReveal style={styles.headerContent}>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>History</Text>
        <Text style={styles.title}>Your scan timeline</Text>
        <Text style={styles.subtitle}>
          Search, sort, select, and reopen past scans without mixing in progress or alert widgets.
        </Text>
        <View style={styles.heroStatsRow}>
          <View style={styles.heroStatPill}>
            <Text style={styles.heroStatLabel}>Scans</Text>
            <Text style={styles.heroStatValue}>{historyEntries.length}</Text>
          </View>
          <View style={styles.heroStatPill}>
            <Text style={styles.heroStatLabel}>Saved</Text>
            <Text style={styles.heroStatValue}>{favoriteProductCodes.length}</Text>
          </View>
          <Pressable onPress={() => openMainRoute('Search')} style={styles.searchShortcut}>
            <Text style={styles.searchShortcutText}>Search products</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.controlsCard}>
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
                  style={[styles.sortChipText, isSelected && styles.sortChipTextSelected]}
                >
                  {option === 'newest' ? 'Newest' : 'Oldest'}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {visibleEntries.length > 0 ? (
          <View style={styles.selectionActions}>
            <Pressable
              onPress={() =>
                setSelectedEntryIds(
                  selectedEntryIds.length === visibleEntries.length
                    ? []
                    : visibleEntries.map((entry) => entry.id)
                )
              }
              style={styles.selectionActionChip}
            >
              <Text style={styles.selectionActionText}>
                {selectedEntryIds.length === visibleEntries.length ? 'Clear All' : 'Select All'}
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
                  onPress={() => void handleDeleteEntries(selectedEntryIds)}
                  style={styles.deleteActionChip}
                >
                  <Text style={styles.deleteActionText}>Delete Selected</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        ) : null}
      </View>
    </ScreenReveal>
  );

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.safeArea}>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={listData}
        initialNumToRender={8}
        keyboardShouldPersistTaps="handled"
        keyExtractor={(item) => (typeof item === 'number' ? `history-skeleton-${item}` : item.id)}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.stateCard}>
              <Text style={styles.stateTitle}>
                {searchQuery.trim() ? 'No scans matched your search' : 'No saved scans yet'}
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
        removeClippedSubviews={Platform.OS === 'android'}
        renderItem={({ item }) =>
          typeof item === 'number' ? (
            <HistoryListItemSkeleton />
          ) : isHistoryAdRow(item) ? (
            <NativeSponsoredCard compact surface="history" />
          ) : (
            renderHistoryItem({ item })
          )
        }
        showsVerticalScrollIndicator={false}
        style={styles.list}
        updateCellsBatchingPeriod={60}
        windowSize={5}
      />
    </SafeAreaView>
  );
}

const createStyles = (
  colors: ReturnType<typeof useAppTheme>['colors'],
  typography: ReturnType<typeof useAppTheme>['typography']
) =>
  StyleSheet.create({
    controlsCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 24,
      borderWidth: 1,
      gap: 12,
      padding: 18,
    },
    deleteActionChip: {
      alignItems: 'center',
      backgroundColor: colors.dangerMuted,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    deleteActionText: {
      color: colors.danger,
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '800',
    },
    eyebrow: {
      color: colors.primary,
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    headerContent: {
      gap: 16,
      paddingBottom: 18,
    },
    heroCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 28,
      borderWidth: 1,
      gap: 8,
      padding: 22,
    },
    heroStatLabel: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 12,
    },
    heroStatPill: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: 18,
      borderWidth: 1,
      gap: 4,
      minWidth: 84,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    heroStatValue: {
      color: colors.text,
      fontFamily: typography.headingFontFamily,
      fontSize: 18,
      fontWeight: '800',
    },
    heroStatsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      paddingTop: 4,
    },
    list: {
      flex: 1,
    },
    listContent: {
      padding: 24,
      paddingBottom: 132,
    },
    safeArea: {
      backgroundColor: colors.background,
      flex: 1,
    },
    searchInput: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: 18,
      borderWidth: 1,
      color: colors.text,
      fontFamily: typography.bodyFontFamily,
      fontSize: 15,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    searchShortcut: {
      alignItems: 'center',
      backgroundColor: colors.primaryMuted,
      borderRadius: 18,
      justifyContent: 'center',
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    searchShortcutText: {
      color: colors.primary,
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '800',
    },
    selectionActionChip: {
      alignItems: 'center',
      backgroundColor: colors.primaryMuted,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    selectionActionText: {
      color: colors.primary,
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '800',
    },
    selectionActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    sortChip: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    sortChipSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    sortChipText: {
      color: colors.text,
      fontFamily: typography.headingFontFamily,
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
    stateCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 24,
      borderWidth: 1,
      gap: 8,
      padding: 20,
    },
    stateText: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 15,
      lineHeight: 22,
    },
    stateTitle: {
      color: colors.text,
      fontFamily: typography.headingFontFamily,
      fontSize: 20,
      fontWeight: '800',
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
      fontSize: 30,
      fontWeight: '800',
      lineHeight: 36,
    },
  });
