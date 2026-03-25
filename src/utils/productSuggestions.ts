import {
  DEFAULT_DIET_PROFILE_ID,
  type DietProfileId,
} from '../constants/dietProfiles';
import type { ResolvedProduct } from '../types/product';
import type { ProductInsights } from './productInsights';
import { analyzeProduct } from './productInsights';
import { isLikelyFoodProduct } from './productType';

export type ProductSuggestion = {
  description: string;
  id: string;
  issue: string;
  title: string;
};

export type ProductSuggestionContext = {
  insights: ProductInsights;
  product: ResolvedProduct;
  profileId: DietProfileId;
};

export type ProductSuggestionProvider = {
  getSuggestions: (context: ProductSuggestionContext) => ProductSuggestion[];
};

function hasIngredientWarning(product: ResolvedProduct, patterns: string[]) {
  const ingredientText = (product.ingredientsText || '').toLowerCase();
  const additiveTags = product.additiveTags.map((tag) => tag.toLowerCase());

  return (
    patterns.some((pattern) => ingredientText.includes(pattern)) ||
    additiveTags.some((tag) => patterns.some((pattern) => tag.includes(pattern)))
  );
}

function buildRuleBasedSuggestions({
  insights,
  product,
}: ProductSuggestionContext): ProductSuggestion[] {
  const suggestions: ProductSuggestion[] = [];
  const saltValue = product.nutrition.salt100g ?? null;
  const sugarValue = product.nutrition.sugar100g ?? null;
  const saturatedFatValue = product.nutrition.saturatedFat100g ?? null;
  const additiveHeavy = product.additiveCount >= 3;
  const highlyProcessed =
    product.novaGroup === 4 ||
    insights.cautions.some((caution) =>
      /ultra-processed|highly processed/i.test(caution)
    );
  const emulsifierOrPreservativeDetected = hasIngredientWarning(product, [
    'emulsifier',
    'stabilizer',
    'stabiliser',
    'preservative',
    'benzoate',
    'sorbate',
    'xanthan gum',
    'guar gum',
    'lecithin',
  ]);

  if (sugarValue !== null && sugarValue > 15) {
    suggestions.push({
      id: 'lower-sugar-swap',
      issue: 'high sugar',
      title: 'Look for a lower-sugar version',
      description:
        'Compare with an option in the same category that has less sugar per 100g and fewer sweeteners.',
    });
  }

  if (saltValue !== null && saltValue > 1.5) {
    suggestions.push({
      id: 'lower-sodium-swap',
      issue: 'high sodium',
      title: 'Choose a lower-sodium option',
      description:
        'A version with less salt per 100g can be a better everyday pick, especially for sauces, snacks, and ready foods.',
    });
  }

  if (additiveHeavy || emulsifierOrPreservativeDetected) {
    suggestions.push({
      id: 'simpler-ingredients',
      issue: 'too many additives',
      title: 'Pick a simpler ingredient product',
      description:
        'Look for a shorter ingredient list with fewer additives, emulsifiers, and preservatives.',
    });
  }

  if (highlyProcessed) {
    suggestions.push({
      id: 'less-processed-swap',
      issue: 'high processing',
      title: 'Try a less processed alternative',
      description:
        'A product with more familiar ingredients and fewer industrial add-ons will usually score better.',
    });
  }

  if (saturatedFatValue !== null && saturatedFatValue > 5) {
    suggestions.push({
      id: 'lower-saturated-fat',
      issue: 'high saturated fat',
      title: 'Compare with a lighter-fat alternative',
      description:
        'A version with lower saturated fat can be a more balanced choice for regular use.',
    });
  }

  if (
    suggestions.length < 2 &&
    (product.ingredientsText || '').split(',').filter(Boolean).length >= 12
  ) {
    suggestions.push({
      id: 'shorter-list',
      issue: 'long ingredient list',
      title: 'Prefer a shorter ingredient list',
      description:
        'When two products are similar, the one with fewer ingredients is often the easier one to understand and compare.',
    });
  }

  if (suggestions.length < 2 && (product.nutrition.fiber100g ?? 0) < 3) {
    suggestions.push({
      id: 'more-fiber',
      issue: 'low fiber',
      title: 'Check for a higher-fiber alternative',
      description:
        'A higher-fiber option can be a better swap when you are comparing products in the same aisle.',
    });
  }

  return suggestions.slice(0, 3);
}

export const ruleBasedProductSuggestionProvider: ProductSuggestionProvider = {
  getSuggestions: buildRuleBasedSuggestions,
};

export function getAlternativeProductSuggestions(
  product: ResolvedProduct,
  profileId: DietProfileId = DEFAULT_DIET_PROFILE_ID,
  insights: ProductInsights = analyzeProduct(product, profileId),
  provider: ProductSuggestionProvider = ruleBasedProductSuggestionProvider
) {
  if (!isLikelyFoodProduct(product)) {
    return [];
  }

  if (insights.smartScore === null || insights.smartScore >= 58) {
    return [];
  }

  return provider.getSuggestions({
    insights,
    product,
    profileId,
  });
}
