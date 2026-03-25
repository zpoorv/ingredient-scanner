import {
  DEFAULT_DIET_PROFILE_ID,
  type DietProfileId,
} from '../constants/dietProfiles';
import type { HealthScoreGrade } from '../constants/productHealthScore';
import type { ResolvedProduct } from '../types/product';
import { formatProductName } from './productDisplay';
import { applyDietProfile, getDietProfileDefinition } from './dietProfiles';
import {
  findHarmfulIngredients,
} from './healthScore';
import {
  scoreProductHealth,
  type ProductHealthScoreAdjustment,
} from './productHealthScore';
import { isLikelyFoodProduct } from './productType';

export type ProductMetric = {
  label: string;
  tone: 'good' | 'neutral' | 'warning';
  value: string;
};

export type ProductInsights = {
  cautions: string[];
  gradeLabel: HealthScoreGrade | null;
  highlights: string[];
  metrics: ProductMetric[];
  profileId: DietProfileId;
  profileLabel: string;
  profileSummary: string | null;
  processingLabel: string | null;
  smartScore: number | null;
  summary: string;
  verdict: string;
};

function formatNutrientValue(value?: number | null, suffix = 'g') {
  if (value === null || value === undefined) {
    return null;
  }

  const formattedValue = value < 10 ? value.toFixed(1) : value.toFixed(0);

  return `${formattedValue}${suffix}`;
}

function classifySugar(value?: number | null) {
  if (value === null || value === undefined) {
    return null;
  }

  if (value > 22.5) {
    return 'high';
  }

  if (value > 5) {
    return 'medium';
  }

  return 'low';
}

function classifySalt(value?: number | null) {
  if (value === null || value === undefined) {
    return null;
  }

  if (value > 1.5) {
    return 'high';
  }

  if (value > 0.3) {
    return 'medium';
  }

  return 'low';
}

function classifySaturatedFat(value?: number | null) {
  if (value === null || value === undefined) {
    return null;
  }

  if (value > 5) {
    return 'high';
  }

  if (value > 1.5) {
    return 'medium';
  }

  return 'low';
}

function getProcessingLabel(novaGroup?: number | null) {
  switch (novaGroup) {
    case 1:
      return 'Minimally processed';
    case 2:
      return 'Processed ingredient';
    case 3:
      return 'Processed food';
    case 4:
      return 'Ultra-processed';
    default:
      return null;
  }
}

function getVerdictFromGrade(gradeLabel: HealthScoreGrade) {
  switch (gradeLabel) {
    case 'A':
      return 'Strong choice';
    case 'B':
      return 'Pretty solid';
    case 'C':
      return 'Mixed signals';
    case 'D':
      return 'Use caution';
    default:
      return 'Highly processed';
  }
}

function adjustmentsToMessages(
  adjustments: ProductHealthScoreAdjustment[],
  direction: 'positive' | 'negative'
) {
  return adjustments
    .filter((adjustment) => adjustment.reason)
    .filter((adjustment) =>
      direction === 'positive' ? adjustment.impact > 0 : adjustment.impact < 0
    )
    .sort((left, right) => Math.abs(right.impact) - Math.abs(left.impact))
    .map((adjustment) => adjustment.reason);
}

function buildMetrics(product: ResolvedProduct): ProductMetric[] {
  const metrics: ProductMetric[] = [];
  const { nutrition } = product;
  const sugarLevel = classifySugar(nutrition.sugar100g);
  const saltLevel = classifySalt(nutrition.salt100g);
  const saturatedFatLevel = classifySaturatedFat(nutrition.saturatedFat100g);

  if (nutrition.calories100g !== null && nutrition.calories100g !== undefined) {
    metrics.push({
      label: 'Calories',
      tone: nutrition.calories100g > 250 ? 'warning' : 'neutral',
      value: `${Math.round(nutrition.calories100g)} kcal / 100g`,
    });
  }

  if (nutrition.sugar100g !== null && nutrition.sugar100g !== undefined) {
    metrics.push({
      label: 'Sugar',
      tone:
        sugarLevel === 'high'
          ? 'warning'
          : sugarLevel === 'low'
            ? 'good'
            : 'neutral',
      value: `${formatNutrientValue(nutrition.sugar100g) || 'n/a'} / 100g`,
    });
  }

  if (nutrition.salt100g !== null && nutrition.salt100g !== undefined) {
    metrics.push({
      label: 'Salt',
      tone:
        saltLevel === 'high'
          ? 'warning'
          : saltLevel === 'low'
            ? 'good'
            : 'neutral',
      value: `${formatNutrientValue(nutrition.salt100g) || 'n/a'} / 100g`,
    });
  }

  if (
    nutrition.saturatedFat100g !== null &&
    nutrition.saturatedFat100g !== undefined
  ) {
    metrics.push({
      label: 'Sat. Fat',
      tone:
        saturatedFatLevel === 'high'
          ? 'warning'
          : saturatedFatLevel === 'low'
            ? 'good'
            : 'neutral',
      value:
        `${formatNutrientValue(nutrition.saturatedFat100g) || 'n/a'} / 100g`,
    });
  }

  if (nutrition.protein100g !== null && nutrition.protein100g !== undefined) {
    metrics.push({
      label: 'Protein',
      tone: nutrition.protein100g >= 10 ? 'good' : 'neutral',
      value: `${formatNutrientValue(nutrition.protein100g) || 'n/a'} / 100g`,
    });
  }

  if (nutrition.fiber100g !== null && nutrition.fiber100g !== undefined) {
    metrics.push({
      label: 'Fiber',
      tone: nutrition.fiber100g >= 3 ? 'good' : 'neutral',
      value: `${formatNutrientValue(nutrition.fiber100g) || 'n/a'} / 100g`,
    });
  }

  return metrics;
}

export function analyzeProduct(
  product: ResolvedProduct,
  profileId: DietProfileId = DEFAULT_DIET_PROFILE_ID
): ProductInsights {
  const profile = getDietProfileDefinition(profileId);

  if (!isLikelyFoodProduct(product)) {
    return {
      cautions: ['This item does not look like an edible product'],
      gradeLabel: null,
      highlights: [],
      metrics: [],
      profileId,
      profileLabel: profile.label,
      profileSummary: null,
      processingLabel: null,
      smartScore: null,
      summary: 'Health scoring is only shown for edible food and drink products.',
      verdict: `${formatProductName(product.name)} is not being scored as a food item.`,
    };
  }

  const harmfulMatches = findHarmfulIngredients(product.ingredientsText);
  const healthScore = scoreProductHealth(product);
  const profileAssessment = applyDietProfile(product, healthScore, profileId);
  const processingLabel = getProcessingLabel(product.novaGroup);
  const sugarLevel = classifySugar(product.nutrition.sugar100g);
  const saltLevel = classifySalt(product.nutrition.salt100g);
  const saturatedFatLevel = classifySaturatedFat(product.nutrition.saturatedFat100g);
  const highlights = adjustmentsToMessages(healthScore.adjustments, 'positive');
  const cautions = adjustmentsToMessages(healthScore.adjustments, 'negative');

  if (harmfulMatches.length > 0) {
    cautions.push(
      `${harmfulMatches.length} tracked ingredient flag${harmfulMatches.length > 1 ? 's' : ''} detected`
    );
  } else if (product.ingredientsText) {
    highlights.push('No tracked harmful ingredients were detected');
  }

  if (product.novaGroup === 4) {
    cautions.push('Likely ultra-processed');
  } else if (product.novaGroup === 3) {
    cautions.push('Moderately processed');
  } else if (product.novaGroup === 1 || product.novaGroup === 2) {
    highlights.push('Lightly processed based on NOVA classification');
  }

  if (product.nutriScore === 'A' || product.nutriScore === 'B') {
    highlights.push(`Nutri-Score ${product.nutriScore}`);
  } else if (product.nutriScore === 'D' || product.nutriScore === 'E') {
    cautions.push(`Nutri-Score ${product.nutriScore}`);
  }

  if (sugarLevel === 'high') {
    cautions.push('High sugar per 100g');
  } else if (sugarLevel === 'low') {
    highlights.push('Low sugar per 100g');
  }

  if (saltLevel === 'high') {
    cautions.push('High salt per 100g');
  } else if (saltLevel === 'low') {
    highlights.push('Low salt per 100g');
  }

  if (saturatedFatLevel === 'high') {
    cautions.push('High saturated fat per 100g');
  }

  if ((product.additiveCount || 0) > 0) {
    cautions.push(
      `${product.additiveCount} additive${product.additiveCount > 1 ? 's' : ''} listed`
    );
  } else {
    highlights.push('No additives reported in the source data');
  }

  if (
    product.nutrition.fiber100g !== null &&
    product.nutrition.fiber100g !== undefined &&
    product.nutrition.fiber100g >= 3
  ) {
    highlights.push('Good fiber density');
  }

  if (
    product.nutrition.protein100g !== null &&
    product.nutrition.protein100g !== undefined &&
    product.nutrition.protein100g >= 10
  ) {
    highlights.push('Useful protein content');
  }

  highlights.push(...profileAssessment.highlights);
  cautions.push(...profileAssessment.warnings);

  const uniqueHighlights = Array.from(new Set(highlights));
  const uniqueCautions = Array.from(new Set(cautions));
  const summary = [healthScore.explanation, profileAssessment.summary]
    .filter(Boolean)
    .join(' ');

  return {
    cautions: uniqueCautions,
    gradeLabel: profileAssessment.gradeLabel,
    highlights: uniqueHighlights,
    metrics: buildMetrics(product),
    profileId,
    profileLabel: profileAssessment.profile.label,
    profileSummary: profileAssessment.summary,
    processingLabel,
    smartScore: profileAssessment.score,
    summary,
    verdict: getVerdictFromGrade(profileAssessment.gradeLabel),
  };
}
