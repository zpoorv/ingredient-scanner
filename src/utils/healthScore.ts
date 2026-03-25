import {
  highlightIngredients,
  toIngredientList,
} from './ingredientHighlighting';

export type HarmfulIngredientMatch = {
  id: string;
  keyword: string;
  label: string;
  penalty: number;
};

export function splitIngredients(ingredientsText: string): string[] {
  return toIngredientList(ingredientsText);
}

export function findHarmfulIngredients(
  ingredientsText?: string | null
): HarmfulIngredientMatch[] {
  if (!ingredientsText?.trim()) {
    return [];
  }

  const uniqueMatches = new Map<string, HarmfulIngredientMatch>();
  const highlightedIngredients = highlightIngredients(ingredientsText);

  for (const ingredient of highlightedIngredients) {
    if (ingredient.match && !uniqueMatches.has(ingredient.match.id)) {
      uniqueMatches.set(ingredient.match.id, {
        id: ingredient.match.id,
        keyword: ingredient.match.keyword,
        label: ingredient.match.label,
        penalty: ingredient.match.penalty,
      });
    }
  }

  return Array.from(uniqueMatches.values());
}

export function isHarmfulIngredientSegment(segment: string): boolean {
  return highlightIngredients([segment]).some(
    (ingredient) => ingredient.risk !== 'safe'
  );
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
