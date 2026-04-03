import type { HouseholdFitResult } from '../models/householdFit';
import type { ResolvedProduct } from '../types/product';
import { loadSavedProductCollections } from './favoriteProductsService';
import {
  loadUsualBuyProducts,
  searchCommonProducts,
  type CommonProductRecord,
} from './commonProductStorage';
import { searchResolvedProducts } from './productLookup';

export type ProductSearchResult = {
  householdFit?: HouseholdFitResult | null;
  id: string;
  isFavorite: boolean;
  product: ResolvedProduct;
  sourceLabel: 'catalog' | 'saved';
};

function toSearchResult(
  record: CommonProductRecord | ResolvedProduct,
  favoriteCodes: string[],
  sourceLabel: 'catalog' | 'saved'
): ProductSearchResult {
  const product = 'product' in record ? record.product : record;
  const code = product.code || product.barcode;

  return {
    id: `${sourceLabel}:${code}`,
    isFavorite: favoriteCodes.includes(code),
    product,
    sourceLabel,
  };
}

function dedupeSearchResults(results: ProductSearchResult[]) {
  const seenCodes = new Set<string>();

  return results.filter((result) => {
    const code = result.product.code || result.product.barcode;

    if (seenCodes.has(code)) {
      return false;
    }

    seenCodes.add(code);
    return true;
  });
}

export async function browseSearchProducts() {
  const [usualBuys, savedCollections] = await Promise.all([
    loadUsualBuyProducts(),
    loadSavedProductCollections(),
  ]);

  return dedupeSearchResults(
    usualBuys.map((record) =>
      toSearchResult(record, savedCollections.favoriteProductCodes, 'saved')
    )
  );
}

export async function searchProducts(query: string) {
  const normalizedQuery = query.trim();
  const [savedCollections, localResults] = await Promise.all([
    loadSavedProductCollections(),
    searchCommonProducts(normalizedQuery),
  ]);

  if (!normalizedQuery) {
    return dedupeSearchResults(
      localResults.map((record) =>
        toSearchResult(record, savedCollections.favoriteProductCodes, 'saved')
      )
    );
  }

  let remoteResults: ResolvedProduct[] = [];

  try {
    remoteResults = await searchResolvedProducts(normalizedQuery);
  } catch {
    remoteResults = [];
  }

  return dedupeSearchResults([
    ...localResults.map((record) =>
      toSearchResult(record, savedCollections.favoriteProductCodes, 'saved')
    ),
    ...remoteResults.map((product) =>
      toSearchResult(product, savedCollections.favoriteProductCodes, 'catalog')
    ),
  ]);
}
