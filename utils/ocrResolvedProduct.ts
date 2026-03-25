import type { ResolvedProduct } from '../services/productLookup';

type BuildOcrResolvedProductInput = {
  ingredientsText: string;
  qualityNotes: string[];
  rawText: string;
  sourceImageUri: string;
};

function extractAdditiveTags(ingredientsText: string) {
  const matches =
    ingredientsText.match(/\b(?:e\s?\d{3,4}[a-z]?|ins\s?\d{3,4}[a-z]?)\b/gi) || [];

  return Array.from(new Set(matches.map((match) => match.toUpperCase().replace(/\s+/g, ' '))));
}

function extractAllergenHints(rawText: string) {
  const containsMatch = rawText.match(/contains[:\s]+([^.]+)/i);

  if (!containsMatch?.[1]) {
    return [];
  }

  return containsMatch[1]
    .split(/,|and/i)
    .map((value) => value.trim())
    .filter(Boolean);
}

export function buildResolvedProductFromOcr({
  ingredientsText,
  qualityNotes,
  rawText,
  sourceImageUri,
}: BuildOcrResolvedProductInput): ResolvedProduct {
  const additiveTags = extractAdditiveTags(ingredientsText);

  return {
    additiveCount: additiveTags.length,
    additiveTags,
    allergens: extractAllergenHints(rawText),
    barcode: 'OCR',
    brand: null,
    categories: ['Ingredient Label Scan'],
    code: `ocr-${Date.now()}`,
    ecoScore: null,
    imageUrl: sourceImageUri,
    ingredientsImageUrl: sourceImageUri,
    ingredientsText,
    labels: [],
    name: 'Ingredient Label Scan',
    nameReason: qualityNotes[0] || 'Built from OCR text captured from a photographed ingredient list.',
    novaGroup: null,
    nutrition: {},
    nutritionImageUrl: null,
    nutriScore: null,
    quantity: null,
    sources: [
      {
        id: 'ingredient_ocr',
        label: 'Ingredient Label OCR',
        note:
          qualityNotes[0] ||
          'Ingredients were extracted from the photographed label and analyzed locally.',
        status: 'used',
      },
    ],
  };
}
