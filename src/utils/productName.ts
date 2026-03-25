const NUTRITION_MARKERS = [
  /nutritional info/i,
  /nutrition(?:al)? (?:facts|info|information)/i,
  /approx(?:imate)? value/i,
  /serving size/i,
  /nutritional values?/i,
  /\bper\s+\d+/i,
];

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function normalizeDisplayName(value: string) {
  const trimmedValue = value.trim().replace(/\s+/g, ' ');

  if (!trimmedValue) {
    return null;
  }

  if (
    trimmedValue === trimmedValue.toLowerCase() ||
    trimmedValue === trimmedValue.toUpperCase()
  ) {
    return toTitleCase(trimmedValue);
  }

  return trimmedValue;
}

function normalizeGenericCategoryName(value: string) {
  const cleanedValue = value.replace(/[-_/]+/g, ' ').trim();

  if (!cleanedValue) {
    return null;
  }

  return toTitleCase(cleanedValue.toLowerCase());
}

export function deriveProductNameFromCategories(
  categories?: string | string[] | null
): string | null {
  const categoryValues = Array.isArray(categories)
    ? categories
    : categories?.split(',') || [];
  const candidate =
    categoryValues
      .map((value) => value.trim())
      .find((value) => value.length > 0) || null;

  if (!candidate) {
    return null;
  }

  return normalizeGenericCategoryName(candidate) || normalizeDisplayName(candidate);
}

export function deriveProductNameFromIngredients(
  ingredientsText?: string | null
): string | null {
  if (!ingredientsText?.trim()) {
    return null;
  }

  let candidate = ingredientsText
    .replace(/^ingredients?\s*[:\-]?\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  for (const marker of NUTRITION_MARKERS) {
    const match = marker.exec(candidate);

    if (match?.index !== undefined) {
      candidate = candidate.slice(0, match.index).trim();
      break;
    }
  }

  if (candidate.includes(',')) {
    return null;
  }

  candidate = candidate
    .replace(/[*|:;()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const words = candidate
    .split(' ')
    .filter((word) => /[a-z]/i.test(word) && !/^\d/.test(word));

  if (words.length < 2 || words.length > 5) {
    return null;
  }

  return normalizeDisplayName(words.join(' '));
}
