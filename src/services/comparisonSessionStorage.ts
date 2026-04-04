import AsyncStorage from '@react-native-async-storage/async-storage/lib/commonjs/index';

import type {
  ComparisonSession,
  ComparisonSessionEntry,
  CompletedTripSession,
  TripSessionSummary,
} from '../models/comparisonSession';
import { getAuthSession } from '../store';
import {
  primeSessionResourceCache,
  SESSION_CACHE_KEYS,
} from './sessionResourceCache';
import { buildShelfComparisonSummary } from '../utils/shelfComparison';

const STORAGE_KEY_PREFIX = 'inqoura/shelf-session/v2';
const MAX_SESSION_ENTRIES = 4;
const MAX_TRIP_HISTORY = 5;

function getScopeId() {
  const sessionUser = getAuthSession().user;
  return sessionUser ? `user:${sessionUser.id}` : 'guest';
}

function getStorageKey() {
  return `${STORAGE_KEY_PREFIX}/${getScopeId()}`;
}

function isValidEntry(value: unknown): value is ComparisonSessionEntry {
  return Boolean(
    value &&
      typeof value === 'object' &&
      typeof (value as ComparisonSessionEntry).barcode === 'string' &&
      typeof (value as ComparisonSessionEntry).addedAt === 'string' &&
      (value as ComparisonSessionEntry).product
  );
}

function sortEntries(entries: ComparisonSessionEntry[]) {
  return [...entries].sort(
    (left, right) =>
      new Date(right.addedAt).getTime() - new Date(left.addedAt).getTime()
  );
}

function normalizeRecentTrips(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as CompletedTripSession[];
  }

  return value
    .filter(
      (item): item is CompletedTripSession =>
        Boolean(item) &&
        typeof item === 'object' &&
        typeof item.id === 'string' &&
        typeof item.startedAt === 'string' &&
        typeof item.endedAt === 'string' &&
        item.summary &&
        Array.isArray(item.entries)
    )
    .sort(
      (left, right) =>
        new Date(right.endedAt).getTime() - new Date(left.endedAt).getTime()
    )
    .slice(0, MAX_TRIP_HISTORY);
}

function buildTripSummary(entries: ComparisonSessionEntry[]): TripSessionSummary {
  const summary = buildShelfComparisonSummary(entries);
  const byBarcode = new Map(entries.map((entry) => [entry.barcode, entry]));

  return {
    bestHouseholdFitName:
      (summary.bestHouseholdFitBarcode &&
        byBarcode.get(summary.bestHouseholdFitBarcode)?.name) ||
      null,
    bestLowerImpactName:
      (summary.bestLowerImpactBarcode &&
        byBarcode.get(summary.bestLowerImpactBarcode)?.name) ||
      null,
    bestPickName:
      (summary.bestForRegularUseBarcode &&
        byBarcode.get(summary.bestForRegularUseBarcode)?.name) ||
      null,
    recapLine: summary.tripRecapLine,
    replacementName:
      (summary.replacementBarcode && byBarcode.get(summary.replacementBarcode)?.name) ||
      null,
  };
}

async function writeSession(input: Partial<ComparisonSession>) {
  const currentSession = await loadComparisonSession();
  const nextSession: ComparisonSession = {
    entries: sortEntries(input.entries ?? currentSession.entries).slice(0, MAX_SESSION_ENTRIES),
    recentTrips: normalizeRecentTrips(input.recentTrips ?? currentSession.recentTrips),
    tripId:
      input.tripId === undefined ? currentSession.tripId : input.tripId,
    tripStartedAt:
      input.tripStartedAt === undefined
        ? currentSession.tripStartedAt
        : input.tripStartedAt,
    updatedAt: new Date().toISOString(),
  };

  await AsyncStorage.setItem(getStorageKey(), JSON.stringify(nextSession));
  primeSessionResourceCache(SESSION_CACHE_KEYS.comparisonSession, nextSession);
  return nextSession;
}

export async function loadComparisonSession(): Promise<ComparisonSession> {
  try {
    const rawValue = await AsyncStorage.getItem(getStorageKey());

    if (!rawValue) {
      const emptySession = {
        entries: [],
        recentTrips: [],
        tripId: null,
        tripStartedAt: null,
        updatedAt: null,
      };
      primeSessionResourceCache(SESSION_CACHE_KEYS.comparisonSession, emptySession);
      return emptySession;
    }

    const parsedValue = JSON.parse(rawValue) as Partial<ComparisonSession>;
    const entries = Array.isArray(parsedValue.entries)
      ? parsedValue.entries.filter(isValidEntry)
      : [];

    const nextSession = {
      entries: sortEntries(entries),
      recentTrips: normalizeRecentTrips(parsedValue.recentTrips),
      tripId: typeof parsedValue.tripId === 'string' ? parsedValue.tripId : null,
      tripStartedAt:
        typeof parsedValue.tripStartedAt === 'string'
          ? parsedValue.tripStartedAt
          : null,
      updatedAt: typeof parsedValue.updatedAt === 'string' ? parsedValue.updatedAt : null,
    };
    primeSessionResourceCache(SESSION_CACHE_KEYS.comparisonSession, nextSession);
    return nextSession;
  } catch {
    const emptySession = {
      entries: [],
      recentTrips: [],
      tripId: null,
      tripStartedAt: null,
      updatedAt: null,
    };
    primeSessionResourceCache(SESSION_CACHE_KEYS.comparisonSession, emptySession);
    return emptySession;
  }
}

export async function upsertComparisonSessionEntry(entry: ComparisonSessionEntry) {
  const currentSession = await loadComparisonSession();
  const nextEntries = currentSession.entries.filter((item) => item.barcode !== entry.barcode);

  nextEntries.unshift(entry);

  return writeSession({
    entries: nextEntries,
    tripId: currentSession.tripId || `trip-${Date.now()}`,
    tripStartedAt: currentSession.tripStartedAt || new Date().toISOString(),
  });
}

export async function finishComparisonTrip() {
  const currentSession = await loadComparisonSession();

  if (currentSession.entries.length === 0) {
    return currentSession;
  }

  const completedTrip: CompletedTripSession = {
    endedAt: new Date().toISOString(),
    entries: currentSession.entries,
    id: currentSession.tripId || `trip-${Date.now()}`,
    startedAt: currentSession.tripStartedAt || currentSession.updatedAt || new Date().toISOString(),
    summary: buildTripSummary(currentSession.entries),
  };

  return writeSession({
    entries: [],
    recentTrips: [completedTrip, ...currentSession.recentTrips],
    tripId: null,
    tripStartedAt: null,
  });
}

export async function removeComparisonSessionEntry(barcode: string) {
  const currentSession = await loadComparisonSession();
  const nextEntries = currentSession.entries.filter((entry) => entry.barcode !== barcode);

  return writeSession({
    entries: nextEntries,
    tripId: nextEntries.length === 0 ? null : currentSession.tripId,
    tripStartedAt: nextEntries.length === 0 ? null : currentSession.tripStartedAt,
  });
}

export async function clearComparisonSession() {
  const currentSession = await loadComparisonSession();

  return writeSession({
    entries: [],
    recentTrips: currentSession.recentTrips,
    tripId: null,
    tripStartedAt: null,
  });
}
