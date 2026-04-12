import {
  deleteProductOverride,
  loadProductOverride,
  saveProductOverride,
} from './firebase-client.js';
import {
  formatAlternativeLines,
  formatCommaList,
  inputValue,
  nullableNumber,
  parseAlternativeLines,
  parseCommaList,
} from './shared.js';

const OFF_FIELDS = 'product_name,brands,image_front_url,ingredients_text,quantity,categories,labels,allergens,additives_tags,nutriments';

export async function loadEditableProduct(barcode) {
  const [override, offProduct] = await Promise.all([
    loadProductOverride(barcode),
    fetchOpenFoodFactsProduct(barcode),
  ]);

  return {
    draft: buildDraft(barcode, offProduct, override),
    hasOverride: Boolean(override),
    offProduct,
    override,
  };
}

export function buildEmptyProductDraft(barcode) {
  return {
    additiveTags: '',
    adminPriorityScore: '',
    adminGradeLabel: '',
    adminScore: '',
    adminSummary: '',
    adminVerdict: '',
    allergens: '',
    barcode,
    brand: '',
    calories100g: '',
    categories: '',
    featuredNote: '',
    featuredRank: '',
    fiber100g: '',
    healthierAlternatives: '',
    imageUrl: '',
    ingredientsText: '',
    isFeatured: false,
    labels: '',
    name: '',
    nameReason: '',
    notes: '',
    protein100g: '',
    quantity: '',
    recipe: '',
    reviewBadgeCopy: '',
    reviewStatus: '',
    salt100g: '',
    saturatedFat100g: '',
    sourceNote: '',
    sugar100g: '',
  };
}

async function fetchOpenFoodFactsProduct(barcode) {
  const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}?fields=${OFF_FIELDS}`);
  const payload = await response.json();
  return payload.product || null;
}

function offNutrition(product) {
  const nutriments = product?.nutriments || {};
  return {
    calories100g: nutriments['energy-kcal_100g'] ?? null,
    fiber100g: nutriments.fiber_100g ?? null,
    protein100g: nutriments.proteins_100g ?? null,
    salt100g: nutriments.salt_100g ?? null,
    saturatedFat100g: nutriments['saturated-fat_100g'] ?? null,
    sugar100g: nutriments.sugars_100g ?? null,
  };
}

function normalizeListSource(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    return value.split(',');
  }

  return [];
}

function normalizeSearchValue(value) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function addKeywordVariants(keywords, value) {
  const normalizedValue = normalizeSearchValue(value);

  if (!normalizedValue) {
    return;
  }

  keywords.add(normalizedValue);

  for (let index = 2; index <= Math.min(normalizedValue.length, 32); index += 1) {
    keywords.add(normalizedValue.slice(0, index));
  }

  normalizedValue
    .split(' ')
    .filter(Boolean)
    .forEach((part) => {
      for (let index = 2; index <= Math.min(part.length, 20); index += 1) {
        keywords.add(part.slice(0, index));
      }
    });
}

function buildSearchKeywords(value, extraValues = []) {
  const keywords = new Set();

  addKeywordVariants(keywords, value);
  extraValues.forEach((item) => addKeywordVariants(keywords, item));

  return [...keywords].slice(0, 80);
}

function buildDraft(barcode, offProduct, override) {
  const nutrition = { ...offNutrition(offProduct), ...(override?.nutrition || {}) };

  return {
    additiveTags: formatCommaList(override?.additiveTags || offProduct?.additives_tags || []),
    adminPriorityScore: inputValue(override?.adminPriorityScore),
    adminGradeLabel: override?.adminGradeLabel ?? '',
    adminScore: inputValue(override?.adminScore),
    adminSummary: override?.adminSummary ?? '',
    adminVerdict: override?.adminVerdict ?? '',
    allergens: formatCommaList(
      normalizeListSource(override?.allergens || offProduct?.allergens)
    ),
    barcode,
    brand: override?.brand ?? offProduct?.brands ?? '',
    calories100g: inputValue(nutrition.calories100g),
    categories: formatCommaList(
      normalizeListSource(override?.categories || offProduct?.categories)
    ),
    featuredNote: override?.featuredNote ?? '',
    featuredRank: inputValue(override?.featuredRank),
    fiber100g: inputValue(nutrition.fiber100g),
    healthierAlternatives: formatAlternativeLines(override?.healthierAlternatives || []),
    imageUrl: override?.imageUrl ?? offProduct?.image_front_url ?? '',
    ingredientsText: override?.ingredientsText ?? offProduct?.ingredients_text ?? '',
    isFeatured: Boolean(override?.isFeatured),
    labels: formatCommaList(
      normalizeListSource(override?.labels || offProduct?.labels)
    ),
    name: override?.name ?? offProduct?.product_name ?? '',
    nameReason: override?.nameReason ?? '',
    notes: override?.notes ?? '',
    protein100g: inputValue(nutrition.protein100g),
    quantity: override?.quantity ?? offProduct?.quantity ?? '',
    recipe: override?.recipe ?? '',
    reviewBadgeCopy: override?.reviewBadgeCopy ?? '',
    reviewStatus: override?.reviewStatus ?? '',
    salt100g: inputValue(nutrition.salt100g),
    saturatedFat100g: inputValue(nutrition.saturatedFat100g),
    sourceNote: override?.sourceNote ?? '',
    sugar100g: inputValue(nutrition.sugar100g),
  };
}

export function toOverridePayload(formValue) {
  const name = formValue.name.trim();
  const updatedAt = new Date().toISOString();

  return {
    additiveTags: parseCommaList(formValue.additiveTags),
    adminPriorityScore: nullableNumber(formValue.adminPriorityScore),
    adminGradeLabel: formValue.adminGradeLabel.trim() || null,
    adminScore: nullableNumber(formValue.adminScore),
    adminSummary: formValue.adminSummary.trim() || null,
    adminVerdict: formValue.adminVerdict.trim() || null,
    allergens: parseCommaList(formValue.allergens),
    barcode: formValue.barcode,
    brand: formValue.brand.trim() || null,
    categories: parseCommaList(formValue.categories),
    code: formValue.barcode,
    createdAt: updatedAt,
    ecoScore: null,
    featuredNote: formValue.featuredNote.trim() || null,
    featuredRank: nullableNumber(formValue.featuredRank),
    healthierAlternatives: parseAlternativeLines(formValue.healthierAlternatives),
    imageUrl: formValue.imageUrl.trim() || null,
    ingredientsText: formValue.ingredientsText.trim() || null,
    isFeatured: Boolean(formValue.isFeatured),
    labels: parseCommaList(formValue.labels),
    name: name || null,
    nameReason: formValue.nameReason.trim() || null,
    novaGroup: null,
    notes: formValue.notes.trim() || null,
    nutriScore: null,
    nutrition: {
      calories100g: nullableNumber(formValue.calories100g),
      fiber100g: nullableNumber(formValue.fiber100g),
      protein100g: nullableNumber(formValue.protein100g),
      salt100g: nullableNumber(formValue.salt100g),
      saturatedFat100g: nullableNumber(formValue.saturatedFat100g),
      sugar100g: nullableNumber(formValue.sugar100g),
    },
    productNameSearch: normalizeSearchValue(name),
    product_name: name || null,
    quantity: formValue.quantity.trim() || null,
    recipe: formValue.recipe.trim() || null,
    reviewBadgeCopy: formValue.reviewBadgeCopy.trim() || null,
    reviewStatus: formValue.reviewStatus.trim() || null,
    searchKeywords: buildSearchKeywords(name, [formValue.brand, formValue.barcode]),
    sourceNote: formValue.sourceNote.trim() || null,
    sourceType: 'admin',
    updatedAt,
  };
}

export function saveOverride(barcode, payload) {
  return saveProductOverride(barcode, payload);
}

export function removeOverride(barcode) {
  return deleteProductOverride(barcode);
}
