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
    adminGradeLabel: '',
    adminScore: '',
    adminSummary: '',
    adminVerdict: '',
    allergens: '',
    barcode,
    brand: '',
    calories100g: '',
    categories: '',
    fiber100g: '',
    healthierAlternatives: '',
    imageUrl: '',
    ingredientsText: '',
    labels: '',
    name: '',
    nameReason: '',
    notes: '',
    protein100g: '',
    quantity: '',
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

function buildDraft(barcode, offProduct, override) {
  const nutrition = { ...offNutrition(offProduct), ...(override?.nutrition || {}) };

  return {
    additiveTags: formatCommaList(override?.additiveTags || offProduct?.additives_tags || []),
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
    fiber100g: inputValue(nutrition.fiber100g),
    healthierAlternatives: formatAlternativeLines(override?.healthierAlternatives || []),
    imageUrl: override?.imageUrl ?? offProduct?.image_front_url ?? '',
    ingredientsText: override?.ingredientsText ?? offProduct?.ingredients_text ?? '',
    labels: formatCommaList(
      normalizeListSource(override?.labels || offProduct?.labels)
    ),
    name: override?.name ?? offProduct?.product_name ?? '',
    nameReason: override?.nameReason ?? '',
    notes: override?.notes ?? '',
    protein100g: inputValue(nutrition.protein100g),
    quantity: override?.quantity ?? offProduct?.quantity ?? '',
    salt100g: inputValue(nutrition.salt100g),
    saturatedFat100g: inputValue(nutrition.saturatedFat100g),
    sourceNote: override?.sourceNote ?? '',
    sugar100g: inputValue(nutrition.sugar100g),
  };
}

export function toOverridePayload(formValue) {
  return {
    additiveTags: parseCommaList(formValue.additiveTags),
    adminGradeLabel: formValue.adminGradeLabel.trim() || null,
    adminScore: nullableNumber(formValue.adminScore),
    adminSummary: formValue.adminSummary.trim() || null,
    adminVerdict: formValue.adminVerdict.trim() || null,
    allergens: parseCommaList(formValue.allergens),
    barcode: formValue.barcode,
    brand: formValue.brand.trim() || null,
    categories: parseCommaList(formValue.categories),
    healthierAlternatives: parseAlternativeLines(formValue.healthierAlternatives),
    imageUrl: formValue.imageUrl.trim() || null,
    ingredientsText: formValue.ingredientsText.trim() || null,
    labels: parseCommaList(formValue.labels),
    name: formValue.name.trim() || null,
    nameReason: formValue.nameReason.trim() || null,
    notes: formValue.notes.trim() || null,
    nutrition: {
      calories100g: nullableNumber(formValue.calories100g),
      fiber100g: nullableNumber(formValue.fiber100g),
      protein100g: nullableNumber(formValue.protein100g),
      salt100g: nullableNumber(formValue.salt100g),
      saturatedFat100g: nullableNumber(formValue.saturatedFat100g),
      sugar100g: nullableNumber(formValue.sugar100g),
    },
    quantity: formValue.quantity.trim() || null,
    sourceNote: formValue.sourceNote.trim() || null,
    updatedAt: new Date().toISOString(),
  };
}

export function saveOverride(barcode, payload) {
  return saveProductOverride(barcode, payload);
}

export function removeOverride(barcode) {
  return deleteProductOverride(barcode);
}
