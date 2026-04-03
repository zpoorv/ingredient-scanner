import { addDoc, collection, getFirestore } from 'firebase/firestore';

import type {
  CorrectionReport,
  CorrectionReportReason,
  TrustConfirmationType,
} from '../models/correctionReport';
import type { ProductFoodStatus } from '../utils/productType';
import type { ResultConfidence } from '../utils/resultAnalysis';
import { getFirebaseAppInstance } from './firebaseApp';
import { getAuthSession } from '../store';

type SubmitCorrectionReportInput = {
  barcode: string;
  confirmationCount?: number | null;
  confidence: ResultConfidence;
  foodStatus: ProductFoodStatus;
  priorityScore: number;
  productName: string;
  reason: CorrectionReportReason;
  repeatBuyWeight?: number | null;
  reportType?: 'issue-report' | 'trust-confirmation';
  resultSource: 'barcode' | 'ingredient-ocr';
  summary: string;
  timelineSeverity?: 'high' | 'low' | 'medium' | null;
  topConcern: string | null;
  trustConfirmationType?: TrustConfirmationType | null;
};

function getDb() {
  return getFirestore(getFirebaseAppInstance());
}

export function buildCorrectionReportSummary(
  reason: CorrectionReportReason,
  topConcern: string | null
) {
  switch (reason) {
    case 'wrong-score':
      return topConcern
        ? `The score or verdict may be off for a product flagged around ${topConcern}.`
        : 'The score or verdict may not match this product.';
    case 'wrong-product-details':
      return 'The product name, image, brand, or key details look wrong.';
    case 'bad-ingredient-read':
      return 'The ingredient read looks partial, noisy, or clearly incorrect.';
    case 'wrong-alternatives':
      return 'The suggested alternatives do not seem like the right fit.';
    default:
      return 'This product may need a manual review.';
  }
}

export async function submitCorrectionReport(
  input: SubmitCorrectionReportInput
) {
  const session = getAuthSession();
  const now = new Date().toISOString();
  const report: Omit<CorrectionReport, 'id'> = {
    barcode: input.barcode,
    confirmationCount: input.confirmationCount ?? null,
    confidence: input.confidence,
    createdAt: now,
    foodStatus: input.foodStatus,
    priorityScore: input.priorityScore,
    productName: input.productName,
    reason: input.reason,
    repeatBuyWeight: input.repeatBuyWeight ?? null,
    reportType: input.reportType ?? 'issue-report',
    reporterEmail: session.user?.email ?? null,
    reporterName: session.user?.displayName ?? null,
    reporterUid: session.user?.id ?? null,
    resultSource: input.resultSource,
    status: 'open',
    summary: input.summary,
    timelineSeverity: input.timelineSeverity ?? null,
    topConcern: input.topConcern,
    trustConfirmationType: input.trustConfirmationType ?? null,
  };

  const docRef = await addDoc(collection(getDb(), 'correctionReports'), report);
  return { ...report, id: docRef.id } satisfies CorrectionReport;
}

export async function submitTrustConfirmation(input: {
  barcode: string;
  confirmationCount: number;
  confidence: ResultConfidence;
  foodStatus: ProductFoodStatus;
  productName: string;
  repeatBuyWeight: number;
  resultSource: 'barcode' | 'ingredient-ocr';
  timelineSeverity: 'high' | 'low' | 'medium' | null;
  topConcern: string | null;
  trustConfirmationType: TrustConfirmationType;
}) {
  const summary =
    input.trustConfirmationType === 'looks-different'
      ? 'A shopper said the pack or key details look different today.'
      : 'A shopper confirmed the pack still matches today.';
  const priorityScore =
    (input.trustConfirmationType === 'looks-different' ? 45 : 10) +
    input.repeatBuyWeight * 4 +
    (input.timelineSeverity === 'high'
      ? 18
      : input.timelineSeverity === 'medium'
        ? 10
        : 0) +
    (input.confidence === 'low' ? 12 : input.confidence === 'medium' ? 6 : 0);

  return submitCorrectionReport({
    barcode: input.barcode,
    confirmationCount: input.confirmationCount,
    confidence: input.confidence,
    foodStatus: input.foodStatus,
    priorityScore,
    productName: input.productName,
    reason: 'other',
    repeatBuyWeight: input.repeatBuyWeight,
    reportType: 'trust-confirmation',
    resultSource: input.resultSource,
    summary,
    timelineSeverity: input.timelineSeverity,
    topConcern: input.topConcern,
    trustConfirmationType: input.trustConfirmationType,
  });
}
