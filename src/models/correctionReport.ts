import type { ProductFoodStatus } from '../utils/productType';
import type { ResultConfidence } from '../utils/resultAnalysis';

export type CorrectionReportReason =
  | 'wrong-score'
  | 'wrong-product-details'
  | 'bad-ingredient-read'
  | 'wrong-alternatives'
  | 'other';

export type CorrectionReportStatus = 'open' | 'reviewing' | 'resolved';
export type CorrectionReportType = 'issue-report' | 'trust-confirmation';
export type TrustConfirmationType = 'looks-different' | 'matches-pack';

export type CorrectionReport = {
  barcode: string;
  confirmationCount?: number | null;
  confidence: ResultConfidence;
  createdAt: string;
  foodStatus: ProductFoodStatus;
  id: string;
  priorityScore: number;
  productName: string;
  reason: CorrectionReportReason;
  repeatBuyWeight?: number | null;
  reportType?: CorrectionReportType;
  reporterEmail: string | null;
  reporterName: string | null;
  reporterUid: string | null;
  resultSource: 'barcode' | 'ingredient-ocr';
  status: CorrectionReportStatus;
  summary: string;
  timelineSeverity?: 'high' | 'low' | 'medium' | null;
  topConcern: string | null;
  trustConfirmationType?: TrustConfirmationType | null;
};
