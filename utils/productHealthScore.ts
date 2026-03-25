import type { ResolvedProduct } from '../services/productLookup';
import {
  HEALTH_SCORE_BASE,
  HEALTH_SCORE_EXPLANATION_REASON_COUNT,
  HEALTH_SCORE_GRADE_BANDS,
  HEALTH_SCORE_LONG_LIST_PENALTIES,
  HEALTH_SCORE_MISSING_INGREDIENTS_PENALTY,
  HEALTH_SCORE_RECOGNIZABLE_RATIO_ADJUSTMENTS,
  HEALTH_SCORE_RULE_GROUPS,
  HEALTH_SCORE_SHORT_LIST_REWARDS,
  RECOGNIZABLE_INGREDIENT_KEYWORDS,
  UNRECOGNIZABLE_INGREDIENT_MARKERS,
  type HealthScoreGrade,
  type HealthScoreRuleGroup,
} from '../constants/productHealthScore';
import {
  normalizeIngredientValue,
  toIngredientList,
} from './ingredientHighlighting';

export type ProductHealthScoreAdjustment = {
  id: string;
  impact: number;
  reason: string;
};

export type ProductHealthScore = {
  adjustments: ProductHealthScoreAdjustment[];
  explanation: string;
  gradeLabel: HealthScoreGrade;
  recognizableIngredientCount: number;
  score: number;
  totalIngredientCount: number;
};

function clamp(value: number, minValue: number, maxValue: number) {
  return Math.max(minValue, Math.min(maxValue, value));
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createKeywordPattern(keyword: string) {
  const normalizedKeyword = normalizeIngredientValue(keyword);
  const pattern = normalizedKeyword
    .split(' ')
    .map((part) => escapeRegExp(part))
    .join('\\s+');

  return new RegExp(`(?:^|\\b)${pattern}(?:\\b|$)`, 'i');
}

function getGradeLabel(score: number): HealthScoreGrade {
  return (
    HEALTH_SCORE_GRADE_BANDS.find((band) => score >= band.minScore)?.grade || 'F'
  );
}

function getRecognizableIngredientCount(normalizedIngredients: string[]) {
  return normalizedIngredients.filter((ingredient) => {
    if (!ingredient) {
      return false;
    }

    if (
      UNRECOGNIZABLE_INGREDIENT_MARKERS.some((marker) =>
        ingredient.includes(marker)
      )
    ) {
      return false;
    }

    if (/\b\d/.test(ingredient) || /\be ?\d{3,4}[a-z]?\b/i.test(ingredient)) {
      return false;
    }

    if (
      RECOGNIZABLE_INGREDIENT_KEYWORDS.some((keyword) =>
        createKeywordPattern(keyword).test(ingredient)
      )
    ) {
      return true;
    }

    const words = ingredient.split(' ').filter(Boolean);

    return words.length > 0 && words.length <= 3 && /^[a-z\s-]+$/.test(ingredient);
  }).length;
}

function buildIngredientCountAdjustment(totalIngredientCount: number) {
  if (totalIngredientCount === 0) {
    return {
      id: 'missing-ingredients',
      impact: -HEALTH_SCORE_MISSING_INGREDIENTS_PENALTY,
      reason: 'limited ingredient data',
    };
  }

  const shortListReward = HEALTH_SCORE_SHORT_LIST_REWARDS.find(
    (tier) => totalIngredientCount <= tier.maxIngredients
  );

  if (shortListReward) {
    return {
      id: `short-list-${shortListReward.maxIngredients}`,
      impact: shortListReward.points,
      reason: shortListReward.reason,
    };
  }

  const longListPenalty = [...HEALTH_SCORE_LONG_LIST_PENALTIES]
    .reverse()
    .find((tier) => totalIngredientCount >= tier.minIngredients);

  if (longListPenalty) {
    return {
      id: `long-list-${longListPenalty.minIngredients}`,
      impact: longListPenalty.points,
      reason: longListPenalty.reason,
    };
  }

  return null;
}

function buildRecognizableRatioAdjustment(
  totalIngredientCount: number,
  recognizableIngredientCount: number
) {
  if (totalIngredientCount === 0) {
    return null;
  }

  const recognizableRatio = recognizableIngredientCount / totalIngredientCount;
  const ratioAdjustment = [...HEALTH_SCORE_RECOGNIZABLE_RATIO_ADJUSTMENTS]
    .sort((left, right) => (right.minRatio || 0) - (left.minRatio || 0))
    .find((adjustment) => {
      if (
        adjustment.minRatio !== undefined &&
        recognizableRatio < adjustment.minRatio
      ) {
        return false;
      }

      if (
        adjustment.maxRatio !== undefined &&
        recognizableRatio > adjustment.maxRatio
      ) {
        return false;
      }

      return true;
    });

  if (!ratioAdjustment) {
    return null;
  }

  return {
    id: `recognizable-ratio-${ratioAdjustment.points}`,
    impact: ratioAdjustment.points,
    reason: ratioAdjustment.reason,
  };
}

function getRuleMatchCount(
  normalizedIngredients: string[],
  ruleGroup: HealthScoreRuleGroup
) {
  const matchedIngredients = new Set<string>();

  for (const ingredient of normalizedIngredients) {
    if (!ingredient) {
      continue;
    }

    const keywordMatch = ruleGroup.keywords.some((keyword) =>
      createKeywordPattern(keyword).test(ingredient)
    );
    const regexMatch = ruleGroup.regexPatterns?.some((pattern) =>
      new RegExp(pattern, 'i').test(ingredient)
    );

    if (keywordMatch || regexMatch) {
      matchedIngredients.add(ingredient);
    }
  }

  return matchedIngredients.size;
}

function buildRuleAdjustments(normalizedIngredients: string[]) {
  return HEALTH_SCORE_RULE_GROUPS.flatMap((ruleGroup) => {
    const matchCount = getRuleMatchCount(normalizedIngredients, ruleGroup);

    if (matchCount === 0) {
      return [];
    }

    return [
      {
        id: ruleGroup.id,
        impact: -Math.min(matchCount * ruleGroup.penalty, ruleGroup.cap),
        reason: ruleGroup.label,
      },
    ];
  });
}

function buildScoreExplanation(adjustments: ProductHealthScoreAdjustment[]) {
  const visibleAdjustments = adjustments.filter((adjustment) => adjustment.reason);

  if (visibleAdjustments.length === 0) {
    return 'Simple ingredient patterns supported a balanced score.';
  }

  const sortedAdjustments = [...visibleAdjustments]
    .sort((left, right) => Math.abs(right.impact) - Math.abs(left.impact))
    .slice(0, HEALTH_SCORE_EXPLANATION_REASON_COUNT);
  const penalties = sortedAdjustments
    .filter((adjustment) => adjustment.impact < 0)
    .map((adjustment) => adjustment.reason);
  const rewards = sortedAdjustments
    .filter((adjustment) => adjustment.impact > 0)
    .map((adjustment) => adjustment.reason);

  if (penalties.length > 0 && rewards.length > 0) {
    return `${rewards.join(' and ')} helped, but ${penalties.join(' and ')} lowered the score.`;
  }

  if (penalties.length > 0) {
    return `${penalties.join(' and ')} lowered the score.`;
  }

  return `${rewards.join(' and ')} supported a higher score.`;
}

export function scoreIngredientsHealth(
  ingredientInput?: string | string[] | null
): ProductHealthScore {
  const ingredients = toIngredientList(ingredientInput);
  const normalizedIngredients = ingredients.map(normalizeIngredientValue);
  const recognizableIngredientCount =
    getRecognizableIngredientCount(normalizedIngredients);
  const adjustments: ProductHealthScoreAdjustment[] = [];

  const ingredientCountAdjustment = buildIngredientCountAdjustment(ingredients.length);
  const recognizableRatioAdjustment = buildRecognizableRatioAdjustment(
    ingredients.length,
    recognizableIngredientCount
  );

  if (ingredientCountAdjustment) {
    adjustments.push(ingredientCountAdjustment);
  }

  if (recognizableRatioAdjustment) {
    adjustments.push(recognizableRatioAdjustment);
  }

  adjustments.push(...buildRuleAdjustments(normalizedIngredients));

  const score = clamp(
    Math.round(
      HEALTH_SCORE_BASE +
        adjustments.reduce((total, adjustment) => total + adjustment.impact, 0)
    ),
    0,
    100
  );

  return {
    adjustments,
    explanation: buildScoreExplanation(adjustments),
    gradeLabel: getGradeLabel(score),
    recognizableIngredientCount,
    score,
    totalIngredientCount: ingredients.length,
  };
}

export function scoreProductHealth(product: ResolvedProduct): ProductHealthScore {
  return scoreIngredientsHealth(product.ingredientsText);
}
