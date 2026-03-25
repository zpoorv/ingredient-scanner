import {
  DEFAULT_DIET_PROFILE_ID,
  isDietProfileId,
  type DietProfileId,
} from '../constants/dietProfiles';
import AsyncStorage from '@react-native-async-storage/async-storage/lib/commonjs/index';
import type { HealthScoreGrade } from '../constants/productHealthScore';
import type { ResolvedProduct } from '../types/product';
import {
  buildScanHistorySnapshot,
  type ScanHistoryRiskLevel,
} from '../utils/scanHistory';

const SCAN_HISTORY_STORAGE_KEY = 'ingredient-scanner/history/v1';

export type ScanHistoryEntry = {
  barcode: string;
  barcodeType?: string | null;
  firstScannedAt: string;
  gradeLabel: HealthScoreGrade | null;
  id: string;
  name: string;
  profileId: DietProfileId;
  product: ResolvedProduct;
  riskLevel: ScanHistoryRiskLevel;
  riskSummary: string;
  scanCount: number;
  score: number | null;
  scannedAt: string;
};

type SaveScanHistoryInput = {
  barcode: string;
  barcodeType?: string | null;
  profileId?: DietProfileId;
  product: ResolvedProduct;
};

function sortHistoryEntries(entries: ScanHistoryEntry[]) {
  return [...entries].sort(
    (left, right) =>
      new Date(right.scannedAt).getTime() - new Date(left.scannedAt).getTime()
  );
}

function toHistoryEntry(
  input: SaveScanHistoryInput,
  existingEntry?: ScanHistoryEntry
): ScanHistoryEntry {
  const profileId =
    input.profileId || existingEntry?.profileId || DEFAULT_DIET_PROFILE_ID;
  const snapshot = buildScanHistorySnapshot(input.product, profileId);
  const scannedAt = new Date().toISOString();

  return {
    barcode: input.barcode,
    barcodeType: input.barcodeType ?? null,
    firstScannedAt: existingEntry?.firstScannedAt || scannedAt,
    gradeLabel: snapshot.gradeLabel,
    id: existingEntry?.id || input.barcode,
    name: snapshot.name,
    profileId: snapshot.profileId,
    product: input.product,
    riskLevel: snapshot.riskLevel,
    riskSummary: snapshot.riskSummary,
    scanCount: (existingEntry?.scanCount || 0) + 1,
    score: snapshot.score,
    scannedAt,
  };
}

function isValidHistoryEntry(value: unknown): value is ScanHistoryEntry {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<ScanHistoryEntry>;

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.barcode === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.scannedAt === 'string' &&
    (candidate.profileId === undefined ||
      (typeof candidate.profileId === 'string' && isDietProfileId(candidate.profileId))) &&
    (typeof candidate.score === 'number' || candidate.score === null) &&
    typeof candidate.riskSummary === 'string' &&
    typeof candidate.product === 'object'
  );
}

function normalizeHistoryEntry(entry: ScanHistoryEntry): ScanHistoryEntry {
  return {
    ...entry,
    profileId:
      entry.profileId && isDietProfileId(entry.profileId)
        ? entry.profileId
        : DEFAULT_DIET_PROFILE_ID,
  };
}

async function writeHistory(entries: ScanHistoryEntry[]) {
  await AsyncStorage.setItem(
    SCAN_HISTORY_STORAGE_KEY,
    JSON.stringify(sortHistoryEntries(entries))
  );
}

export async function loadScanHistory(): Promise<ScanHistoryEntry[]> {
  const rawValue = await AsyncStorage.getItem(SCAN_HISTORY_STORAGE_KEY);

  if (!rawValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(rawValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return sortHistoryEntries(
      parsedValue.filter(isValidHistoryEntry).map(normalizeHistoryEntry)
    );
  } catch {
    return [];
  }
}

export async function saveScanToHistory(
  input: SaveScanHistoryInput
): Promise<ScanHistoryEntry> {
  const historyEntries = await loadScanHistory();
  const existingEntry = historyEntries.find(
    (entry) => entry.barcode === input.barcode
  );
  const nextEntry = toHistoryEntry(input, existingEntry);
  const nextEntries = historyEntries.filter(
    (entry) => entry.barcode !== input.barcode
  );

  nextEntries.push(nextEntry);

  await writeHistory(nextEntries);

  return nextEntry;
}

export async function deleteScanHistoryEntries(ids: string[]) {
  if (ids.length === 0) {
    return [];
  }

  const historyEntries = await loadScanHistory();
  const nextEntries = historyEntries.filter((entry) => !ids.includes(entry.id));

  await writeHistory(nextEntries);

  return nextEntries;
}
