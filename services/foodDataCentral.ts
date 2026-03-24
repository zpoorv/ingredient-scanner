import {
  FOOD_DATA_CENTRAL_API_KEY,
  FOOD_DATA_CENTRAL_BASE_URL,
} from '../constants/api';
import {
  createBarcodeLookupCandidates,
  normalizeBarcode,
} from '../utils/barcode';
import { fetchJsonWithTimeout } from './http';

export type FoodDataCentralFoodNutrient = {
  nutrientName: string;
  nutrientNumber?: string;
  unitName?: string;
  value?: number;
};

export type FoodDataCentralFood = {
  brandName?: string;
  brandOwner?: string;
  description?: string;
  foodCategory?: string;
  foodNutrients?: FoodDataCentralFoodNutrient[];
  gtinUpc?: string;
  ingredients?: string;
  packageWeight?: string;
  servingSize?: number;
  servingSizeUnit?: string;
};

type FoodDataCentralSearchResponse = {
  foods?: FoodDataCentralFood[];
};

function normalizeCandidate(value?: string | null) {
  if (!value) {
    return null;
  }

  const digits = normalizeBarcode(value);
  const withoutLeadingZeros = digits.replace(/^0+/, '');

  return withoutLeadingZeros || digits;
}

function matchesBarcodeCandidate(
  gtinUpc: string | undefined,
  barcodeCandidates: Set<string>
) {
  const normalizedValue = normalizeCandidate(gtinUpc);

  if (!normalizedValue) {
    return false;
  }

  return barcodeCandidates.has(normalizedValue);
}

function buildSearchUrl(query: string) {
  return (
    `${FOOD_DATA_CENTRAL_BASE_URL}/foods/search?` +
    `api_key=${encodeURIComponent(FOOD_DATA_CENTRAL_API_KEY)}` +
    `&query=${encodeURIComponent(query)}` +
    '&dataType=Branded&pageSize=10'
  );
}

async function searchFoodDataCentral(query: string) {
  const payload = await fetchJsonWithTimeout<FoodDataCentralSearchResponse>(
    buildSearchUrl(query)
  );

  return payload.foods || [];
}

export function isFoodDataCentralConfigured() {
  return Boolean(FOOD_DATA_CENTRAL_API_KEY);
}

export async function fetchFoodDataCentralByBarcode(
  barcode: string,
  barcodeType?: string | null,
  nameCandidates: string[] = []
): Promise<FoodDataCentralFood | null> {
  if (!isFoodDataCentralConfigured()) {
    return null;
  }

  const normalizedCandidates = new Set(
    createBarcodeLookupCandidates(barcode, barcodeType)
      .map((candidate) => normalizeCandidate(candidate))
      .filter(Boolean) as string[]
  );
  const queries = Array.from(
    new Set([barcode, ...nameCandidates.map((value) => value.trim()).filter(Boolean)])
  ).slice(0, 3);

  for (const query of queries) {
    const foods = await searchFoodDataCentral(query);
    const exactBarcodeMatch = foods.find((food) =>
      matchesBarcodeCandidate(food.gtinUpc, normalizedCandidates)
    );

    if (exactBarcodeMatch) {
      return exactBarcodeMatch;
    }
  }

  return null;
}
