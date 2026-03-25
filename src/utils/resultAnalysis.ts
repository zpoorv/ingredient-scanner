import {
  DEFAULT_DIET_PROFILE_ID,
  type DietProfileId,
} from '../constants/dietProfiles';
import type { ResolvedProduct } from '../types/product';
import {
  explainIngredient,
  type IngredientExplanationLookup,
} from './ingredientExplanations';
import {
  highlightIngredients,
  type HighlightedIngredient,
} from './ingredientHighlighting';
import { analyzeProduct, type ProductInsights } from './productInsights';
import {
  getAlternativeProductSuggestions,
  type ProductSuggestion,
} from './productSuggestions';
import {
  buildShareableResultData,
  type ShareableResultData,
} from './shareableResult';

export type ExplainedIngredient = HighlightedIngredient & {
  displayName: string;
  explanationLookup: IngredientExplanationLookup;
};

export type ResultIngredientAnalysis = {
  cautionIngredients: string[];
  explainedIngredients: ExplainedIngredient[];
  highRiskIngredients: string[];
};

export type ResultAnalysis = {
  ingredientAnalysis: ResultIngredientAnalysis;
  insights: ProductInsights;
  shareableResult: ShareableResultData | null;
  suggestions: ProductSuggestion[];
};

const resultAnalysisCache = new Map<string, ResultAnalysis>();

function uniqueLabels(
  ingredients: HighlightedIngredient[],
  risk: HighlightedIngredient['risk']
) {
  return Array.from(
    new Set(
      ingredients
        .filter((ingredient) => ingredient.risk === risk)
        .map((ingredient) => ingredient.match?.label)
        .filter((label): label is string => Boolean(label))
    )
  );
}

function getResultAnalysisCacheKey(
  product: ResolvedProduct,
  profileId: DietProfileId
) {
  return [
    profileId,
    product.code,
    product.barcode,
    product.novaGroup ?? 'nova-none',
    product.nutrition.sugar100g ?? 'sugar-none',
    product.nutrition.salt100g ?? 'salt-none',
    product.ingredientsText ?? 'ingredients-none',
  ].join('|');
}

export function buildResultAnalysis(
  product: ResolvedProduct,
  profileId: DietProfileId = DEFAULT_DIET_PROFILE_ID
) {
  const cacheKey = getResultAnalysisCacheKey(product, profileId);
  const cachedValue = resultAnalysisCache.get(cacheKey);

  if (cachedValue) {
    return cachedValue;
  }

  const highlightedIngredients = highlightIngredients(product.ingredientsText);
  const ingredientAnalysis: ResultIngredientAnalysis = {
    cautionIngredients: uniqueLabels(highlightedIngredients, 'caution'),
    explainedIngredients: highlightedIngredients.map((ingredient) => {
      const explanationLookup = explainIngredient(ingredient.ingredient);

      return {
        ...ingredient,
        displayName:
          explanationLookup.explanation?.name || ingredient.ingredient,
        explanationLookup,
      };
    }),
    highRiskIngredients: uniqueLabels(highlightedIngredients, 'high-risk'),
  };
  const insights = analyzeProduct(product, profileId);
  const analysis = {
    ingredientAnalysis,
    insights,
    shareableResult: buildShareableResultData(product, profileId, insights),
    suggestions: getAlternativeProductSuggestions(product, profileId, insights),
  };

  resultAnalysisCache.set(cacheKey, analysis);

  if (resultAnalysisCache.size > 24) {
    const oldestKey = resultAnalysisCache.keys().next().value;

    if (oldestKey) {
      resultAnalysisCache.delete(oldestKey);
    }
  }

  return analysis;
}
