import { OPEN_FOOD_FACTS_BASE_URL } from '../constants/api';

export type OpenFoodFactsProduct = {
  code?: string;
  ingredients_text?: string;
  nutriscore_grade?: string;
  product_name?: string;
};

type OpenFoodFactsResponse = {
  product?: OpenFoodFactsProduct;
  status: number;
};

export async function fetchProductByBarcode(
  barcode: string
): Promise<OpenFoodFactsProduct | null> {
  const response = await fetch(
    `${OPEN_FOOD_FACTS_BASE_URL}/product/${barcode}.json`
  );

  if (!response.ok) {
    throw new Error('Unable to fetch product details right now.');
  }

  const payload = (await response.json()) as OpenFoodFactsResponse;

  // Open Food Facts returns status 0 when the product is not in the catalog yet.
  if (payload.status === 0 || !payload.product) {
    return null;
  }

  return payload.product;
}
