import type {
  ProductOverrideLink,
  ProductOverrideRecord,
} from '../models/productOverride';
import type { ProductSourceInfo, ResolvedProduct } from '../types/product';
import { loadStoredProductRecord } from './productCatalogService';

const overrideCache = new Map<string, ProductOverrideRecord | null>();
const pendingOverrideLookups = new Map<string, Promise<ProductOverrideRecord | null>>();

function sanitizeStringArray(value: string[] | null | undefined) {
  return (value ?? []).map((item) => item.trim()).filter(Boolean);
}

function sanitizeAlternativeLinks(value: ProductOverrideLink[] | null | undefined) {
  return (value ?? [])
    .map((item) => ({
      description: item.description?.trim() || '',
      label: item.label?.trim() || '',
      url: item.url?.trim() || '',
    }))
    .filter((item) => item.label && item.description && item.url);
}

function sanitizeReviewStatus(
  value: ProductOverrideRecord['reviewStatus']
): 'draft' | 'improved' | 'reviewed' | null {
  if (value === 'draft' || value === 'improved' || value === 'reviewed') {
    return value;
  }

  return null;
}

function hasCustomAlternativesField(override: ProductOverrideRecord) {
  return Object.prototype.hasOwnProperty.call(override, 'healthierAlternatives');
}

function resolveStoredProductName(override: ProductOverrideRecord) {
  return override.name?.trim() || override.product_name?.trim() || null;
}

function isAdminManagedRecord(override: ProductOverrideRecord) {
  return override.sourceType !== 'scan';
}

function buildStoredProductSource(override: ProductOverrideRecord): ProductSourceInfo {
  if (isAdminManagedRecord(override)) {
    return {
      id: 'product_override',
      label: 'Inqoura Product Record',
      note:
        'This product uses details stored by Inqoura from admin updates or earlier scans.',
      status: 'used',
    };
  }

  return {
    id: 'open_food_facts',
    label: 'Open Food Facts',
    note:
      'Loaded from the Inqoura Firestore product cache created from an earlier Open Food Facts scan.',
    status: 'used',
  };
}

function resolveStoredProductNameReason(override: ProductOverrideRecord) {
  if (override.nameReason?.trim()) {
    return override.nameReason.trim();
  }

  if (isAdminManagedRecord(override)) {
    return 'This product name comes from an Inqoura admin-managed product record.';
  }

  return 'This product name was saved from an earlier Open Food Facts scan.';
}

function mergeNutrition(
  product: ResolvedProduct,
  override: ProductOverrideRecord
): ResolvedProduct['nutrition'] {
  if (!override.nutrition) {
    return product.nutrition;
  }

  return {
    ...product.nutrition,
    ...override.nutrition,
  };
}

export async function loadProductOverride(barcode: string) {
  if (overrideCache.has(barcode)) {
    return overrideCache.get(barcode) ?? null;
  }

  const pendingLookup = pendingOverrideLookups.get(barcode);

  if (pendingLookup) {
    return pendingLookup;
  }

  const lookupPromise = (async () => {
    try {
      const overrideValue = await loadStoredProductRecord(barcode);

      overrideCache.set(barcode, overrideValue);
      return overrideValue;
    } catch {
      overrideCache.set(barcode, null);
      return null;
    } finally {
      pendingOverrideLookups.delete(barcode);
    }
  })();

  pendingOverrideLookups.set(barcode, lookupPromise);
  return lookupPromise;
}

export function applyProductOverride(
  product: ResolvedProduct | null,
  override: ProductOverrideRecord | null
) {
  if (!override) {
    return product;
  }

  const overrideSource = buildStoredProductSource(override);
  const isAdminRecord = isAdminManagedRecord(override);

  if (!product) {
    return {
      additiveCount: sanitizeStringArray(override.additiveTags).length,
      additiveTags: sanitizeStringArray(override.additiveTags),
      adminMetadata: isAdminRecord
        ? {
            adminPriorityScore: override.adminPriorityScore ?? null,
            customGradeLabel: override.adminGradeLabel ?? null,
            customScore: override.adminScore ?? null,
            customSummary: override.adminSummary?.trim() || null,
            customVerdict: override.adminVerdict?.trim() || null,
            hasCustomAlternatives: hasCustomAlternativesField(override),
            hasManagedData: true,
            healthierAlternatives: sanitizeAlternativeLinks(
              override.healthierAlternatives
            ),
            notes: override.notes?.trim() || null,
            reviewBadgeCopy: override.reviewBadgeCopy?.trim() || null,
            reviewStatus: sanitizeReviewStatus(override.reviewStatus),
            sourceNote: override.sourceNote?.trim() || null,
            updatedAt: override.updatedAt?.trim() || null,
          }
        : null,
      allergens: sanitizeStringArray(override.allergens),
      barcode: override.barcode,
      brand: override.brand?.trim() || null,
      categories: sanitizeStringArray(override.categories),
      code: override.code?.trim() || override.barcode,
      ecoScore: override.ecoScore?.trim() || null,
      imageUrl: override.imageUrl?.trim() || null,
      ingredientsImageUrl: null,
      ingredientsText: override.ingredientsText?.trim() || null,
      labels: sanitizeStringArray(override.labels),
      name: resolveStoredProductName(override) || `Catalog entry ${override.barcode}`,
      nameReason: resolveStoredProductNameReason(override),
      novaGroup: override.novaGroup ?? null,
      nutrition: override.nutrition ?? {},
      nutritionImageUrl: null,
      nutriScore: override.nutriScore?.trim() || null,
      origins: [],
      packagingDetails: [],
      quantity: override.quantity?.trim() || null,
      sources: [overrideSource],
    };
  }

  const nextSources = product.sources.some((source) => source.id === overrideSource.id)
    ? product.sources
    : [overrideSource, ...product.sources];
  const additiveTags = sanitizeStringArray(override.additiveTags);

  return {
    ...product,
    additiveCount: additiveTags.length > 0 ? additiveTags.length : product.additiveCount,
    additiveTags: additiveTags.length > 0 ? additiveTags : product.additiveTags,
    adminMetadata: isAdminRecord
      ? {
          customGradeLabel:
            override.adminGradeLabel ?? product.adminMetadata?.customGradeLabel ?? null,
          adminPriorityScore:
            override.adminPriorityScore ?? product.adminMetadata?.adminPriorityScore ?? null,
          customScore: override.adminScore ?? product.adminMetadata?.customScore ?? null,
          customSummary:
            override.adminSummary?.trim() || product.adminMetadata?.customSummary || null,
          customVerdict:
            override.adminVerdict?.trim() || product.adminMetadata?.customVerdict || null,
          hasCustomAlternatives: hasCustomAlternativesField(override),
          hasManagedData: true,
          healthierAlternatives: sanitizeAlternativeLinks(
            override.healthierAlternatives
          ),
          notes: override.notes?.trim() || product.adminMetadata?.notes || null,
          reviewBadgeCopy:
            override.reviewBadgeCopy?.trim() ||
            product.adminMetadata?.reviewBadgeCopy ||
            null,
          reviewStatus:
            sanitizeReviewStatus(override.reviewStatus) ??
            product.adminMetadata?.reviewStatus ??
            null,
          sourceNote: override.sourceNote?.trim() || product.adminMetadata?.sourceNote || null,
          updatedAt: override.updatedAt?.trim() || product.adminMetadata?.updatedAt || null,
        }
      : product.adminMetadata ?? null,
    allergens:
      sanitizeStringArray(override.allergens).length > 0
        ? sanitizeStringArray(override.allergens)
        : product.allergens,
    brand: override.brand?.trim() || product.brand,
    categories:
      sanitizeStringArray(override.categories).length > 0
        ? sanitizeStringArray(override.categories)
        : product.categories,
    imageUrl: override.imageUrl?.trim() || product.imageUrl,
    ingredientsText: override.ingredientsText?.trim() || product.ingredientsText,
    labels:
      sanitizeStringArray(override.labels).length > 0
        ? sanitizeStringArray(override.labels)
        : product.labels,
    name: resolveStoredProductName(override) || product.name,
    nameReason: override.nameReason?.trim() || product.nameReason,
    novaGroup: override.novaGroup ?? product.novaGroup,
    nutrition: mergeNutrition(product, override),
    nutriScore: override.nutriScore?.trim() || product.nutriScore,
    quantity: override.quantity?.trim() || product.quantity,
    sources: nextSources,
  };
}
