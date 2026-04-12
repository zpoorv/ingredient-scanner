import {
  fetchProductByBarcode,
} from './openFoodFacts';
import type {
  OpenFoodFactsNutriments,
  OpenFoodFactsProduct,
  ProductSourceInfo,
  ResolvedNutrition,
  ResolvedProduct,
} from '../types/product';
import {
  deriveProductNameFromCategories,
  deriveProductNameFromIngredients,
} from '../utils/productName';
import {
  readBarcodeLookupCache,
  writeBarcodeLookupCache,
} from './barcodeLookupCache';
import {
  applyProductOverride,
  loadProductOverride,
} from './productOverrideService';
import {
  hasStoredCoreProductFields,
  saveScannedProductRecord,
  searchStoredProductRecords,
} from './productCatalogService';
import { loadCommonProductByBarcode } from './commonProductStorage';
import { isLikelyNetworkError } from '../utils/networkErrors';

export class ProductLookupError extends Error {
  kind: 'network' | 'service';

  constructor(kind: 'network' | 'service', message: string) {
    super(message);
    this.kind = kind;
    this.name = 'ProductLookupError';
  }
}

function isStoredScanRecord(record: { sourceType?: string | null } | null | undefined) {
  return record?.sourceType === 'scan';
}

const resolvedProductCache = new Map<string, ResolvedProduct | null>();
const pendingProductLookups = new Map<string, Promise<ResolvedProduct | null>>();

function toTitleCase(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function splitCommaSeparatedValues(value?: string | null) {
  if (!value?.trim()) {
    return [];
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function humanizeTag(tag: string) {
  const normalizedTag = tag.includes(':') ? tag.split(':').pop() || tag : tag;

  return toTitleCase(normalizedTag.replace(/-/g, ' '));
}

function normalizeGrade(grade?: string | null) {
  if (!grade?.trim()) {
    return null;
  }

  if (grade.toLowerCase() === 'unknown') {
    return 'Unknown';
  }

  return grade.toUpperCase();
}

function extractNutritionFromOpenFoodFacts(
  nutriments?: OpenFoodFactsNutriments
): ResolvedNutrition {
  if (!nutriments) {
    return {};
  }

  return {
    calories100g: nutriments['energy-kcal_100g'] ?? null,
    carbohydrates100g: nutriments.carbohydrates_100g ?? null,
    fat100g: nutriments.fat_100g ?? null,
    fiber100g: nutriments.fiber_100g ?? null,
    potassium100g: nutriments.potassium_100g ?? null,
    protein100g: nutriments.proteins_100g ?? null,
    salt100g: nutriments.salt_100g ?? null,
    saturatedFat100g: nutriments['saturated-fat_100g'] ?? null,
    sodium100g: nutriments.sodium_100g ?? null,
    sugar100g: nutriments.sugars_100g ?? null,
  };
}

function resolveDisplayName(
  barcode: string,
  offProduct: OpenFoodFactsProduct | null
) {
  const officialName =
    offProduct?.product_name?.trim() ||
    offProduct?.product_name_en?.trim() ||
    offProduct?.generic_name?.trim() ||
    offProduct?.generic_name_en?.trim();

  if (officialName) {
    return {
      name: officialName,
      reason: null,
    };
  }

  const categoryName = deriveProductNameFromCategories(
    offProduct?.categories || offProduct?.categories_tags
  );

  if (categoryName) {
    return {
      name: categoryName,
      reason: 'Name inferred from Open Food Facts category data.',
    };
  }

  const ingredientsName = deriveProductNameFromIngredients(
    offProduct?.ingredients_text || offProduct?.ingredients_text_en
  );

  if (ingredientsName) {
    return {
      name: ingredientsName,
      reason: 'Name inferred from the ingredient text because the catalog entry is sparse.',
    };
  }

  return {
    name: `Catalog entry ${offProduct?.code?.trim() || barcode}`,
    reason: 'Open Food Facts does not provide a reliable product name for this barcode yet.',
  };
}

function resolveCategories(offProduct: OpenFoodFactsProduct | null) {
  const offCategories = splitCommaSeparatedValues(offProduct?.categories);

  if (offCategories.length > 0) {
    return offCategories;
  }

  const offCategoryTags = offProduct?.categories_tags?.map(humanizeTag) || [];

  if (offCategoryTags.length > 0) {
    return offCategoryTags;
  }

  return [];
}

function resolveLabels(offProduct: OpenFoodFactsProduct | null) {
  const labels = splitCommaSeparatedValues(offProduct?.labels);

  if (labels.length > 0) {
    return labels;
  }

  return offProduct?.labels_tags?.map(humanizeTag) || [];
}

function resolveOrigins(offProduct: OpenFoodFactsProduct | null) {
  const origins = splitCommaSeparatedValues(offProduct?.origins);

  if (origins.length > 0) {
    return origins;
  }

  return offProduct?.origins_tags?.map(humanizeTag) || [];
}

function resolvePackagingDetails(offProduct: OpenFoodFactsProduct | null) {
  const packagingDetails = splitCommaSeparatedValues(offProduct?.packaging);

  if (packagingDetails.length > 0) {
    return packagingDetails;
  }

  return offProduct?.packaging_tags?.map(humanizeTag) || [];
}

function resolveAllergens(offProduct: OpenFoodFactsProduct | null) {
  const allergens = splitCommaSeparatedValues(
    offProduct?.allergens_from_ingredients || offProduct?.allergens
  );

  if (allergens.length > 0) {
    return allergens;
  }

  return offProduct?.allergens_tags?.map(humanizeTag) || [];
}

function buildSourceInfo(
  offProduct: OpenFoodFactsProduct | null,
  offError: unknown
): ProductSourceInfo[] {
  return [
    {
      id: 'open_food_facts',
      label: 'Open Food Facts',
      note: offProduct
        ? 'Primary community product catalog used for barcode lookup, ingredients, and product images.'
        : offError
          ? 'The primary catalog could not be reached during this lookup.'
          : 'No Open Food Facts entry was found for this barcode.',
      status: offProduct ? 'used' : 'missed',
    },
  ];
}

function withOfflineFallbackSource(
  product: ResolvedProduct,
  note: string
): ResolvedProduct {
  return {
    ...product,
    sources: [
      {
        id: 'offline_cache',
        label: 'Saved product copy',
        note,
        status: 'used',
      },
      ...product.sources.map((source) => {
        const status: ProductSourceInfo['status'] =
          source.id === 'offline_cache' ? 'used' : 'missed';

        return {
          ...source,
          status,
        };
      }),
    ],
  };
}

export function resolveProductFromCatalogProduct(
  barcode: string,
  offProduct: OpenFoodFactsProduct
): ResolvedProduct {
  const { name, reason } = resolveDisplayName(barcode, offProduct);
  const nutrition = extractNutritionFromOpenFoodFacts(offProduct?.nutriments);

  return {
    additiveCount: offProduct?.additives_n || 0,
    additiveTags: offProduct?.additives_tags?.map(humanizeTag) || [],
    allergens: resolveAllergens(offProduct),
    barcode,
    brand: offProduct?.brands?.trim() || null,
    categories: resolveCategories(offProduct),
    code: offProduct?.code?.trim() || barcode,
    ecoScore: normalizeGrade(offProduct?.ecoscore_grade),
    imageUrl:
      offProduct?.image_front_url || offProduct?.image_front_small_url || null,
    ingredientsImageUrl: offProduct?.image_ingredients_url || null,
    ingredientsText:
      offProduct?.ingredients_text?.trim() ||
      offProduct?.ingredients_text_en?.trim() ||
      null,
    labels: resolveLabels(offProduct),
    name,
    nameReason: reason,
    novaGroup: offProduct?.nova_group ?? null,
    nutrition,
    nutritionImageUrl: offProduct?.image_nutrition_url || null,
    nutriScore: normalizeGrade(
      offProduct?.nutriscore_grade || offProduct?.nutrition_grades
    ),
    origins: resolveOrigins(offProduct),
    packagingDetails: resolvePackagingDetails(offProduct),
    quantity: offProduct?.quantity?.trim() || null,
    recipe: null,
    sources: buildSourceInfo(offProduct, null),
  };
}

export async function resolveProductByBarcode(
  barcode: string,
  barcodeType?: string | null
): Promise<ResolvedProduct | null> {
  const cacheKey = `${barcodeType || 'unknown'}:${barcode}`;
  const storedProductRecord = await loadProductOverride(barcode);

  if (resolvedProductCache.has(cacheKey)) {
    return applyProductOverride(resolvedProductCache.get(cacheKey) ?? null, storedProductRecord);
  }

  const pendingLookup = pendingProductLookups.get(cacheKey);

  if (pendingLookup) {
    return applyProductOverride(await pendingLookup, storedProductRecord);
  }

  const persistedCacheValue = await readBarcodeLookupCache(cacheKey);

  if (persistedCacheValue !== undefined) {
    resolvedProductCache.set(cacheKey, persistedCacheValue);
    return applyProductOverride(persistedCacheValue, storedProductRecord);
  }

  // Scan-seeded records already came from Open Food Facts, so they can act as a
  // fast local copy. Admin-managed records stay field-level overrides and should
  // still merge on top of a fresh Open Food Facts lookup when available.
  if (
    storedProductRecord &&
    isStoredScanRecord(storedProductRecord) &&
    hasStoredCoreProductFields(storedProductRecord)
  ) {
    const storedProduct = applyProductOverride(null, storedProductRecord);

    resolvedProductCache.set(cacheKey, storedProduct);
    void writeBarcodeLookupCache(cacheKey, storedProduct);

    return storedProduct;
  }

  // Keep repeat scans and quick back-and-forth navigation from hitting both
  // providers again for the same barcode during the same app session.
  const lookupPromise = performProductLookup(barcode, barcodeType, storedProductRecord);

  pendingProductLookups.set(cacheKey, lookupPromise);

  try {
    const resolvedProduct = await lookupPromise;

    resolvedProductCache.set(cacheKey, resolvedProduct);
    void writeBarcodeLookupCache(cacheKey, resolvedProduct);

    return applyProductOverride(resolvedProduct, storedProductRecord);
  } finally {
    pendingProductLookups.delete(cacheKey);
  }
}

async function performProductLookup(
  barcode: string,
  barcodeType?: string | null,
  storedProductRecord: Awaited<ReturnType<typeof loadProductOverride>> = null
): Promise<ResolvedProduct | null> {
  const commonFallback = await loadCommonProductByBarcode(barcode);
  let offProduct: OpenFoodFactsProduct | null = null;
  let offError: unknown = null;

  try {
    offProduct = await fetchProductByBarcode(barcode, barcodeType);
  } catch (error) {
    offError = error;
  }

  if (!offProduct) {
    if (storedProductRecord && hasStoredCoreProductFields(storedProductRecord)) {
      return applyProductOverride(null, storedProductRecord);
    }

    if (commonFallback) {
      return withOfflineFallbackSource(
        commonFallback.product,
        offError
          ? 'Loaded from your saved product copy because the live catalog could not be reached.'
          : 'Loaded from your saved product copy because this barcode was not available in the live catalog.'
      );
    }

    if (offError) {
      const kind = isLikelyNetworkError(offError) ? 'network' : 'service';

      throw new ProductLookupError(
        kind,
        kind === 'network'
          ? 'No internet connection. Turn internet back on and scan again.'
          : 'Product data could not be reached right now. Scan again in a moment.'
      );
    }

    return null;
  }

  const resolvedProduct = resolveProductFromCatalogProduct(barcode, offProduct);
  void saveScannedProductRecord(barcode, resolvedProduct);
  return resolvedProduct;
}

export async function searchResolvedProducts(query: string) {
  const products = await searchStoredProductRecords(query);

  return products
    .map((product) => applyProductOverride(null, product))
    .filter((product): product is ResolvedProduct => Boolean(product));
}
