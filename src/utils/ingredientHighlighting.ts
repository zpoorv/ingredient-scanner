import {
  harmfulIngredientRules,
  type HarmfulIngredientRule,
  type IngredientRiskLevel,
} from '../constants/harmfulIngredients';

export type IngredientInput = string | string[] | null | undefined;

export type IngredientRuleMatch = {
  id: string;
  keyword: string;
  label: string;
  penalty: number;
  risk: Exclude<IngredientRiskLevel, 'safe'>;
};

export type HighlightedIngredient = {
  id: string;
  ingredient: string;
  normalizedIngredient: string;
  risk: IngredientRiskLevel;
  match: IngredientRuleMatch | null;
};

const keywordPatternCache = new Map<string, RegExp>();

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function normalizeIngredientValue(value: string) {
  return value
    .toLowerCase()
    .replace(/^ingredients?\s*[:\-]?\s*/i, '')
    .replace(/[()[\]{}%.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitIngredientChunk(value: string) {
  return value
    .split(/,(?![^()]*\))|;(?![^()]*\))/)
    .map((ingredient) => ingredient.trim())
    .filter(Boolean);
}

export function toIngredientList(input: IngredientInput): string[] {
  if (!input) {
    return [];
  }

  if (Array.isArray(input)) {
    return input.flatMap((item) => splitIngredientChunk(item));
  }

  return splitIngredientChunk(input);
}

function createKeywordPattern(keyword: string) {
  const cachedPattern = keywordPatternCache.get(keyword);

  if (cachedPattern) {
    return cachedPattern;
  }

  const normalizedKeyword = normalizeIngredientValue(keyword);
  const pattern = normalizedKeyword
    .split(' ')
    .map((part) => escapeRegExp(part))
    .join('\\s+');

  const compiledPattern = new RegExp(`(?:^|\\b)${pattern}(?:\\b|$)`, 'i');
  keywordPatternCache.set(keyword, compiledPattern);

  return compiledPattern;
}

function findRuleMatch(
  normalizedIngredient: string,
  rule: HarmfulIngredientRule
): IngredientRuleMatch | null {
  const matchedKeyword = rule.keywords.find((keyword) =>
    createKeywordPattern(keyword).test(normalizedIngredient)
  );

  if (!matchedKeyword) {
    return null;
  }

  return {
    id: rule.id,
    keyword: matchedKeyword,
    label: rule.label,
    penalty: rule.penalty,
    risk: rule.risk,
  };
}

function compareRuleMatches(
  currentBest: IngredientRuleMatch | null,
  candidate: IngredientRuleMatch
) {
  if (!currentBest) {
    return candidate;
  }

  if (candidate.penalty !== currentBest.penalty) {
    return candidate.penalty > currentBest.penalty ? candidate : currentBest;
  }

  return candidate.risk === 'high-risk' ? candidate : currentBest;
}

export function highlightIngredients(
  input: IngredientInput
): HighlightedIngredient[] {
  return toIngredientList(input).map((ingredient, index) => {
    const normalizedIngredient = normalizeIngredientValue(ingredient);
    let bestMatch: IngredientRuleMatch | null = null;

    for (const rule of harmfulIngredientRules) {
      const ruleMatch = findRuleMatch(normalizedIngredient, rule);

      if (ruleMatch) {
        bestMatch = compareRuleMatches(bestMatch, ruleMatch);
      }
    }

    return {
      id: `${normalizedIngredient || ingredient}-${index}`,
      ingredient,
      normalizedIngredient,
      risk: bestMatch?.risk || 'safe',
      match: bestMatch,
    };
  });
}
