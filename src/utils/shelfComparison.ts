import type { ComparisonSessionEntry } from '../models/comparisonSession';
import { buildResultAnalysis } from './resultAnalysis';

export type ShelfComparisonRow = {
  barcode: string;
  confidence: string;
  decisionSummary: string;
  decisionVerdict: string;
  ecoScore: string | null;
  householdFitVerdict: ComparisonSessionEntry['householdFitVerdict'];
  name: string;
  score: number | null;
  topConcern: string | null;
  tripDecision: ComparisonSessionEntry['tripDecision'];
};

export type ShelfComparisonSummary = {
  bestFallbackBarcode: string | null;
  bestForRegularUseBarcode: string | null;
  bestHouseholdFitBarcode: string | null;
  bestLowerImpactBarcode: string | null;
  replacementBarcode: string | null;
  rows: ShelfComparisonRow[];
  tripRecapLine: string;
  whyThisWins: string;
};

const DECISION_PRIORITY: Record<ShelfComparisonRow['decisionVerdict'], number> = {
  'good-regular-pick': 3,
  'okay-occasionally': 2,
  'not-ideal-often': 1,
  'need-better-data': 0,
};

const HOUSEHOLD_FIT_PRIORITY: Record<
  NonNullable<ShelfComparisonRow['householdFitVerdict']>,
  number
> = {
  'doesnt-fit-this-household': 0,
  'one-household-caution': 2,
  'works-for-everyone': 3,
  'works-for-you-only': 1,
};

const ECO_SCORE_PRIORITY: Record<string, number> = {
  a: 5,
  b: 4,
  c: 3,
  d: 2,
  e: 1,
};

function toDisplayConfidence(value: ShelfComparisonRow['confidence']) {
  switch (value) {
    case 'high':
      return 'High confidence';
    case 'medium':
      return 'Partial data';
    default:
      return 'Needs review';
  }
}

function rankRows(rows: ShelfComparisonRow[]) {
  return [...rows].sort((left, right) => {
    const verdictGap =
      DECISION_PRIORITY[right.decisionVerdict] - DECISION_PRIORITY[left.decisionVerdict];

    if (verdictGap !== 0) {
      return verdictGap;
    }

    return (right.score ?? -1) - (left.score ?? -1);
  });
}

function rankByHouseholdFit(rows: ShelfComparisonRow[]) {
  return [...rows].sort((left, right) => {
    const fitGap =
      (HOUSEHOLD_FIT_PRIORITY[right.householdFitVerdict ?? 'doesnt-fit-this-household'] ?? 0) -
      (HOUSEHOLD_FIT_PRIORITY[left.householdFitVerdict ?? 'doesnt-fit-this-household'] ?? 0);

    if (fitGap !== 0) {
      return fitGap;
    }

    return (right.score ?? -1) - (left.score ?? -1);
  });
}

function rankByEco(rows: ShelfComparisonRow[]) {
  return [...rows].sort((left, right) => {
    const ecoGap =
      (ECO_SCORE_PRIORITY[(right.ecoScore || '').toLowerCase()] ?? 0) -
      (ECO_SCORE_PRIORITY[(left.ecoScore || '').toLowerCase()] ?? 0);

    if (ecoGap !== 0) {
      return ecoGap;
    }

    return (right.score ?? -1) - (left.score ?? -1);
  });
}

export function buildShelfComparisonSummary(
  entries: ComparisonSessionEntry[]
): ShelfComparisonSummary {
  const rows = entries.map((entry) => {
    const analysis = buildResultAnalysis(entry.product, entry.profileId);

    return {
      barcode: entry.barcode,
      confidence: analysis.confidence,
      decisionSummary: analysis.decisionSummary,
      decisionVerdict: analysis.decisionVerdict,
      ecoScore: entry.product.ecoScore,
      householdFitVerdict: entry.householdFitVerdict ?? null,
      name: entry.name,
      score: analysis.insights.smartScore,
      topConcern: analysis.topConcern,
      tripDecision: entry.tripDecision,
    } satisfies ShelfComparisonRow;
  });

  const rankedRows = rankRows(rows);
  const householdRankedRows = rankByHouseholdFit(rows);
  const ecoRankedRows = rankByEco(
    rows.filter((row) => row.ecoScore && row.decisionVerdict !== 'need-better-data')
  );
  const bestForRegularUse = rankedRows[0] ?? null;
  const bestFallback = rankedRows.find(
    (row) =>
      row.barcode !== bestForRegularUse?.barcode &&
      row.decisionVerdict !== 'need-better-data'
  );
  const bestHouseholdFit = householdRankedRows[0] ?? null;
  const bestLowerImpact = ecoRankedRows[0] ?? null;
  const replacementRow =
    rankedRows.find((row) => row.tripDecision === 'changed-product') ??
    rankedRows.find((row) => row.tripDecision === 'skip') ??
    rankedRows[rankedRows.length - 1] ??
    null;

  const whyThisWins = bestForRegularUse
    ? bestForRegularUse.topConcern
      ? `${bestForRegularUse.name} leads because it avoids the stronger issue around ${bestForRegularUse.topConcern.toLowerCase()}.`
      : `${bestForRegularUse.name} leads because it is the cleanest regular-use pick in this group.`
    : 'Scan a few products in the same shelf to get a clearer comparison.';
  const tripRecapLine = bestForRegularUse
    ? replacementRow && replacementRow.barcode !== bestForRegularUse.barcode
      ? `Keep ${bestForRegularUse.name} in view. Re-check ${replacementRow.name} before making it a repeat buy.`
      : `${bestForRegularUse.name} is the strongest pick from this trip.`
    : 'Start a trip and scan a few products to get a recap.';

  return {
    bestFallbackBarcode: bestFallback?.barcode ?? null,
    bestForRegularUseBarcode: bestForRegularUse?.barcode ?? null,
    bestHouseholdFitBarcode: bestHouseholdFit?.barcode ?? null,
    bestLowerImpactBarcode: bestLowerImpact?.barcode ?? null,
    replacementBarcode: replacementRow?.barcode ?? null,
    rows: rankedRows.map((row) => ({
      ...row,
      confidence: toDisplayConfidence(row.confidence),
    })),
    tripRecapLine,
    whyThisWins,
  };
}
