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
