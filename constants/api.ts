const runtimeProcess = globalThis as {
  process?: {
    env?: Record<string, string | undefined>;
  };
};

export const OPEN_FOOD_FACTS_BASE_URL =
  'https://world.openfoodfacts.org/api/v2';
export const FOOD_DATA_CENTRAL_BASE_URL = 'https://api.nal.usda.gov/fdc/v1';
export const FOOD_DATA_CENTRAL_API_KEY =
  runtimeProcess.process?.env?.EXPO_PUBLIC_USDA_API_KEY?.trim() || '';
export const PRODUCT_API_TIMEOUT_MS = 8000;
