import {
  fetchFoodDataCentralByBarcode,
  isFoodDataCentralConfigured,
  type FoodDataCentralFood,
  type FoodDataCentralFoodNutrient,
} from './foodDataCentral';
import {
  fetchProductByBarcode,
  type OpenFoodFactsNutriments,
  type OpenFoodFactsProduct,
} from './openFoodFacts';
import {
  deriveProductNameFromCategories,
  deriveProductNameFromIngredients,
} from '../utils/productName';

export type ProductSourceStatus = 'used' | 'missed' | 'optional';

export type ProductSourceInfo = {
  id: 'open_food_facts' | 'food_data_central';
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

function uniqueValues(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter(Boolean).map((value) => value!.trim())));
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

function extractFdcNutrientValue(
  nutrients: FoodDataCentralFoodNutrient[] | undefined,
  nutrientNames: string[]
) {
  const matchingNutrient = nutrients?.find((nutrient) =>
    nutrientNames.includes(nutrient.nutrientName)
  );

  return matchingNutrient?.value ?? null;
}

function extractNutritionFromFoodDataCentral(
  product: FoodDataCentralFood | null
): ResolvedNutrition {
  if (!product?.foodNutrients?.length) {
    return {};
  }

  return {
    calories100g: extractFdcNutrientValue(product.foodNutrients, ['Energy']),
    carbohydrates100g: extractFdcNutrientValue(product.foodNutrients, [
      'Carbohydrate, by difference',
    ]),
    fat100g: extractFdcNutrientValue(product.foodNutrients, [
      'Total lipid (fat)',
    ]),
    fiber100g: extractFdcNutrientValue(product.foodNutrients, [
      'Fiber, total dietary',
    ]),
    protein100g: extractFdcNutrientValue(product.foodNutrients, ['Protein']),
    saturatedFat100g: extractFdcNutrientValue(product.foodNutrients, [
      'Fatty acids, total saturated',
    ]),
    sodium100g: extractFdcNutrientValue(product.foodNutrients, ['Sodium, Na']),
    sugar100g: extractFdcNutrientValue(product.foodNutrients, ['Total Sugars']),
  };
}

function mergeNutrition(
  primaryNutrition: ResolvedNutrition,
  secondaryNutrition: ResolvedNutrition
): ResolvedNutrition {
  return {
    calories100g: primaryNutrition.calories100g ?? secondaryNutrition.calories100g,
    carbohydrates100g:
      primaryNutrition.carbohydrates100g ?? secondaryNutrition.carbohydrates100g,
    fat100g: primaryNutrition.fat100g ?? secondaryNutrition.fat100g,
    fiber100g: primaryNutrition.fiber100g ?? secondaryNutrition.fiber100g,
    potassium100g:
      primaryNutrition.potassium100g ?? secondaryNutrition.potassium100g,
    protein100g: primaryNutrition.protein100g ?? secondaryNutrition.protein100g,
    salt100g: primaryNutrition.salt100g ?? secondaryNutrition.salt100g,
    saturatedFat100g:
      primaryNutrition.saturatedFat100g ?? secondaryNutrition.saturatedFat100g,
    sodium100g: primaryNutrition.sodium100g ?? secondaryNutrition.sodium100g,
    sugar100g: primaryNutrition.sugar100g ?? secondaryNutrition.sugar100g,
  };
}

function resolveDisplayName(
  barcode: string,
  offProduct: OpenFoodFactsProduct | null,
  fdcProduct: FoodDataCentralFood | null
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

  if (fdcProduct?.description?.trim()) {
    return {
      name: fdcProduct.description.trim(),
      reason: 'Name enriched from USDA FoodData Central.',
    };
  }

  return {
    name: `Catalog entry ${offProduct?.code?.trim() || barcode}`,
    reason: 'Open Food Facts does not provide a reliable product name for this barcode yet.',
  };
}

function resolveCategories(offProduct: OpenFoodFactsProduct | null, fdcProduct: FoodDataCentralFood | null) {
  const offCategories = splitCommaSeparatedValues(offProduct?.categories);

  if (offCategories.length > 0) {
    return offCategories;
  }

  const offCategoryTags = offProduct?.categories_tags?.map(humanizeTag) || [];

  if (offCategoryTags.length > 0) {
    return offCategoryTags;
  }

  return fdcProduct?.foodCategory ? [fdcProduct.foodCategory] : [];
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
  offError: unknown,
  fdcProduct: FoodDataCentralFood | null,
  _fdcError: unknown
): ProductSourceInfo[] {
  const sources: ProductSourceInfo[] = [
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

  if (fdcProduct) {
    sources.push({
      id: 'food_data_central',
      label: 'USDA FoodData Central',
      note: 'Used as a secondary source to enrich brand or nutrition data when an exact GTIN match exists.',
      status: 'used',
    });
  }

  return sources;
}

function buildNameCandidates(offProduct: OpenFoodFactsProduct | null) {
  return uniqueValues([
    offProduct?.product_name,
    offProduct?.product_name_en,
    offProduct?.generic_name,
    offProduct?.generic_name_en,
    deriveProductNameFromCategories(
      offProduct?.categories || offProduct?.categories_tags
    ),
    deriveProductNameFromIngredients(
      offProduct?.ingredients_text || offProduct?.ingredients_text_en
    ),
  ]);
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

  let fdcProduct: FoodDataCentralFood | null = null;
  let fdcError: unknown = null;

  try {
    fdcProduct = await fetchFoodDataCentralByBarcode(
      barcode,
      barcodeType,
      buildNameCandidates(offProduct)
    );
  } catch (error) {
    fdcError = error;
  }

  if (!offProduct && !fdcProduct) {
    if (offError || fdcError) {
      const lookupError = offError || fdcError;
      const kind = isNetworkError(lookupError) ? 'network' : 'service';

      throw new ProductLookupError(
        kind,
        kind === 'network'
          ? 'No internet connection. Turn internet back on and tap Retry Lookup.'
          : 'Product data providers are not reachable right now. Tap Retry Lookup in a moment.'
      );
    }

    return null;
  }

  const { name, reason } = resolveDisplayName(barcode, offProduct, fdcProduct);
  const primaryNutrition = extractNutritionFromOpenFoodFacts(offProduct?.nutriments);
  const fallbackNutrition = extractNutritionFromFoodDataCentral(fdcProduct);

  return {
    additiveCount: offProduct?.additives_n || 0,
    additiveTags: offProduct?.additives_tags?.map(humanizeTag) || [],
    allergens: resolveAllergens(offProduct),
    barcode,
    brand:
      offProduct?.brands?.trim() ||
      fdcProduct?.brandOwner?.trim() ||
      fdcProduct?.brandName?.trim() ||
      null,
    categories: resolveCategories(offProduct, fdcProduct),
    code: offProduct?.code?.trim() || fdcProduct?.gtinUpc?.trim() || barcode,
    ecoScore: normalizeGrade(offProduct?.ecoscore_grade),
    imageUrl:
      offProduct?.image_front_url || offProduct?.image_front_small_url || null,
    ingredientsImageUrl: offProduct?.image_ingredients_url || null,
    ingredientsText:
      offProduct?.ingredients_text?.trim() ||
      offProduct?.ingredients_text_en?.trim() ||
      fdcProduct?.ingredients?.trim() ||
      null,
    labels: resolveLabels(offProduct),
    name,
    nameReason: reason,
    novaGroup: offProduct?.nova_group ?? null,
    nutrition: mergeNutrition(primaryNutrition, fallbackNutrition),
    nutritionImageUrl: offProduct?.image_nutrition_url || null,
    nutriScore: normalizeGrade(
      offProduct?.nutriscore_grade || offProduct?.nutrition_grades
    ),
    quantity:
      offProduct?.quantity?.trim() ||
      fdcProduct?.packageWeight?.trim() ||
      (fdcProduct?.servingSize && fdcProduct?.servingSizeUnit
        ? `${fdcProduct.servingSize} ${fdcProduct.servingSizeUnit}`
        : null),
    sources: buildSourceInfo(offProduct, offError, fdcProduct, fdcError),
  };
}
