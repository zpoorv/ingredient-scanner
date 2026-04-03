import type { DietProfileId } from '../constants/dietProfiles';
import type { HouseholdFitVerdict } from './householdFit';
import type { ResolvedProduct } from '../types/product';
import type { ResultConfidence } from '../utils/resultAnalysis';

export type TripDecision =
  | 'buy'
  | 'changed-product'
  | 'compare'
  | 'skip'
  | 'usual-buy';

export type ComparisonSessionEntry = {
  addedAt: string;
  barcode: string;
  categoryLabel: string | null;
  confidence: ResultConfidence;
  decisionSummary: string;
  decisionVerdict: string;
  householdBlockingReason: string | null;
  householdFitVerdict: HouseholdFitVerdict | null;
  isChangedProduct: boolean;
  name: string;
  product: ResolvedProduct;
  profileId: DietProfileId;
  topConcern: string | null;
  tripDecision: TripDecision;
};

export type TripSessionSummary = {
  bestHouseholdFitName: string | null;
  bestLowerImpactName: string | null;
  bestPickName: string | null;
  recapLine: string;
  replacementName: string | null;
};

export type CompletedTripSession = {
  endedAt: string;
  entries: ComparisonSessionEntry[];
  id: string;
  startedAt: string;
  summary: TripSessionSummary;
};

export type ComparisonSession = {
  entries: ComparisonSessionEntry[];
  recentTrips: CompletedTripSession[];
  tripId: string | null;
  tripStartedAt: string | null;
  updatedAt: string | null;
};
