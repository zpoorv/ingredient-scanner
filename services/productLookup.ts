import {
  fetchProductByBarcode,
  type OpenFoodFactsNutriments,
  type OpenFoodFactsProduct,
} from './openFoodFacts';
import {
  deriveProductNameFromCategories,
  deriveProductNameFromIngredients,
} from '../utils/productName';

export type ProductSourceStatus = 'used' | 'missed';

export type ProductSourceInfo = {
  id: 'open_food_facts' | 'ingredient_ocr';
  label: string;
  note: string;
  status: ProductSourceStatus;
};

export type ResolvedNutrition = {
  calories100g?: number | null;
  carbohydrates100g?: number | null;
  fat100g?: number | null;
  fiber100g?: number | null;
  potassium100g?: number | null;
  protein100g?: number | null;
  salt100g?: number | null;
  saturatedFat100g?: number | null;
  sodium100g?: number | null;
  sugar100g?: number | null;
};

export type ResolvedProduct = {
  additiveCount: number;
  additiveTags: string[];
  allergens: string[];
  barcode: string;
  brand: string | null;
  categories: string[];
  code: string;
  ecoScore: string | null;
  imageUrl: string | null;
  ingredientsImageUrl: string | null;
  ingredientsText: string | null;
  labels: string[];
  name: string;
  nameReason: string | null;
  novaGroup: number | null;
  nutrition: ResolvedNutrition;
  nutritionImageUrl: string | null;
  nutriScore: string | null;
  quantity: string | null;
  sources: ProductSourceInfo[];
};

export class ProductLookupError extends Error {
  kind: 'network' | 'service';

  constructor(kind: 'network' | 'service', message: string) {
    super(message);
    this.kind = kind;
    this.name = 'ProductLookupError';
  }
}

const resolvedProductCache = new Map<string, ResolvedProduct | null>();
const pendingProductLookups = new Map<string, Promise<ResolvedProduct | null>>();

function isNetworkError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const errorMessage = error.message.toLowerCase();

  return (
    error instanceof TypeError ||
    errorMessage.includes('network request failed') ||
    errorMessage.includes('failed to fetch') ||
    errorMessage.includes('fetch failed') ||
    errorMessage.includes('timed out')
  );
}

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

export async function resolveProductByBarcode(
  barcode: string,
  barcodeType?: string | null
): Promise<ResolvedProduct | null> {
  const cacheKey = `${barcodeType || 'unknown'}:${barcode}`;

  if (resolvedProductCache.has(cacheKey)) {
    return resolvedProductCache.get(cacheKey) ?? null;
  }

  const pendingLookup = pendingProductLookups.get(cacheKey);

  if (pendingLookup) {
    return pendingLookup;
  }

  // Keep repeat scans and quick back-and-forth navigation from hitting both
  // providers again for the same barcode during the same app session.
  const lookupPromise = performProductLookup(barcode, barcodeType);

  pendingProductLookups.set(cacheKey, lookupPromise);

  try {
    const resolvedProduct = await lookupPromise;

    resolvedProductCache.set(cacheKey, resolvedProduct);

    return resolvedProduct;
  } finally {
    pendingProductLookups.delete(cacheKey);
  }
}

async function performProductLookup(
  barcode: string,
  barcodeType?: string | null
): Promise<ResolvedProduct | null> {
  let offProduct: OpenFoodFactsProduct | null = null;
  let offError: unknown = null;

  try {
    offProduct = await fetchProductByBarcode(barcode, barcodeType);
  } catch (error) {
    offError = error;
  }

  if (!offProduct) {
    if (offError) {
      const kind = isNetworkError(offError) ? 'network' : 'service';

      throw new ProductLookupError(
        kind,
        kind === 'network'
          ? 'No internet connection. Turn internet back on and scan again.'
          : 'Product data could not be reached right now. Scan again in a moment.'
      );
    }

    return null;
  }

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
    quantity: offProduct?.quantity?.trim() || null,
    sources: buildSourceInfo(offProduct, offError),
  };
}
