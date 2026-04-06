import type { HealthScoreGrade } from '../constants/productHealthScore';
import type { ResolvedNutrition } from '../types/product';

export type ProductOverrideLink = {
  description: string;
  label: string;
  url: string;
};

export type ProductOverrideRecord = {
  adminGradeLabel?: HealthScoreGrade | null;
  adminPriorityScore?: number | null;
  adminScore?: number | null;
  adminSummary?: string | null;
  adminVerdict?: string | null;
  additiveTags?: string[] | null;
  allergens?: string[] | null;
  alternativeLinks?: ProductOverrideLink[] | null;
  barcode: string;
  brand?: string | null;
  categories?: string[] | null;
  code?: string | null;
  createdAt?: string | null;
  ecoScore?: string | null;
  imageUrl?: string | null;
  ingredientsText?: string | null;
  labels?: string[] | null;
  name?: string | null;
  nameReason?: string | null;
  novaGroup?: number | null;
  notes?: string | null;
  nutriScore?: string | null;
  product_name?: string | null;
  productNameSearch?: string | null;
  reviewBadgeCopy?: string | null;
  reviewStatus?: 'draft' | 'improved' | 'reviewed' | null;
  searchKeywords?: string[] | null;
  sourceNote?: string | null;
  sourceType?: 'admin' | 'scan' | null;
  healthierAlternatives?: ProductOverrideLink[] | null;
  nutrition?: Partial<ResolvedNutrition> | null;
  quantity?: string | null;
  updatedAt?: string | null;
};
