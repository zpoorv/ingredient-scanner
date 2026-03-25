import {
  DEFAULT_DIET_PROFILE_ID,
  DIET_PROFILE_DEFINITIONS,
  DIET_PROFILE_KEYWORDS,
  DIET_PROFILE_SCORE_TUNING,
  type DietProfileDefinition,
  type DietProfileId,
} from '../constants/dietProfiles';
import type { ResolvedProduct } from '../types/product';
import {
  getHealthScoreGradeLabel,
  type ProductHealthScore,
} from './productHealthScore';
import {
  normalizeIngredientValue,
  toIngredientList,
} from './ingredientHighlighting';

export type DietProfileScoreAdjustment = {
  id: string;
  impact: number;
  reason: string;
};

export type DietProfileAssessment = {
  adjustments: DietProfileScoreAdjustment[];
  gradeLabel: ReturnType<typeof getHealthScoreGradeLabel>;
  highlights: string[];
  profile: DietProfileDefinition;
  score: number;
  summary: string | null;
  warnings: string[];
};

function clamp(value: number, minValue: number, maxValue: number) {
  return Math.max(minValue, Math.min(maxValue, value));
}

function getNormalizedIngredients(product: ResolvedProduct) {
  return toIngredientList(product.ingredientsText).map(normalizeIngredientValue);
}

function countKeywordMatches(values: string[], keywords: string[]) {
  const matchedValues = new Set<string>();

  for (const value of values) {
    if (!value) {
      continue;
    }

    if (keywords.some((keyword) => value.includes(normalizeIngredientValue(keyword)))) {
      matchedValues.add(value);
    }
  }

  return matchedValues.size;
}

function hasSignal(values: string[], keywords: string[]) {
  return values.some((value) =>
    keywords.some((keyword) => value.includes(normalizeIngredientValue(keyword)))
  );
}

function describeProfileAdjustments(adjustments: DietProfileScoreAdjustment[]) {
  if (adjustments.length === 0) {
    return null;
  }

  const sortedAdjustments = [...adjustments].sort(
    (left, right) => Math.abs(right.impact) - Math.abs(left.impact)
  );
  const rewards = sortedAdjustments
    .filter((adjustment) => adjustment.impact > 0)
    .map((adjustment) => adjustment.reason)
    .slice(0, 2);
  const warnings = sortedAdjustments
    .filter((adjustment) => adjustment.impact < 0)
    .map((adjustment) => adjustment.reason)
    .slice(0, 2);

  if (rewards.length > 0 && warnings.length > 0) {
    return `${rewards.join(' and ')} helped this mode, but ${warnings.join(' and ')} held it back.`;
  }

  if (warnings.length > 0) {
    return `${warnings.join(' and ')} lowered this mode score.`;
  }

  return `${rewards.join(' and ')} supported this mode score.`;
}

function buildProfileAdjustments(
  product: ResolvedProduct,
  profileId: DietProfileId
) {
  const adjustments: DietProfileScoreAdjustment[] = [];
  const ingredients = getNormalizedIngredients(product);
  const labelsAndCategories = [
    ...product.labels.map(normalizeIngredientValue),
    ...product.categories.map(normalizeIngredientValue),
  ];
  const { nutrition } = product;

  if (profileId === 'weight-loss') {
    if ((nutrition.calories100g ?? 0) > 350) {
      adjustments.push({
        id: 'weight-loss-high-calories',
        impact: DIET_PROFILE_SCORE_TUNING.weightLoss.highCaloriesPenalty,
        reason: 'high calorie density for weight loss',
      });
    } else if ((nutrition.calories100g ?? 0) > 220) {
      adjustments.push({
        id: 'weight-loss-moderate-calories',
        impact: DIET_PROFILE_SCORE_TUNING.weightLoss.moderateCaloriesPenalty,
        reason: 'calorie density for weight loss',
      });
    } else if ((nutrition.calories100g ?? 0) > 0 && (nutrition.calories100g ?? 0) <= 160) {
      adjustments.push({
        id: 'weight-loss-light-calories',
        impact: DIET_PROFILE_SCORE_TUNING.weightLoss.lightCaloriesReward,
        reason: 'lighter calorie density',
      });
    }

    if ((nutrition.sugar100g ?? 0) > 15) {
      adjustments.push({
        id: 'weight-loss-sugar',
        impact: DIET_PROFILE_SCORE_TUNING.weightLoss.highSugarPenalty,
        reason: 'higher sugar for a weight-loss goal',
      });
    }

    if ((nutrition.fiber100g ?? 0) >= 5) {
      adjustments.push({
        id: 'weight-loss-fiber',
        impact: DIET_PROFILE_SCORE_TUNING.weightLoss.fiberReward,
        reason: 'fiber that can help fullness',
      });
    }

    if ((nutrition.protein100g ?? 0) >= 12) {
      adjustments.push({
        id: 'weight-loss-protein',
        impact: DIET_PROFILE_SCORE_TUNING.weightLoss.proteinReward,
        reason: 'protein that can support satiety',
      });
    }
  }

  if (profileId === 'diabetes-aware') {
    if ((nutrition.sugar100g ?? 0) > 12) {
      adjustments.push({
        id: 'diabetes-high-sugar',
        impact: DIET_PROFILE_SCORE_TUNING.diabetesAware.highSugarPenalty,
        reason: 'high sugar per 100g',
      });
    } else if ((nutrition.sugar100g ?? 0) > 5) {
      adjustments.push({
        id: 'diabetes-medium-sugar',
        impact: DIET_PROFILE_SCORE_TUNING.diabetesAware.mediumSugarPenalty,
        reason: 'moderate sugar per 100g',
      });
    } else if ((nutrition.sugar100g ?? 0) > 0) {
      adjustments.push({
        id: 'diabetes-low-sugar',
        impact: DIET_PROFILE_SCORE_TUNING.diabetesAware.lowSugarReward,
        reason: 'lower sugar per 100g',
      });
    }

    if ((nutrition.carbohydrates100g ?? 0) > 30) {
      adjustments.push({
        id: 'diabetes-carbs',
        impact: DIET_PROFILE_SCORE_TUNING.diabetesAware.highCarbsPenalty,
        reason: 'high carbs per 100g',
      });
    }

    if ((nutrition.fiber100g ?? 0) >= 5) {
      adjustments.push({
        id: 'diabetes-fiber',
        impact: DIET_PROFILE_SCORE_TUNING.diabetesAware.fiberReward,
        reason: 'fiber that can steady the carb load',
      });
    }

    if ((nutrition.protein100g ?? 0) >= 10) {
      adjustments.push({
        id: 'diabetes-protein',
        impact: DIET_PROFILE_SCORE_TUNING.diabetesAware.proteinReward,
        reason: 'protein support for steadier meals',
      });
    }

    if (countKeywordMatches(ingredients, DIET_PROFILE_KEYWORDS.artificialSweeteners) > 0) {
      adjustments.push({
        id: 'diabetes-sweeteners',
        impact: DIET_PROFILE_SCORE_TUNING.diabetesAware.sweetenerPenalty,
        reason: 'artificial sweeteners that may still deserve attention',
      });
    }
  }

  if (profileId === 'vegan') {
    const animalIngredientMatches = countKeywordMatches(
      ingredients,
      DIET_PROFILE_KEYWORDS.animalDerived
    );
    const veganSignalDetected = hasSignal(
      labelsAndCategories,
      DIET_PROFILE_KEYWORDS.veganSignals
    );

    if (animalIngredientMatches > 0) {
      adjustments.push({
        id: 'vegan-animal-ingredients',
        impact: DIET_PROFILE_SCORE_TUNING.vegan.animalIngredientPenalty,
        reason: 'likely animal-derived ingredients',
      });
    } else if (veganSignalDetected) {
      adjustments.push({
        id: 'vegan-signal',
        impact: DIET_PROFILE_SCORE_TUNING.vegan.veganSignalReward,
        reason: 'a vegan or plant-based product signal',
      });
    } else if (ingredients.length > 0) {
      adjustments.push({
        id: 'vegan-likely',
        impact: DIET_PROFILE_SCORE_TUNING.vegan.likelyVeganReward,
        reason: 'no obvious animal-derived ingredients',
      });
    }
  }

  if (profileId === 'gym-muscle-gain') {
    if ((nutrition.protein100g ?? 0) >= 20) {
      adjustments.push({
        id: 'gym-high-protein',
        impact: DIET_PROFILE_SCORE_TUNING.gymMuscleGain.highProteinReward,
        reason: 'strong protein density for muscle gain',
      });
    } else if ((nutrition.protein100g ?? 0) >= 12) {
      adjustments.push({
        id: 'gym-solid-protein',
        impact: DIET_PROFILE_SCORE_TUNING.gymMuscleGain.solidProteinReward,
        reason: 'solid protein density for muscle gain',
      });
    } else if ((nutrition.protein100g ?? 0) > 0 && (nutrition.protein100g ?? 0) < 8) {
      adjustments.push({
        id: 'gym-low-protein',
        impact: DIET_PROFILE_SCORE_TUNING.gymMuscleGain.lowProteinPenalty,
        reason: 'low protein for a muscle-gain goal',
      });
    }

    if ((nutrition.calories100g ?? 0) >= 160 && (nutrition.calories100g ?? 0) <= 360) {
      adjustments.push({
        id: 'gym-calories',
        impact: DIET_PROFILE_SCORE_TUNING.gymMuscleGain.moderateCaloriesReward,
        reason: 'enough energy to support training',
      });
    } else if ((nutrition.calories100g ?? 0) > 0 && (nutrition.calories100g ?? 0) < 120) {
      adjustments.push({
        id: 'gym-low-calories',
        impact: DIET_PROFILE_SCORE_TUNING.gymMuscleGain.lowCaloriesPenalty,
        reason: 'light calories for a muscle-gain goal',
      });
    }

    if ((nutrition.sugar100g ?? 0) > 18) {
      adjustments.push({
        id: 'gym-sugar',
        impact: DIET_PROFILE_SCORE_TUNING.gymMuscleGain.sugarPenalty,
        reason: 'extra sugar around a muscle-gain goal',
      });
    }

    if (countKeywordMatches(ingredients, DIET_PROFILE_KEYWORDS.proteinBoosters) > 0) {
      adjustments.push({
        id: 'gym-protein-booster',
        impact: DIET_PROFILE_SCORE_TUNING.gymMuscleGain.proteinBoosterReward,
        reason: 'added protein sources',
      });
    }
  }

  return adjustments;
}

export function getDietProfileDefinition(profileId: DietProfileId) {
  return (
    DIET_PROFILE_DEFINITIONS.find((profile) => profile.id === profileId) ||
    DIET_PROFILE_DEFINITIONS[0]
  );
}

export function applyDietProfile(
  product: ResolvedProduct,
  baseScore: ProductHealthScore,
  profileId: DietProfileId = DEFAULT_DIET_PROFILE_ID
): DietProfileAssessment {
  const profile = getDietProfileDefinition(profileId);
  const adjustments = buildProfileAdjustments(product, profileId);
  const scoreDelta = adjustments.reduce(
    (total, adjustment) => total + adjustment.impact,
    0
  );
  const score = clamp(baseScore.score + scoreDelta, 0, 100);
  const warnings = adjustments
    .filter((adjustment) => adjustment.impact < 0)
    .sort((left, right) => left.impact - right.impact)
    .map((adjustment) => adjustment.reason);
  const highlights = adjustments
    .filter((adjustment) => adjustment.impact > 0)
    .sort((left, right) => right.impact - left.impact)
    .map((adjustment) => adjustment.reason);

  return {
    adjustments,
    gradeLabel: getHealthScoreGradeLabel(score),
    highlights,
    profile,
    score,
    summary:
      profileId === DEFAULT_DIET_PROFILE_ID
        ? null
        : describeProfileAdjustments(adjustments),
    warnings,
  };
}
