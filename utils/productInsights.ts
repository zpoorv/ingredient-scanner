import type { ResolvedProduct } from '../services/productLookup';
import {
  calculateHealthScore,
  findHarmfulIngredients,
} from './healthScore';

export type ProductMetric = {
  label: string;
  tone: 'good' | 'neutral' | 'warning';
  value: string;
};

export type ProductInsights = {
  cautions: string[];
  highlights: string[];
  metrics: ProductMetric[];
  processingLabel: string | null;
  smartScore: number | null;
  summary: string;
  verdict: string;
};

function clamp(value: number, minValue: number, maxValue: number) {
  return Math.max(minValue, Math.min(maxValue, value));
}

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

export function analyzeProduct(product: ResolvedProduct): ProductInsights {
  const harmfulMatches = findHarmfulIngredients(product.ingredientsText);
  const baseIngredientScore = calculateHealthScore(product.ingredientsText);
  const processingLabel = getProcessingLabel(product.novaGroup);
  const sugarLevel = classifySugar(product.nutrition.sugar100g);
  const saltLevel = classifySalt(product.nutrition.salt100g);
  const saturatedFatLevel = classifySaturatedFat(product.nutrition.saturatedFat100g);
  const highlights: string[] = [];
  const cautions: string[] = [];
  let smartScore = baseIngredientScore ?? 72;
  let signalCount = 0;

  if (harmfulMatches.length > 0) {
    signalCount += 1;
    cautions.push(
      `${harmfulMatches.length} tracked ingredient flag${harmfulMatches.length > 1 ? 's' : ''} detected`
    );
  } else if (product.ingredientsText) {
    signalCount += 1;
    smartScore += 4;
    highlights.push('No tracked harmful ingredients were detected');
  }

  if (product.novaGroup === 4) {
    signalCount += 1;
    smartScore -= 18;
    cautions.push('Likely ultra-processed');
  } else if (product.novaGroup === 3) {
    signalCount += 1;
    smartScore -= 8;
    cautions.push('Moderately processed');
  } else if (product.novaGroup === 1 || product.novaGroup === 2) {
    signalCount += 1;
    smartScore += 5;
    highlights.push('Lightly processed based on NOVA classification');
  }

  if (product.nutriScore === 'A' || product.nutriScore === 'B') {
    signalCount += 1;
    smartScore += 6;
    highlights.push(`Nutri-Score ${product.nutriScore}`);
  } else if (product.nutriScore === 'D' || product.nutriScore === 'E') {
    signalCount += 1;
    smartScore -= 12;
    cautions.push(`Nutri-Score ${product.nutriScore}`);
  }

  if (sugarLevel === 'high') {
    signalCount += 1;
    smartScore -= 16;
    cautions.push('High sugar per 100g');
  } else if (sugarLevel === 'low') {
    signalCount += 1;
    smartScore += 6;
    highlights.push('Low sugar per 100g');
  }

  if (saltLevel === 'high') {
    signalCount += 1;
    smartScore -= 12;
    cautions.push('High salt per 100g');
  } else if (saltLevel === 'low') {
    signalCount += 1;
    smartScore += 4;
    highlights.push('Low salt per 100g');
  }

  if (saturatedFatLevel === 'high') {
    signalCount += 1;
    smartScore -= 12;
    cautions.push('High saturated fat per 100g');
  }

  if ((product.additiveCount || 0) > 0) {
    signalCount += 1;
    smartScore -= Math.min(product.additiveCount * 2, 10);
    cautions.push(
      `${product.additiveCount} additive${product.additiveCount > 1 ? 's' : ''} listed`
    );
  } else {
    signalCount += 1;
    highlights.push('No additives reported in the source data');
  }

  if (
    product.nutrition.fiber100g !== null &&
    product.nutrition.fiber100g !== undefined &&
    product.nutrition.fiber100g >= 3
  ) {
    signalCount += 1;
    smartScore += 6;
    highlights.push('Good fiber density');
  }

  if (
    product.nutrition.protein100g !== null &&
    product.nutrition.protein100g !== undefined &&
    product.nutrition.protein100g >= 10
  ) {
    signalCount += 1;
    smartScore += 4;
    highlights.push('Useful protein content');
  }

  if (signalCount === 0) {
    return {
      cautions: ['Not enough trustworthy product data was available yet.'],
      highlights: [],
      metrics: buildMetrics(product),
      processingLabel,
      smartScore: null,
      summary: 'Try again later or scan a product with richer source data.',
      verdict: 'Limited data',
    };
  }

  smartScore = clamp(Math.round(smartScore), 0, 100);

  const verdict =
    smartScore >= 80
      ? 'Strong choice'
      : smartScore >= 65
        ? 'Pretty solid'
        : smartScore >= 45
          ? 'Mixed signals'
          : 'Use caution';
  const summary = cautions.length > 0
    ? cautions.slice(0, 2).join(' • ')
    : highlights.slice(0, 2).join(' • ');

  return {
    cautions,
    highlights,
    metrics: buildMetrics(product),
    processingLabel,
    smartScore,
    summary:
      summary || 'This score is based on ingredients, source nutrition facts, and processing signals.',
    verdict,
  };
}
