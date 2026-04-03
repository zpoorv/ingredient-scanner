export type ProductTimelineChangeField =
  | 'additives'
  | 'allergens'
  | 'ingredients'
  | 'review-status'
  | 'score';

export type ProductTimelineSeverity = 'high' | 'medium' | 'low';

export type ProductTimelineEntry = {
  barcode: string;
  changedFields: ProductTimelineChangeField[];
  detectedAt: string;
  id: string;
  previousReviewStatus: 'draft' | 'improved' | 'reviewed' | null;
  previousScannedAt: string | null;
  previousScore: number | null;
  productName: string;
  reviewStatus: 'draft' | 'improved' | 'reviewed' | null;
  score: number | null;
  scoreDelta: number | null;
  severity: ProductTimelineSeverity;
  summary: string;
};
