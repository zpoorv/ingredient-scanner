import type { ResolvedProduct } from '../types/product';

const FOOD_KEYWORDS = [
  'food',
  'drink',
  'beverage',
  'snack',
  'chips',
  'juice',
  'milk',
  'sauce',
  'mayonnaise',
  'mayo',
  'dip',
  'spread',
  'dressing',
  'chutney',
  'pickle',
  'ketchup',
  'biscuits',
  'cookie',
  'candy',
  'chocolate',
  'rice',
  'bread',
  'noodle',
  'tea',
  'coffee',
  'water',
  'spice',
  'seasoning',
  'flour',
  'oil',
  'yogurt',
  'cheese',
  'fruit',
  'vegetable',
];

const NON_FOOD_KEYWORDS = [
  'lighter',
  'battery',
  'cleaner',
  'detergent',
  'soap',
  'shampoo',
  'conditioner',
  'toothpaste',
  'cosmetic',
  'perfume',
  'deodorant',
  'candle',
  'incense',
  'paint',
  'glue',
  'plastic',
  'stationery',
  'toy',
  'fabric',
  'hardware',
  'furniture',
  'cleaning',
];

function hasKeywordMatch(value: string, keywords: string[]) {
  return keywords.some((keyword) => value.includes(keyword));
}

function hasNutritionSignal(product: ResolvedProduct) {
  return Object.values(product.nutrition).some(
    (value) => value !== null && value !== undefined
  );
}

export function isLikelyFoodProduct(product: ResolvedProduct) {
  const searchableText = [
    product.name,
    product.brand,
    product.ingredientsText,
    ...product.categories,
    ...product.labels,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (hasKeywordMatch(searchableText, NON_FOOD_KEYWORDS)) {
    return false;
  }

  if (hasNutritionSignal(product)) {
    return true;
  }

  if (product.additiveCount > 0 || (product.ingredientsText || '').trim()) {
    return true;
  }

  return hasKeywordMatch(searchableText, FOOD_KEYWORDS);
}
