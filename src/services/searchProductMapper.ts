import type { SearchProductDocument } from '../models/search';
import type { ResolvedProduct } from '../types/product';

export function mapSearchDocumentToResolvedProduct(
  document: SearchProductDocument
): ResolvedProduct {
  return {
    additiveCount: 0,
    additiveTags: [],
    adminMetadata: document.adminMetadata ?? null,
    allergens: document.allergens,
    barcode: document.barcode,
    brand: document.brand,
    categories: document.categories,
    code: document.code,
    ecoScore: document.ecoScore,
    imageUrl: document.imageUrl,
    ingredientsImageUrl: null,
    ingredientsText: document.ingredientsText,
    labels: document.labels,
    name: document.name,
    nameReason: null,
    novaGroup: document.novaGroup,
    nutrition: {
      ...document.nutrition,
    },
    nutritionImageUrl: null,
    nutriScore: document.nutriScore,
    origins: [],
    packagingDetails: [],
    quantity: document.quantity,
    recipe: null,
    sources: [
      {
        id: 'search_index',
        label: 'Fast Search Index',
        note: 'Loaded from Inqoura fast search and rechecked in the background.',
        status: 'used',
      },
    ],
  };
}
