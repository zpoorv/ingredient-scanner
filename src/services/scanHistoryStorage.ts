import {
  DEFAULT_DIET_PROFILE_ID,
  isDietProfileId,
  type DietProfileId,
} from '../constants/dietProfiles';
import AsyncStorage from '@react-native-async-storage/async-storage/lib/commonjs/index';
import type { HealthScoreGrade } from '../constants/productHealthScore';
import type { ResolvedProduct } from '../types/product';
import { getAuthSession } from '../store';
import {
  buildScanHistorySnapshot,
  type ScanHistoryRiskLevel,
} from '../utils/scanHistory';
import {
  deleteRemoteScanHistoryEntries,
  loadRemoteScanHistory,
  replaceRemoteScanHistory,
  saveRemoteScanHistoryEntry,
} from './cloudUserDataService';

const LEGACY_SCAN_HISTORY_STORAGE_KEY = 'ingredient-scanner/history/v1';
const SCAN_HISTORY_STORAGE_KEY_PREFIX = 'inqoura/history/v2';
const historyChangeListeners = new Set<() => void>();

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
  await writeHistoryForScope(getActiveHistoryScopeId(), entries);
}

function getHistoryStorageKey(scopeId: string) {
  return `${SCAN_HISTORY_STORAGE_KEY_PREFIX}/${scopeId}`;
}

function getHistoryScopeIdForUser(uid?: string | null) {
  return uid ? `user:${uid}` : 'guest';
}

function getActiveHistoryScopeId() {
  return getHistoryScopeIdForUser(getAuthSession().user?.id);
}

async function parseHistoryEntries(rawValue: string | null) {
  if (!rawValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(rawValue);

    if (Array.isArray(parsedValue)) {
      return sortHistoryEntries(
        parsedValue.filter(isValidHistoryEntry).map(normalizeHistoryEntry)
      );
    }
  } catch {
    return [];
  }

  return [];
}

async function loadScopedHistoryEntries(scopeId: string) {
  const scopedRawValue = await AsyncStorage.getItem(getHistoryStorageKey(scopeId));

  if (scopedRawValue !== null) {
    return parseHistoryEntries(scopedRawValue);
  }

  if (scopeId !== 'guest') {
    return [];
  }

  const legacyEntries = await parseHistoryEntries(
    await AsyncStorage.getItem(LEGACY_SCAN_HISTORY_STORAGE_KEY)
  );

  if (legacyEntries.length > 0) {
    // Keep pre-account device history available only for guest mode.
    await writeHistoryForScope(scopeId, legacyEntries);
  }

  return legacyEntries;
}

async function writeHistoryForScope(scopeId: string, entries: ScanHistoryEntry[]) {
  // History is scoped per account to avoid leaking one user's scans into another session.
  await AsyncStorage.setItem(
    getHistoryStorageKey(scopeId),
    JSON.stringify(sortHistoryEntries(entries))
  );
}

async function clearHistoryForScope(scopeId: string) {
  await AsyncStorage.removeItem(getHistoryStorageKey(scopeId));
}

function notifyHistoryChangeListeners() {
  historyChangeListeners.forEach((listener) => listener());
}

function haveHistoryEntriesChanged(
  currentEntries: ScanHistoryEntry[],
  nextEntries: ScanHistoryEntry[]
) {
  return (
    JSON.stringify(sortHistoryEntries(currentEntries)) !==
    JSON.stringify(sortHistoryEntries(nextEntries))
  );
}

function mergeHistoryEntries(
  localEntries: ScanHistoryEntry[],
  remoteEntries: ScanHistoryEntry[]
) {
  const mergedEntries = new Map<string, ScanHistoryEntry>();

  [...localEntries, ...remoteEntries].forEach((entry) => {
    const currentEntry = mergedEntries.get(entry.id);

    if (!currentEntry) {
      mergedEntries.set(entry.id, entry);
      return;
    }

    const currentTime = new Date(currentEntry.scannedAt).getTime();
    const nextTime = new Date(entry.scannedAt).getTime();
    mergedEntries.set(entry.id, nextTime > currentTime ? entry : currentEntry);
  });

  return sortHistoryEntries([...mergedEntries.values()]);
}

export async function loadScanHistory(): Promise<ScanHistoryEntry[]> {
  const historyScopeId = getActiveHistoryScopeId();
  const localEntries = await loadScopedHistoryEntries(historyScopeId);

  const sessionUser = getAuthSession().user;

  if (!sessionUser) {
    return localEntries;
  }

  const remoteEntries = await loadRemoteScanHistory(sessionUser.id);

  if (remoteEntries.length === 0) {
    if (localEntries.length > 0) {
      await replaceRemoteScanHistory(sessionUser.id, localEntries);
    }

    return localEntries;
  }

  const mergedEntries = mergeHistoryEntries(localEntries, remoteEntries);

  if (haveHistoryEntriesChanged(localEntries, mergedEntries)) {
    await writeHistoryForScope(historyScopeId, mergedEntries);
  }

  return mergedEntries;
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
  const sessionUser = getAuthSession().user;

  if (sessionUser) {
    await saveRemoteScanHistoryEntry(sessionUser.id, nextEntry);
  }

  notifyHistoryChangeListeners();

  return nextEntry;
}

export async function deleteScanHistoryEntries(ids: string[]) {
  if (ids.length === 0) {
    return [];
  }

  const historyEntries = await loadScanHistory();
  const nextEntries = historyEntries.filter((entry) => !ids.includes(entry.id));

  await writeHistory(nextEntries);
  const sessionUser = getAuthSession().user;

  if (sessionUser) {
    await deleteRemoteScanHistoryEntries(sessionUser.id, ids);
  }

  notifyHistoryChangeListeners();

  return nextEntries;
}

export async function clearScanHistory() {
  await clearScanHistoryForUser(getAuthSession().user?.id);
}

export async function clearScanHistoryForUser(uid?: string | null) {
  const sessionUser = getAuthSession().user;
  const targetUid = uid ?? sessionUser?.id ?? null;
  const historyScopeId = getHistoryScopeIdForUser(targetUid);

  await clearHistoryForScope(historyScopeId);

  if (targetUid) {
    await replaceRemoteScanHistory(targetUid, []);
  }

  notifyHistoryChangeListeners();
}

export function subscribeScanHistoryChanges(listener: () => void) {
  historyChangeListeners.add(listener);

  return () => {
    historyChangeListeners.delete(listener);
  };
}
