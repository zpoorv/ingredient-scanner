import type { HouseholdFitResult } from './householdFit';
import type { ResolvedNutrition, ResolvedProduct } from '../types/product';

export type SearchProductDocument = {
  adminMetadata?: ResolvedProduct['adminMetadata'] | null;
  allergens: string[];
  barcode: string;
  brand: string | null;
  categories: string[];
  code: string;
  ecoScore: string | null;
  id: string;
  imageUrl: string | null;
  ingredientsText: string | null;
  labels: string[];
  name: string;
  novaGroup: number | null;
  nutrition: Partial<ResolvedNutrition>;
  nutriScore: string | null;
  popularity: number;
  quantity: string | null;
  searchableAliases: string[];
};

export type SearchSuggestion = {
  id: string;
  popularity: number;
  query: string;
  type: 'suggestion';
  sourceLabel: 'algolia' | 'recent';
};

export type SearchProductHit = {
  householdFit?: HouseholdFitResult | null;
  id: string;
  isFavorite: boolean;
  objectID?: string | null;
  position?: number | null;
  product: ResolvedProduct;
  queryId?: string | null;
  sourceLabel: 'catalog' | 'saved';
  type: 'product';
};

export type SearchFallbackAction = {
  id: string;
  label: string;
  query: string;
  type: 'fallback';
};

export type UnifiedSearchResult =
  | SearchFallbackAction
  | SearchProductHit
  | SearchSuggestion;

export type SearchSection = {
  id: 'catalog' | 'fallback' | 'personal' | 'suggestions';
  results: UnifiedSearchResult[];
  title: string;
};

export type SearchExperience = {
  query: string;
  sections: SearchSection[];
  usedRemoteSearch: boolean;
};
