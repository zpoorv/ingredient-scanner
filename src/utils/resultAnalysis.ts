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
import {
  classifyProductFoodStatus,
  type ProductFoodStatus,
} from './productType';

export type ExplainedIngredient = HighlightedIngredient & {
  displayName: string;
  explanationLookup: IngredientExplanationLookup;
};

export type ResultConfidence = 'high' | 'medium' | 'low';
export type DecisionVerdict =
  | 'good-regular-pick'
  | 'okay-occasionally'
  | 'not-ideal-often'
  | 'need-better-data';

export type ResultTrustSnapshot = {
  adminReviewState: 'reviewed' | 'improved' | 'not-reviewed';
  ingredientCompleteness: 'full' | 'partial' | 'missing';
  nutritionCompleteness: 'complete' | 'partial' | 'missing';
  ocrQuality: 'strong' | 'partial' | 'weak' | 'not-applicable';
  sourceCertainty: 'reviewed' | 'catalog' | 'ocr-only' | 'saved-offline';
  updatedFreshness: 'fresh' | 'aging' | 'unknown';
};

export type ResultIngredientAnalysis = {
  cautionIngredients: string[];
  explainedIngredients: ExplainedIngredient[];
  highRiskIngredients: string[];
};

export type ResultAnalysis = {
  confidence: ResultConfidence;
  confidenceReason: string;
  decisionSummary: string;
  decisionVerdict: DecisionVerdict;
  foodStatus: ProductFoodStatus;
  ingredientAnalysis: ResultIngredientAnalysis;
  isScoreSuppressed?: boolean;
  insights: ProductInsights;
  premiumGuidance: {
    confidenceAssist: string | null;
    swapGuidance: string;
    topConcern: string | null;
    useFrequencyGuidance: string;
    whyThisScore: string;
  } | null;
  shareableResult: ShareableResultData | null;
  suggestions: ProductSuggestion[];
  topConcern: string | null;
  trustSnapshot: ResultTrustSnapshot;
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
    product.ocrDiagnostics?.parseCompleteness ?? 'ocr-none',
    product.ocrDiagnostics?.matchedIngredientCount ?? 'ocr-matches-none',
    product.ocrDiagnostics?.rejectedNoiseCount ?? 'ocr-noise-none',
    product.adminMetadata?.updatedAt ?? 'override-none',
    product.adminMetadata?.hasCustomAlternatives ? 'custom-alts' : 'rule-alts',
  ].join('|');
}

function countNutritionSignals(product: ResolvedProduct) {
  return [
    product.nutrition.calories100g,
    product.nutrition.sugar100g,
    product.nutrition.salt100g,
    product.nutrition.saturatedFat100g,
    product.nutrition.protein100g,
    product.nutrition.fiber100g,
  ].filter((value) => value !== null && value !== undefined).length;
}

function getDecisionVerdict(
  insights: ProductInsights,
  confidence: ResultConfidence,
  foodStatus: ProductFoodStatus,
  isScoreSuppressed: boolean
): DecisionVerdict {
  if (foodStatus === 'non-food' || foodStatus === 'unclear' || isScoreSuppressed) {
    return 'need-better-data';
  }

  if (confidence === 'low' || insights.smartScore === null) {
    return 'need-better-data';
  }

  if (insights.smartScore >= 80) {
    return 'good-regular-pick';
  }

  if (insights.smartScore >= 60) {
    return 'okay-occasionally';
  }

  return 'not-ideal-often';
}

function getDecisionSummary(
  verdict: DecisionVerdict,
  topConcern: string | null,
  confidence: ResultConfidence
) {
  switch (verdict) {
    case 'good-regular-pick':
      return topConcern
        ? `Good regular pick. Keep an eye on ${topConcern.toLowerCase()}.`
        : 'Good regular pick for this profile.';
    case 'okay-occasionally':
      return topConcern
        ? `Okay occasionally. The biggest watch-out is ${topConcern.toLowerCase()}.`
        : 'Okay occasionally, but worth comparing with a nearby option.';
    case 'not-ideal-often':
      return topConcern
        ? `Not ideal often. The main issue is ${topConcern.toLowerCase()}.`
        : 'Not ideal often for this profile.';
    default:
      return confidence === 'low'
        ? 'Need better data before trusting this result.'
        : 'Need better data before we turn this into a strong buying call.';
  }
}

function getIngredientCompleteness(
  product: ResolvedProduct
): ResultTrustSnapshot['ingredientCompleteness'] {
  if (!product.ingredientsText?.trim()) {
    return 'missing';
  }

  if (!product.ocrDiagnostics) {
    return 'full';
  }

  return product.ocrDiagnostics.parseCompleteness >= 0.78 ? 'full' : 'partial';
}

function getNutritionCompleteness(
  product: ResolvedProduct
): ResultTrustSnapshot['nutritionCompleteness'] {
  const nutritionSignals = countNutritionSignals(product);

  if (nutritionSignals >= 4) {
    return 'complete';
  }

  if (nutritionSignals >= 1) {
    return 'partial';
  }

  return 'missing';
}

function getOcrQuality(
  product: ResolvedProduct
): ResultTrustSnapshot['ocrQuality'] {
  if (!product.ocrDiagnostics) {
    return 'not-applicable';
  }

  if (
    product.ocrDiagnostics.parseCompleteness >= 0.78 &&
    product.ocrDiagnostics.rejectedNoiseCount <= 2
  ) {
    return 'strong';
  }

  if (product.ocrDiagnostics.parseCompleteness >= 0.55) {
    return 'partial';
  }

  return 'weak';
}

function getSourceCertainty(
  product: ResolvedProduct
): ResultTrustSnapshot['sourceCertainty'] {
  if (product.sources.some((source) => source.id === 'product_override')) {
    return 'reviewed';
  }

  if (product.sources.some((source) => source.id === 'offline_cache')) {
    return 'saved-offline';
  }

  if (product.sources.some((source) => source.id === 'open_food_facts')) {
    return 'catalog';
  }

  if (product.sources.some((source) => source.id === 'search_index')) {
    return 'catalog';
  }

  return 'ocr-only';
}

function getUpdatedFreshness(
  product: ResolvedProduct
): ResultTrustSnapshot['updatedFreshness'] {
  const updatedAt = product.adminMetadata?.updatedAt;

  if (!updatedAt) {
    return 'unknown';
  }

  const updatedTime = new Date(updatedAt).getTime();

  if (Number.isNaN(updatedTime)) {
    return 'unknown';
  }

  const daysOld = (Date.now() - updatedTime) / (1000 * 60 * 60 * 24);
  return daysOld <= 45 ? 'fresh' : 'aging';
}

function buildTrustSnapshot(product: ResolvedProduct): ResultTrustSnapshot {
  return {
    adminReviewState:
      product.adminMetadata?.reviewStatus === 'reviewed'
        ? 'reviewed'
        : product.adminMetadata?.reviewStatus === 'improved'
          ? 'improved'
          : 'not-reviewed',
    ingredientCompleteness: getIngredientCompleteness(product),
    nutritionCompleteness: getNutritionCompleteness(product),
    ocrQuality: getOcrQuality(product),
    sourceCertainty: getSourceCertainty(product),
    updatedFreshness: getUpdatedFreshness(product),
  };
}

function getUsedSourceId(product: ResolvedProduct) {
  return product.sources.find((source) => source.status === 'used')?.id ?? null;
}

function getConfidenceAssessment(
  product: ResolvedProduct,
  foodStatus: ProductFoodStatus
): {
  confidence: ResultConfidence;
  confidenceReason: string;
  isScoreSuppressed: boolean;
} {
  const hasIngredients = Boolean(product.ingredientsText?.trim());
  const nutritionSignalCount = countNutritionSignals(product);
  const usedSourceId = getUsedSourceId(product);
  const hasAdminOverride = Boolean(product.adminMetadata?.hasManagedData);
  const ocrDiagnostics = product.ocrDiagnostics;
  let score = 0;

  if (foodStatus === 'non-food') {
    return {
      confidence: 'low',
      confidenceReason: 'This does not look like a food or drink item.',
      isScoreSuppressed: true,
    };
  }

  if (foodStatus === 'unclear') {
    return {
      confidence: 'low',
      confidenceReason: 'We need clearer food details before scoring this confidently.',
      isScoreSuppressed: true,
    };
  }

  if (hasAdminOverride) {
    score += 4;
  }

  if (usedSourceId === 'product_override') {
    score += 3;
  } else if (usedSourceId === 'open_food_facts') {
    score += 2;
  } else if (usedSourceId === 'search_index') {
    score += 2;
  } else if (usedSourceId === 'ingredient_ocr') {
    score += 1;
  }

  if (hasIngredients) {
    score += 2;
  } else {
    score -= 2;
  }

  if (nutritionSignalCount >= 4) {
    score += 2;
  } else if (nutritionSignalCount >= 2) {
    score += 1;
  } else if (nutritionSignalCount === 0) {
    score -= 1;
  }

  if (foodStatus === 'food') {
    score += 1;
  }

  if (ocrDiagnostics) {
    if (ocrDiagnostics.parseCompleteness >= 0.78) {
      score += 2;
    } else if (ocrDiagnostics.parseCompleteness >= 0.55) {
      score += 1;
    } else {
      score -= 2;
    }

    if (ocrDiagnostics.rejectedNoiseCount >= 4) {
      score -= 1;
    }
  }

  if (score >= 6) {
    return {
      confidence: 'high',
      confidenceReason: hasAdminOverride
        ? 'High confidence from a reviewed product record.'
        : 'High confidence from clear ingredients and nutrition details.',
      isScoreSuppressed: false,
    };
  }

  if (score >= 3) {
    return {
      confidence: 'medium',
      confidenceReason:
        usedSourceId === 'offline_cache'
          ? 'This uses details saved from an earlier scan, so it is useful but worth rechecking.'
          : 'Partial details are available, so this is useful but not fully complete.',
      isScoreSuppressed: false,
    };
  }

  return {
    confidence: 'low',
    confidenceReason:
      usedSourceId === 'offline_cache'
        ? 'Needs review because this came from saved offline details instead of a fresh lookup.'
        : ocrDiagnostics
          ? 'Needs review because the ingredient photo looked partial or noisy.'
          : 'Needs review because this product record is missing too many details.',
    isScoreSuppressed: false,
  };
}

function softenInsights(
  insights: ProductInsights,
  confidence: ResultConfidence,
  isScoreSuppressed: boolean,
  foodStatus: ProductFoodStatus
) {
  if (foodStatus === 'non-food' || foodStatus === 'unclear') {
    return insights;
  }

  if (isScoreSuppressed) {
    return {
      ...insights,
      gradeLabel: null,
      smartScore: null,
      summary: 'This result needs a closer look before we show a score.',
      verdict: 'Needs review',
    };
  }

  if (confidence !== 'low') {
    return insights;
  }

  return {
    ...insights,
    summary: `${insights.summary} This read is based on partial details.`,
    verdict: 'Use this as a rough guide',
  };
}

function getUseFrequencyGuidance(
  smartScore: number | null,
  confidence: ResultConfidence,
  foodStatus: ProductFoodStatus
) {
  if (foodStatus === 'non-food') {
    return 'This is not being treated as an edible product.';
  }

  if (foodStatus === 'unclear') {
    return 'Retake or rescan it before relying on this result often.';
  }

  if (confidence === 'low') {
    return 'Treat this as a rough read until you get a cleaner scan.';
  }

  if (smartScore === null) {
    return 'We need more detail before giving use-frequency guidance.';
  }

  if (smartScore >= 80) {
    return 'This looks fine for regular use in the chosen profile.';
  }

  if (smartScore >= 60) {
    return 'This can fit occasionally, but it is worth comparing labels.';
  }

  if (smartScore >= 40) {
    return 'This is better as an occasional pick than a routine staple.';
  }

  return 'This is not ideal for frequent use in the chosen profile.';
}

function buildWhyThisScore(
  product: ResolvedProduct,
  insights: ProductInsights,
  ingredientAnalysis: ResultIngredientAnalysis
) {
  const reasons: string[] = [];

  if (ingredientAnalysis.highRiskIngredients.length > 0) {
    reasons.push(
      `${ingredientAnalysis.highRiskIngredients[0]} stands out as the main ingredient concern`
    );
  } else if (insights.cautions[0]) {
    reasons.push(insights.cautions[0]);
  }

  if ((product.nutrition.sugar100g ?? 0) > 15) {
    reasons.push('sugar is on the higher side');
  } else if ((product.nutrition.salt100g ?? 0) > 1.2) {
    reasons.push('salt is on the higher side');
  } else if ((product.additiveCount ?? 0) >= 3) {
    reasons.push('the ingredient list is fairly additive-heavy');
  } else if (product.novaGroup === 4) {
    reasons.push('it looks heavily processed');
  } else if (insights.highlights[0]) {
    reasons.push(insights.highlights[0].toLowerCase());
  }

  const compactReasons = reasons.slice(0, 2);

  if (compactReasons.length === 0) {
    return 'This score mostly reflects the ingredients, nutrition details, and processing level we could verify.';
  }

  return `This score was pulled mainly by ${compactReasons.join(' and ')}.`;
}

function buildSwapGuidance(
  product: ResolvedProduct,
  insights: ProductInsights,
  suggestions: ProductSuggestion[]
) {
  if (suggestions[0]?.description) {
    return suggestions[0].description;
  }

  if ((product.nutrition.sugar100g ?? 0) > 15) {
    return 'Look for a version with lower sugar and a shorter ingredient list.';
  }

  if ((product.nutrition.salt100g ?? 0) > 1.2) {
    return 'Look for a version with lower sodium or fewer seasoning additives.';
  }

  if ((product.additiveCount ?? 0) >= 3) {
    return 'Look for a simpler ingredient list with fewer stabilizers, preservatives, or flavor boosters.';
  }

  return insights.highlights[0]
    ? `If you rebuy this kind of product, keep looking for versions that preserve ${insights.highlights[0].toLowerCase()}.`
    : 'Compare a couple of similar products and prefer the one with the simpler ingredient list.';
}

function buildConfidenceAssist(
  product: ResolvedProduct,
  confidence: ResultConfidence
) {
  if (!product.ocrDiagnostics || confidence !== 'low') {
    return null;
  }

  if (product.ocrDiagnostics.rejectedNoiseCount >= 3) {
    return 'The label photo looked noisy, so a flatter shot with less glare should give a stronger read.';
  }

  if (product.ocrDiagnostics.matchedIngredientCount <= 3) {
    return 'Only part of the ingredient list was recovered, so move closer and keep just the ingredient block in frame.';
  }

  return 'A brighter, tighter ingredient photo should improve this read further.';
}

function buildPremiumGuidance(
  product: ResolvedProduct,
  insights: ProductInsights,
  ingredientAnalysis: ResultIngredientAnalysis,
  confidence: ResultConfidence,
  foodStatus: ProductFoodStatus,
  suggestions: ProductSuggestion[]
) {
  if (foodStatus === 'non-food') {
    return null;
  }

  return {
    confidenceAssist: buildConfidenceAssist(product, confidence),
    swapGuidance: buildSwapGuidance(product, insights, suggestions),
    topConcern: ingredientAnalysis.highRiskIngredients[0] ?? insights.cautions[0] ?? null,
    useFrequencyGuidance: getUseFrequencyGuidance(
      insights.smartScore,
      confidence,
      foodStatus
    ),
    whyThisScore: buildWhyThisScore(product, insights, ingredientAnalysis),
  };
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
  const foodStatus = classifyProductFoodStatus(product);
  const confidenceAssessment = getConfidenceAssessment(product, foodStatus);
  const insights = softenInsights(
    analyzeProduct(product, profileId),
    confidenceAssessment.confidence,
    confidenceAssessment.isScoreSuppressed,
    foodStatus
  );
  const suggestions =
    confidenceAssessment.confidence === 'low' ||
    confidenceAssessment.isScoreSuppressed
      ? []
      : getAlternativeProductSuggestions(product, profileId, insights);
  const topConcern =
    ingredientAnalysis.highRiskIngredients[0] ?? insights.cautions[0] ?? null;
  const decisionVerdict = getDecisionVerdict(
    insights,
    confidenceAssessment.confidence,
    foodStatus,
    confidenceAssessment.isScoreSuppressed
  );
  const analysis = {
    confidence: confidenceAssessment.confidence,
    confidenceReason: confidenceAssessment.confidenceReason,
    decisionSummary: getDecisionSummary(
      decisionVerdict,
      topConcern,
      confidenceAssessment.confidence
    ),
    decisionVerdict,
    foodStatus,
    ingredientAnalysis,
    isScoreSuppressed: confidenceAssessment.isScoreSuppressed,
    insights,
    premiumGuidance: buildPremiumGuidance(
      product,
      insights,
      ingredientAnalysis,
      confidenceAssessment.confidence,
      foodStatus,
      suggestions
    ),
    shareableResult: confidenceAssessment.isScoreSuppressed
      ? null
      : buildShareableResultData(product, profileId, insights),
    suggestions,
    topConcern,
    trustSnapshot: buildTrustSnapshot(product),
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
