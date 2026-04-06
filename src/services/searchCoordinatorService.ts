import { getAuthSession } from '../store';
import {
  SEARCH_CATALOG_RESULTS_LIMIT,
  SEARCH_LOCAL_ONLY_QUERY_LENGTH,
  SEARCH_LOCAL_RESULTS_LIMIT,
  SEARCH_NUMERIC_QUERY_PATTERN,
  SEARCH_PREFIX_CACHE_LIMIT,
  SEARCH_PREFIX_CACHE_TTL_MS,
  SEARCH_RECENT_QUERIES_LIMIT,
  SEARCH_REMOTE_QUERY_LENGTH,
} from '../constants/search';
import type {
  SearchExperience,
  SearchProductHit,
  SearchSection,
} from '../models/search';
import { loadSavedProductCollections } from './favoriteProductsService';
import { loadSessionScanHistory } from './sessionDataService';
import {
  browseSearchProducts as browseLegacySearchProducts,
  searchProducts as searchLegacyProducts,
} from './productSearchService';
import { loadCommonProducts } from './commonProductStorage';
import { loadRecentSearchQueries } from './recentSearchStorage';

type LocalSearchCandidate = {
  code: string;
  isFavorite: boolean;
  lastUsedAtMs: number;
  product: SearchProductHit['product'];
  usageCount: number;
};

type CachedSearchExperience = {
  experience: SearchExperience;
  scopeId: string;
  storedAt: number;
};

let localSearchCandidatesCache:
  | {
      candidates: LocalSearchCandidate[];
      scopeId: string;
      storedAt: number;
    }
  | null = null;

const prefixSearchCache = new Map<string, CachedSearchExperience>();

function getScopeId() {
  const sessionUser = getAuthSession().user;
  return sessionUser ? `user:${sessionUser.id}` : 'guest';
}

function normalizeQuery(query: string) {
  return query.trim().replace(/\s+/g, ' ');
}

function getSearchableText(record: LocalSearchCandidate) {
  return [
    record.product.name,
    record.product.barcode,
    record.product.code,
    record.product.brand,
    ...record.product.categories,
    ...record.product.labels,
    record.product.ingredientsText,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function scoreLocalCandidate(record: LocalSearchCandidate, query: string) {
  const normalizedQuery = query.toLowerCase();
  const name = record.product.name.toLowerCase();
  const brand = record.product.brand?.toLowerCase() || '';
  const barcode = record.product.barcode.toLowerCase();
  const searchableText = getSearchableText(record);
  let score = 0;

  if (barcode === normalizedQuery || record.product.code.toLowerCase() === normalizedQuery) {
    score += 140;
  }

  if (name === normalizedQuery) {
    score += 120;
  } else if (name.startsWith(normalizedQuery)) {
    score += 100;
  } else if (name.includes(normalizedQuery)) {
    score += 75;
  }

  if (brand === normalizedQuery) {
    score += 80;
  } else if (brand.startsWith(normalizedQuery)) {
    score += 65;
  } else if (brand.includes(normalizedQuery)) {
    score += 45;
  }

  if (!score && searchableText.includes(normalizedQuery)) {
    score += 20;
  }

  if (record.isFavorite) {
    score += 15;
  }

  score += Math.min(record.usageCount * 3, 18);

  const recencyDays = (Date.now() - record.lastUsedAtMs) / (1000 * 60 * 60 * 24);

  if (recencyDays <= 7) {
    score += 12;
  } else if (recencyDays <= 30) {
    score += 6;
  }

  return score;
}

function dedupeProductHits(results: SearchProductHit[]) {
  const seenCodes = new Set<string>();

  return results.filter((result) => {
    const productCode = result.product.code || result.product.barcode;

    if (seenCodes.has(productCode)) {
      return false;
    }

    seenCodes.add(productCode);
    return true;
  });
}

function rememberPrefixCache(query: string, experience: SearchExperience) {
  const key = `${getScopeId()}:${query.toLowerCase()}`;

  prefixSearchCache.set(key, {
    experience,
    scopeId: getScopeId(),
    storedAt: Date.now(),
  });

  if (prefixSearchCache.size <= SEARCH_PREFIX_CACHE_LIMIT) {
    return;
  }

  const oldestKey = [...prefixSearchCache.entries()].sort(
    (left, right) => left[1].storedAt - right[1].storedAt
  )[0]?.[0];

  if (oldestKey) {
    prefixSearchCache.delete(oldestKey);
  }
}

function readPrefixCache(query: string) {
  const key = `${getScopeId()}:${query.toLowerCase()}`;
  const cachedValue = prefixSearchCache.get(key);

  if (!cachedValue) {
    return null;
  }

  if (Date.now() - cachedValue.storedAt > SEARCH_PREFIX_CACHE_TTL_MS) {
    prefixSearchCache.delete(key);
    return null;
  }

  return cachedValue.experience;
}

async function loadLocalSearchCandidates() {
  const scopeId = getScopeId();

  if (
    localSearchCandidatesCache &&
    localSearchCandidatesCache.scopeId === scopeId &&
    Date.now() - localSearchCandidatesCache.storedAt < SEARCH_PREFIX_CACHE_TTL_MS
  ) {
    return localSearchCandidatesCache.candidates;
  }

  const [commonProducts, savedCollections, historyEntries] = await Promise.all([
    loadCommonProducts(),
    loadSavedProductCollections(),
    loadSessionScanHistory('stale-while-revalidate'),
  ]);

  const favoriteCodes = new Set(savedCollections.favoriteProductCodes);
  const candidates = new Map<string, LocalSearchCandidate>();

  commonProducts.forEach((record) => {
    const code = record.code || record.barcode;

    candidates.set(code, {
      code,
      isFavorite: favoriteCodes.has(code),
      lastUsedAtMs: new Date(record.lastUsedAt).getTime() || Date.now(),
      product: record.product,
      usageCount: record.usageCount,
    });
  });

  historyEntries.forEach((entry) => {
    const code = entry.product.code || entry.barcode;
    const existingRecord = candidates.get(code);

    if (existingRecord) {
      existingRecord.isFavorite = existingRecord.isFavorite || favoriteCodes.has(code);
      existingRecord.lastUsedAtMs = Math.max(
        existingRecord.lastUsedAtMs,
        new Date(entry.scannedAt).getTime() || 0
      );
      existingRecord.usageCount = Math.max(existingRecord.usageCount, entry.scanCount);
      return;
    }

    candidates.set(code, {
      code,
      isFavorite: favoriteCodes.has(code),
      lastUsedAtMs: new Date(entry.scannedAt).getTime() || Date.now(),
      product: entry.product,
      usageCount: entry.scanCount,
    });
  });

  const nextCandidates = [...candidates.values()];
  localSearchCandidatesCache = {
    candidates: nextCandidates,
    scopeId,
    storedAt: Date.now(),
  };

  return nextCandidates;
}

async function loadPersonalSection(query: string) {
  const candidates = await loadLocalSearchCandidates();
  const normalizedQuery = normalizeQuery(query).toLowerCase();

  const matchedCandidates = normalizedQuery
    ? candidates
        .map((candidate) => ({
          candidate,
          score: scoreLocalCandidate(candidate, normalizedQuery),
        }))
        .filter((item) => item.score > 0)
        .sort((left, right) => right.score - left.score)
        .slice(0, SEARCH_LOCAL_RESULTS_LIMIT)
        .map(({ candidate }) => candidate)
    : candidates
        .sort((left, right) => {
          if (left.isFavorite !== right.isFavorite) {
            return left.isFavorite ? -1 : 1;
          }

          if (right.usageCount !== left.usageCount) {
            return right.usageCount - left.usageCount;
          }

          return right.lastUsedAtMs - left.lastUsedAtMs;
        })
        .slice(0, SEARCH_LOCAL_RESULTS_LIMIT);

  if (matchedCandidates.length === 0) {
    return null;
  }

  return {
    id: 'personal' as const,
    results: dedupeProductHits(
      matchedCandidates.map((candidate) => ({
        id: `saved:${candidate.code}`,
        isFavorite: candidate.isFavorite,
        product: candidate.product,
        sourceLabel: 'saved',
        type: 'product',
      }))
    ),
    title: 'Your products',
  };
}

async function buildFirestoreSearchExperience(query: string): Promise<SearchExperience> {
  const normalizedQuery = normalizeQuery(query);
  const sections: SearchSection[] = [];
  const personalSection = await loadPersonalSection(normalizedQuery);

  if (!normalizedQuery) {
    const [recentQueries, productResults] = await Promise.all([
      loadRecentSearchQueries(),
      browseLegacySearchProducts(),
    ]);

    if (recentQueries.length > 0) {
      sections.push({
        id: 'suggestions',
        results: recentQueries.slice(0, SEARCH_RECENT_QUERIES_LIMIT).map((value, index) => ({
          id: `recent:${value}:${index}`,
          popularity: recentQueries.length - index,
          query: value,
          sourceLabel: 'recent',
          type: 'suggestion',
        })),
        title: 'Recent searches',
      });
    }

    if (personalSection) {
      sections.push(personalSection);
    } else if (productResults.length > 0) {
      sections.push({
        id: 'personal',
        results: productResults.map((result) => ({
          ...result,
          type: 'product' as const,
        })),
        title: 'Your products',
      });
    }

    return {
      query: normalizedQuery,
      sections,
      usedRemoteSearch: false,
    };
  }

  if (personalSection) {
    sections.push(personalSection);
  }

  if (normalizedQuery.length <= SEARCH_LOCAL_ONLY_QUERY_LENGTH) {
    return {
      query: normalizedQuery,
      sections,
      usedRemoteSearch: false,
    };
  }

  const productResults = await searchLegacyProducts(normalizedQuery);
  const personalCodes = new Set(
    (personalSection?.results || [])
      .filter((result): result is SearchProductHit => result.type === 'product')
      .map((result) => result.product.code || result.product.barcode)
  );
  const catalogResults = dedupeProductHits(
    productResults
      .filter((result) => result.sourceLabel === 'catalog')
      .filter((result) => !personalCodes.has(result.product.code || result.product.barcode))
      .slice(0, SEARCH_CATALOG_RESULTS_LIMIT)
      .map((result) => ({
        ...result,
        type: 'product' as const,
      }))
  );

  if (catalogResults.length > 0) {
    const orderedCatalogResults = SEARCH_NUMERIC_QUERY_PATTERN.test(normalizedQuery)
      ? [...catalogResults].sort((left, right) => {
          const leftExact =
            left.product.barcode === normalizedQuery || left.product.code === normalizedQuery;
          const rightExact =
            right.product.barcode === normalizedQuery ||
            right.product.code === normalizedQuery;

          if (leftExact !== rightExact) {
            return leftExact ? -1 : 1;
          }

          return 0;
        })
      : catalogResults;

    sections.push({
      id: 'catalog',
      results: orderedCatalogResults,
      title: 'Products',
    });
  }

  return {
    query: normalizedQuery,
    sections,
    usedRemoteSearch: normalizedQuery.length >= SEARCH_REMOTE_QUERY_LENGTH,
  };
}

export async function loadSearchExperience(query: string): Promise<SearchExperience> {
  const normalizedQuery = normalizeQuery(query);
  const cachedExperience = normalizedQuery ? readPrefixCache(normalizedQuery) : null;

  if (cachedExperience) {
    return cachedExperience;
  }
  const experience = await buildFirestoreSearchExperience(normalizedQuery);

  rememberPrefixCache(normalizedQuery, experience);
  return experience;
}

export async function loadBroaderCatalogResults(query: string) {
  const normalizedQuery = normalizeQuery(query);

  if (!normalizedQuery) {
    return [];
  }

  const results = await searchLegacyProducts(normalizedQuery);

  return results
    .filter((result) => result.sourceLabel === 'catalog')
    .map((result) => ({
      ...result,
      type: 'product' as const,
    }));
}
