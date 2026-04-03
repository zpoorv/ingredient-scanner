import type { ProductTimelineEntry } from '../models/productTimeline';
import type { ScanHistoryEntry } from '../services/scanHistoryStorage';
import { normalizeIngredientValue } from './ingredientHighlighting';

function normalizeText(value?: string | null) {
  return normalizeIngredientValue(value || '');
}

function normalizeList(value: string[]) {
  return [...value].map((item) => item.trim().toLowerCase()).sort().join('|');
}

function getChangedFields(previousEntry: ScanHistoryEntry, nextEntry: ScanHistoryEntry) {
  const changedFields: ProductTimelineEntry['changedFields'] = [];

  if (
    normalizeText(previousEntry.product.ingredientsText) !==
    normalizeText(nextEntry.product.ingredientsText)
  ) {
    changedFields.push('ingredients');
  }

  if (
    normalizeList(previousEntry.product.allergens) !==
    normalizeList(nextEntry.product.allergens)
  ) {
    changedFields.push('allergens');
  }

  if (
    previousEntry.product.additiveCount !== nextEntry.product.additiveCount ||
    normalizeList(previousEntry.product.additiveTags) !==
      normalizeList(nextEntry.product.additiveTags)
  ) {
    changedFields.push('additives');
  }

  if ((previousEntry.score ?? null) !== (nextEntry.score ?? null)) {
    changedFields.push('score');
  }

  if (
    (previousEntry.product.adminMetadata?.reviewStatus ?? null) !==
    (nextEntry.product.adminMetadata?.reviewStatus ?? null)
  ) {
    changedFields.push('review-status');
  }

  return changedFields;
}

function getSeverity(changedFields: ProductTimelineEntry['changedFields']) {
  if (
    changedFields.includes('allergens') ||
    changedFields.includes('ingredients')
  ) {
    return 'high';
  }

  if (
    changedFields.includes('review-status') ||
    changedFields.includes('score')
  ) {
    return 'medium';
  }

  return 'low';
}

function buildSummary(changedFields: ProductTimelineEntry['changedFields']) {
  if (changedFields.includes('allergens')) {
    return 'Allergen details changed since your last scan.';
  }

  if (changedFields.includes('ingredients')) {
    return 'Ingredient list changed since your last scan.';
  }

  if (changedFields.includes('review-status')) {
    return 'Review status changed since your last scan.';
  }

  if (changedFields.includes('score')) {
    return 'The score shifted since your last scan.';
  }

  return 'This product changed since your last scan.';
}

export function buildProductTimelineEntry(
  previousEntry: ScanHistoryEntry,
  nextEntry: ScanHistoryEntry
) {
  const changedFields = getChangedFields(previousEntry, nextEntry);

  if (changedFields.length === 0) {
    return null;
  }

  const previousScore = previousEntry.score ?? null;
  const score = nextEntry.score ?? null;
  const scoreDelta =
    previousScore !== null && score !== null ? score - previousScore : null;

  return {
    barcode: nextEntry.barcode,
    changedFields,
    detectedAt: nextEntry.scannedAt,
    id: `${nextEntry.barcode}:${nextEntry.scannedAt}`,
    previousReviewStatus: previousEntry.product.adminMetadata?.reviewStatus ?? null,
    previousScannedAt: previousEntry.scannedAt,
    previousScore,
    productName: nextEntry.name,
    reviewStatus: nextEntry.product.adminMetadata?.reviewStatus ?? null,
    score,
    scoreDelta,
    severity: getSeverity(changedFields),
    summary: buildSummary(changedFields),
  } satisfies ProductTimelineEntry;
}

export function normalizeProductTimelineEntries(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as ProductTimelineEntry[];
  }

  return value
    .filter(
      (item): item is ProductTimelineEntry =>
        Boolean(item) &&
        typeof item === 'object' &&
        typeof (item as ProductTimelineEntry).id === 'string' &&
        typeof (item as ProductTimelineEntry).barcode === 'string' &&
        typeof (item as ProductTimelineEntry).detectedAt === 'string' &&
        typeof (item as ProductTimelineEntry).productName === 'string' &&
        typeof (item as ProductTimelineEntry).summary === 'string' &&
        Array.isArray((item as ProductTimelineEntry).changedFields)
    )
    .sort(
      (left, right) =>
        new Date(right.detectedAt).getTime() - new Date(left.detectedAt).getTime()
    )
    .slice(0, 8);
}

export function appendProductTimelineEntry(
  entries: ProductTimelineEntry[],
  nextEntry: ProductTimelineEntry | null
) {
  if (!nextEntry) {
    return normalizeProductTimelineEntries(entries);
  }

  return normalizeProductTimelineEntries([nextEntry, ...entries]);
}

export function buildRecentTimelineEntries(
  historyEntries: ScanHistoryEntry[],
  limit = 6
) {
  return historyEntries
    .flatMap((entry) =>
      (entry.productTimeline ?? []).slice(0, 1).map((timelineEntry) => ({
        ...timelineEntry,
        productName: entry.name,
      }))
    )
    .sort(
      (left, right) =>
        new Date(right.detectedAt).getTime() - new Date(left.detectedAt).getTime()
    )
    .slice(0, limit);
}
