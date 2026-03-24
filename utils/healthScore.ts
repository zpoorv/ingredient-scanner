import {
  harmfulIngredientRules,
  type HarmfulIngredientRule,
} from '../constants/harmfulIngredients';

export type HarmfulIngredientMatch = {
  id: string;
  keyword: string;
  label: string;
  penalty: number;
};

function normalizeIngredientValue(value: string) {
  return value.toLowerCase().replace(/[()%.]/g, ' ').replace(/\s+/g, ' ').trim();
}

function findRuleMatch(
  normalizedValue: string,
  rule: HarmfulIngredientRule
): HarmfulIngredientMatch | null {
  const matchedKeyword = rule.keywords.find((keyword) =>
    normalizedValue.includes(normalizeIngredientValue(keyword))
  );

  if (!matchedKeyword) {
    return null;
  }

  return {
    id: rule.id,
    keyword: matchedKeyword,
    label: rule.label,
    penalty: rule.penalty,
  };
}

export function splitIngredients(ingredientsText: string): string[] {
  return ingredientsText
    .split(',')
    .map((ingredient) => ingredient.trim())
    .filter(Boolean);
}

export function findHarmfulIngredients(
  ingredientsText?: string | null
): HarmfulIngredientMatch[] {
  if (!ingredientsText?.trim()) {
    return [];
  }

  const uniqueMatches = new Map<string, HarmfulIngredientMatch>();

  // Deduplicate rule hits so one ingredient repeated in the label only counts once.
  for (const segment of splitIngredients(ingredientsText)) {
    const normalizedSegment = normalizeIngredientValue(segment);

    for (const rule of harmfulIngredientRules) {
      const match = findRuleMatch(normalizedSegment, rule);

      if (match && !uniqueMatches.has(match.id)) {
        uniqueMatches.set(match.id, match);
      }
    }
  }

  return Array.from(uniqueMatches.values());
}

export function isHarmfulIngredientSegment(segment: string): boolean {
  return findHarmfulIngredients(segment).length > 0;
}

export function calculateHealthScore(
  ingredientsText?: string | null
): number | null {
  if (!ingredientsText?.trim()) {
    return null;
  }

  const harmfulMatches = findHarmfulIngredients(ingredientsText);
  const penaltyTotal = harmfulMatches.reduce(
    (runningTotal, ingredient) => runningTotal + ingredient.penalty,
    0
  );

  return Math.max(0, 100 - penaltyTotal);
}
