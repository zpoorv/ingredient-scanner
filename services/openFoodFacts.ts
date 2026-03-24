import { OPEN_FOOD_FACTS_BASE_URL } from '../constants/api';
import { createBarcodeLookupCandidates } from '../utils/barcode';
import { fetchJsonWithTimeout } from './http';

export type OpenFoodFactsNutriments = {
  'energy-kcal_100g'?: number;
  carbohydrates_100g?: number;
  energy_100g?: number;
  fat_100g?: number;
  fiber_100g?: number;
  potassium_100g?: number;
  proteins_100g?: number;
  salt_100g?: number;
  'saturated-fat_100g'?: number;
  sodium_100g?: number;
  sugars_100g?: number;
};

export type OpenFoodFactsProduct = {
  additives_n?: number;
  additives_tags?: string[];
  allergens?: string;
  allergens_from_ingredients?: string;
  allergens_tags?: string[];
  brands?: string;
  categories?: string;
  categories_tags?: string[];
  code?: string;
  ecoscore_grade?: string;
  generic_name?: string;
  generic_name_en?: string;
  image_front_small_url?: string;
  image_front_url?: string;
  image_ingredients_url?: string;
  image_nutrition_url?: string;
  ingredients_text?: string;
  ingredients_text_en?: string;
  labels?: string;
  labels_tags?: string[];
  nova_group?: number;
  nova_groups?: string;
  nutriscore_grade?: string;
  nutriments?: OpenFoodFactsNutriments;
  nutrition_grades?: string;
  product_name?: string;
  product_name_en?: string;
  quantity?: string;
};

type OpenFoodFactsResponse = {
  product?: OpenFoodFactsProduct;
  status: number;
};

const PRODUCT_FIELDS = [
  'additives_n',
  'additives_tags',
  'allergens',
  'allergens_from_ingredients',
  'allergens_tags',
  'brands',
  'categories',
  'categories_tags',
  'code',
  'ecoscore_grade',
  'generic_name',
  'generic_name_en',
  'image_front_small_url',
  'image_front_url',
  'image_ingredients_url',
  'image_nutrition_url',
  'ingredients_text',
  'ingredients_text_en',
  'labels',
  'labels_tags',
  'nova_group',
  'nova_groups',
  'nutriscore_grade',
  'nutriments',
  'nutrition_grades',
  'product_name',
  'product_name_en',
  'quantity',
].join(',');

export async function fetchProductByBarcode(
  barcode: string,
  barcodeType?: string | null
): Promise<OpenFoodFactsProduct | null> {
  const barcodeCandidates = createBarcodeLookupCandidates(barcode, barcodeType);

  for (const barcodeCandidate of barcodeCandidates) {
    const payload = await fetchJsonWithTimeout<OpenFoodFactsResponse>(
      `${OPEN_FOOD_FACTS_BASE_URL}/product/${encodeURIComponent(barcodeCandidate)}.json?fields=${PRODUCT_FIELDS}`
    );

    // Open Food Facts returns status 0 when the product is not in the catalog yet.
    if (payload.status === 1 && payload.product) {
      return payload.product;
    }
  }

  return null;
}
