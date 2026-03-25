import AsyncStorage from '@react-native-async-storage/async-storage/lib/commonjs/index';

import type { ResolvedProduct } from '../types/product';

const BARCODE_LOOKUP_CACHE_STORAGE_KEY = 'ingredient-scanner/barcode-cache/v1';
const BARCODE_LOOKUP_CACHE_MAX_ENTRIES = 48;
const BARCODE_LOOKUP_HIT_TTL_MS = 1000 * 60 * 60 * 24;
const BARCODE_LOOKUP_MISS_TTL_MS = 1000 * 60 * 30;

type BarcodeLookupCacheEntry = {
  product: ResolvedProduct | null;
  savedAt: number;
};

type BarcodeLookupCacheStore = Record<string, BarcodeLookupCacheEntry>;

let cacheStorePromise: Promise<BarcodeLookupCacheStore> | null = null;

function pruneCacheStore(store: BarcodeLookupCacheStore) {
  const now = Date.now();
  const validEntries = Object.entries(store).filter(([, entry]) => {
    const ttl = entry.product ? BARCODE_LOOKUP_HIT_TTL_MS : BARCODE_LOOKUP_MISS_TTL_MS;

    return now - entry.savedAt < ttl;
  });

  validEntries.sort((left, right) => right[1].savedAt - left[1].savedAt);

  return Object.fromEntries(validEntries.slice(0, BARCODE_LOOKUP_CACHE_MAX_ENTRIES));
}

async function loadCacheStore(): Promise<BarcodeLookupCacheStore> {
  const rawValue = await AsyncStorage.getItem(BARCODE_LOOKUP_CACHE_STORAGE_KEY);

  if (!rawValue) {
    return {};
  }

  try {
    const parsedValue = JSON.parse(rawValue) as BarcodeLookupCacheStore;

    if (!parsedValue || typeof parsedValue !== 'object') {
      return {};
    }

    return pruneCacheStore(parsedValue);
  } catch {
    return {};
  }
}

async function getCacheStore() {
  if (!cacheStorePromise) {
    cacheStorePromise = loadCacheStore();
  }

  return cacheStorePromise;
}

async function persistCacheStore(store: BarcodeLookupCacheStore) {
  const nextStore = pruneCacheStore(store);

  cacheStorePromise = Promise.resolve(nextStore);
  await AsyncStorage.setItem(
    BARCODE_LOOKUP_CACHE_STORAGE_KEY,
    JSON.stringify(nextStore)
  );
}

export async function readBarcodeLookupCache(cacheKey: string) {
  const store = await getCacheStore();
  const entry = store[cacheKey];

  if (!entry) {
    return undefined;
  }

  const ttl = entry.product ? BARCODE_LOOKUP_HIT_TTL_MS : BARCODE_LOOKUP_MISS_TTL_MS;

  if (Date.now() - entry.savedAt >= ttl) {
    delete store[cacheKey];
    void persistCacheStore(store);
    return undefined;
  }

  return entry.product;
}

export async function writeBarcodeLookupCache(
  cacheKey: string,
  product: ResolvedProduct | null
) {
  const store = await getCacheStore();

  // Store the resolved payload instead of image blobs so cache writes stay
  // lightweight and do not pressure low-memory Android devices.
  store[cacheKey] = {
    product,
    savedAt: Date.now(),
  };

  await persistCacheStore(store);
}
