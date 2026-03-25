import { OPEN_FOOD_FACTS_BASE_URL } from '../constants/api';
import type { OpenFoodFactsProduct } from '../types/product';
import { createBarcodeLookupCandidates } from '../utils/barcode';
import { fetchJsonWithTimeout } from './http';

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
