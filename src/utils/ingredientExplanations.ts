import {
  mockIngredientExplanations,
  type IngredientExplanationEntry,
} from '../constants/ingredientExplanations';
import { normalizeIngredientValue } from './ingredientHighlighting';

export type IngredientExplanationLookup = {
  explanation: IngredientExplanationEntry | null;
  ingredientName: string;
  matchedAlias: string | null;
  normalizedIngredient: string;
  source: string;
};

export type IngredientExplanationProvider = {
  lookup: (ingredientName: string) => IngredientExplanationLookup;
  source: string;
};

const ADDITIVE_CATEGORY_PREFIX_PATTERN =
  /\b(?:preservatives?|emulsifiers?|emulsifying agent|acidity regulators?|acid regulators?|stabilizers?|stabilisers?|stablizers?|stablisers?)\b/gi;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createIngredientPattern(value: string) {
  const normalizedValue = normalizeIngredientValue(value);
  const pattern = normalizedValue
    .split(' ')
    .map((part) => escapeRegExp(part))
    .join('\\s+');

  return new RegExp(`(?:^|\\b)${pattern}(?:\\b|$)`, 'i');
}

function pushCandidate(target: string[], value: string) {
  const normalizedValue = normalizeIngredientValue(value);

  if (normalizedValue && !target.includes(normalizedValue)) {
    target.push(normalizedValue);
  }
}

function getIngredientCandidates(ingredientName: string) {
  const candidates: string[] = [];

  pushCandidate(
    candidates,
    ingredientName.replace(ADDITIVE_CATEGORY_PREFIX_PATTERN, ' ')
  );

  const rawSegments = ingredientName.split(/[()]/).map((segment) => segment.trim());

  for (const segment of rawSegments) {
    pushCandidate(candidates, segment);
    pushCandidate(
      candidates,
      segment.replace(ADDITIVE_CATEGORY_PREFIX_PATTERN, ' ')
    );
  }

  const normalizedIngredient = normalizeIngredientValue(ingredientName);
  const withoutCategoryPrefix = normalizedIngredient
    .replace(ADDITIVE_CATEGORY_PREFIX_PATTERN, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  pushCandidate(candidates, withoutCategoryPrefix);

  for (const token of withoutCategoryPrefix.split(/\s+/)) {
    if (/^(?:e)?\d{3,4}[a-z]?$/i.test(token)) {
      pushCandidate(candidates, token);
    }
  }

  pushCandidate(candidates, ingredientName);

  return candidates;
}

export function createStaticIngredientExplanationProvider(
  entries: IngredientExplanationEntry[]
): IngredientExplanationProvider {
  return {
    source: 'mock',
    lookup(ingredientName: string) {
      const normalizedIngredient = normalizeIngredientValue(ingredientName);
      let matchedEntry: IngredientExplanationEntry | null = null;
      let matchedAlias: string | null = null;
      const candidates = getIngredientCandidates(ingredientName);

      // Try more specific candidate fragments first so strings like
      // "stabilizer (E415)" resolve to "Xanthan Gum" before generic fallbacks.
      for (const candidate of candidates) {
        for (const entry of entries) {
          const alias = entry.aliases.find((candidateAlias) =>
            createIngredientPattern(candidateAlias).test(candidate)
          );

          if (alias) {
            matchedEntry = entry;
            matchedAlias = alias;
            break;
          }
        }

        if (matchedEntry) {
          break;
        }
      }

      return {
        explanation: matchedEntry,
        ingredientName,
        matchedAlias,
        normalizedIngredient,
        source: matchedEntry ? 'mock' : 'none',
      };
    },
  };
}

const defaultIngredientExplanationProvider =
  createStaticIngredientExplanationProvider(mockIngredientExplanations);

export function explainIngredient(
  ingredientName: string,
  provider: IngredientExplanationProvider = defaultIngredientExplanationProvider
) {
  return provider.lookup(ingredientName);
}
