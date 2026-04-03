import AsyncStorage from '@react-native-async-storage/async-storage/lib/commonjs/index';

import { getAuthSession } from '../store';

const STORAGE_KEY_PREFIX = 'inqoura/trust-confirmations/v1';

export type ProductTrustConfirmation = {
  barcode: string;
  differentCount: number;
  lastConfirmedAt: string | null;
  matchCount: number;
};

type ConfirmationType = 'looks-different' | 'matches-pack';

function getScopeId(uid?: string | null) {
  return uid ? `user:${uid}` : 'guest';
}

function getStorageKey() {
  return `${STORAGE_KEY_PREFIX}/${getScopeId(getAuthSession().user?.id)}`;
}

async function loadAllConfirmations() {
  const rawValue = await AsyncStorage.getItem(getStorageKey());

  if (!rawValue) {
    return {} as Record<string, ProductTrustConfirmation>;
  }

  try {
    const parsedValue = JSON.parse(rawValue);
    return parsedValue && typeof parsedValue === 'object'
      ? (parsedValue as Record<string, ProductTrustConfirmation>)
      : {};
  } catch {
    return {};
  }
}

export async function loadProductTrustConfirmation(barcode: string) {
  const records = await loadAllConfirmations();
  return (
    records[barcode] ?? {
      barcode,
      differentCount: 0,
      lastConfirmedAt: null,
      matchCount: 0,
    }
  );
}

export async function recordProductTrustConfirmation(
  barcode: string,
  type: ConfirmationType
) {
  const records = await loadAllConfirmations();
  const currentRecord = records[barcode] ?? {
    barcode,
    differentCount: 0,
    lastConfirmedAt: null,
    matchCount: 0,
  };
  const nextRecord: ProductTrustConfirmation = {
    ...currentRecord,
    differentCount:
      type === 'looks-different'
        ? currentRecord.differentCount + 1
        : currentRecord.differentCount,
    lastConfirmedAt: new Date().toISOString(),
    matchCount:
      type === 'matches-pack'
        ? currentRecord.matchCount + 1
        : currentRecord.matchCount,
  };

  await AsyncStorage.setItem(
    getStorageKey(),
    JSON.stringify({
      ...records,
      [barcode]: nextRecord,
    })
  );

  return nextRecord;
}
