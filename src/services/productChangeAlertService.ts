import AsyncStorage from '@react-native-async-storage/async-storage/lib/commonjs/index';

import type { ProductChangeAlert } from '../models/productChangeAlert';
import type { ScanHistoryEntry } from './scanHistoryStorage';
import { getAuthSession } from '../store';
import {
  invalidateSessionResourceCache,
  primeSessionResourceCache,
  SESSION_CACHE_KEYS,
} from './sessionResourceCache';
import { buildProductTimelineEntry } from '../utils/productTimeline';

const PRODUCT_CHANGE_ALERT_STORAGE_KEY_PREFIX = 'inqoura/product-change-alerts/v1';
const MAX_ALERTS = 24;

function getAlertScopeId(uid?: string | null) {
  return uid ? `user:${uid}` : 'guest';
}

function getStorageKey(scopeId: string) {
  return `${PRODUCT_CHANGE_ALERT_STORAGE_KEY_PREFIX}/${scopeId}`;
}

function getActiveScopeId() {
  return getAlertScopeId(getAuthSession().user?.id);
}

function normalizeAlertList(alerts: ProductChangeAlert[]) {
  return [...alerts]
    .sort(
      (left, right) =>
        new Date(right.detectedAt).getTime() - new Date(left.detectedAt).getTime()
    )
    .slice(0, MAX_ALERTS);
}

async function loadAlertsForScope(scopeId: string) {
  const rawValue = await AsyncStorage.getItem(getStorageKey(scopeId));

  if (!rawValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(rawValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return normalizeAlertList(
      parsedValue.filter(
        (value): value is ProductChangeAlert =>
          Boolean(value) &&
          typeof value === 'object' &&
          typeof value.id === 'string' &&
          typeof value.barcode === 'string' &&
          typeof value.name === 'string' &&
          typeof value.summary === 'string'
      )
    );
  } catch {
    return [];
  }
}

async function saveAlertsForScope(scopeId: string, alerts: ProductChangeAlert[]) {
  await AsyncStorage.setItem(
    getStorageKey(scopeId),
    JSON.stringify(normalizeAlertList(alerts))
  );
}

export async function loadProductChangeAlerts() {
  const alerts = await loadAlertsForScope(getActiveScopeId());
  primeSessionResourceCache(SESSION_CACHE_KEYS.productChangeAlerts, alerts);
  return alerts;
}

export async function recordProductChangeAlert(
  previousEntry: ScanHistoryEntry,
  nextEntry: ScanHistoryEntry
) {
  const timelineEntry = buildProductTimelineEntry(previousEntry, nextEntry);

  if (!timelineEntry) {
    return null;
  }

  const scopeId = getActiveScopeId();
  const alerts = await loadAlertsForScope(scopeId);
  const alert: ProductChangeAlert = {
    barcode: nextEntry.barcode,
    changedFields: timelineEntry.changedFields,
    detectedAt: timelineEntry.detectedAt,
    id: timelineEntry.id,
    name: nextEntry.name,
    previousScannedAt: timelineEntry.previousScannedAt ?? previousEntry.scannedAt,
    severity: timelineEntry.severity === 'high' ? 'high' : 'caution',
    summary: timelineEntry.summary,
  };

  await saveAlertsForScope(scopeId, [alert, ...alerts]);
  primeSessionResourceCache(SESSION_CACHE_KEYS.productChangeAlerts, [alert, ...alerts]);
  return alert;
}

export async function clearProductChangeAlertsForUser(uid?: string | null) {
  await AsyncStorage.removeItem(getStorageKey(getAlertScopeId(uid)));
  invalidateSessionResourceCache(SESSION_CACHE_KEYS.productChangeAlerts);
}
