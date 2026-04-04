import { getAuthSession } from '../store';

export type CachePolicy = 'cache-first' | 'force-refresh' | 'stale-while-revalidate';

export const SESSION_CACHE_KEYS = {
  comparisonSession: 'comparison-session',
  effectiveShoppingProfile: 'effective-shopping-profile',
  premiumEntitlement: 'premium-entitlement',
  productChangeAlerts: 'product-change-alerts',
  scanHistory: 'scan-history',
  userProfile: 'user-profile',
} as const;

export type SessionCacheKey =
  (typeof SESSION_CACHE_KEYS)[keyof typeof SESSION_CACHE_KEYS];

type SessionCacheEntry<T> = {
  inflight: Promise<T> | null;
  loadedAt: number;
  scopeId: string;
  ttlMs: number;
  value: T;
};

const sessionCache = new Map<SessionCacheKey, SessionCacheEntry<unknown>>();

function getSessionScopeId() {
  const authSession = getAuthSession();

  if (authSession.user) {
    return `user:${authSession.user.id}`;
  }

  return authSession.status === 'loading' ? 'loading' : 'guest';
}

function isFresh(entry: SessionCacheEntry<unknown>, ttlMs: number) {
  if (ttlMs <= 0) {
    return true;
  }

  return Date.now() - entry.loadedAt < ttlMs;
}

function getScopedEntry<T>(key: SessionCacheKey, scopeId: string) {
  const cachedValue = sessionCache.get(key);

  if (!cachedValue || cachedValue.scopeId !== scopeId) {
    return null;
  }

  return cachedValue as SessionCacheEntry<T>;
}

function storeEntry<T>(key: SessionCacheKey, entry: SessionCacheEntry<T>) {
  sessionCache.set(key, entry as SessionCacheEntry<unknown>);
}

function scheduleRefresh<T>(
  key: SessionCacheKey,
  scopeId: string,
  loader: () => Promise<T>,
  ttlMs: number
) {
  const currentEntry = getScopedEntry<T>(key, scopeId);

  if (currentEntry?.inflight) {
    return currentEntry.inflight;
  }

  const nextEntry =
    currentEntry ??
    {
      inflight: null,
      loadedAt: 0,
      scopeId,
      ttlMs,
      value: undefined as T,
    };

  const refreshPromise = loader()
    .then((value) => {
      nextEntry.loadedAt = Date.now();
      nextEntry.ttlMs = ttlMs;
      nextEntry.value = value;
      storeEntry(key, nextEntry);
      return value;
    })
    .finally(() => {
      const latestEntry = getScopedEntry<T>(key, scopeId);

      if (latestEntry) {
        latestEntry.inflight = null;
      }
    });

  nextEntry.inflight = refreshPromise;
  storeEntry(key, nextEntry);

  return refreshPromise;
}

export function clearSessionResourceCache() {
  sessionCache.clear();
}

export function invalidateSessionResourceCache(key: SessionCacheKey) {
  sessionCache.delete(key);
}

export function primeSessionResourceCache<T>(
  key: SessionCacheKey,
  value: T,
  ttlMs = 0
) {
  storeEntry(key, {
    inflight: null,
    loadedAt: Date.now(),
    scopeId: getSessionScopeId(),
    ttlMs,
    value,
  });

  return value;
}

export function readSessionResourceCache<T>(key: SessionCacheKey) {
  const entry = getScopedEntry<T>(key, getSessionScopeId());

  if (!entry) {
    return null;
  }

  return entry.value;
}

export async function loadSessionResource<T>(
  key: SessionCacheKey,
  loader: () => Promise<T>,
  {
    policy = 'cache-first',
    ttlMs = 30_000,
  }: {
    policy?: CachePolicy;
    ttlMs?: number;
  } = {}
) {
  const scopeId = getSessionScopeId();
  const cachedEntry = getScopedEntry<T>(key, scopeId);

  if (policy === 'cache-first' && cachedEntry && isFresh(cachedEntry, ttlMs)) {
    return cachedEntry.value;
  }

  if (policy === 'stale-while-revalidate' && cachedEntry) {
    if (!isFresh(cachedEntry, ttlMs)) {
      void scheduleRefresh(key, scopeId, loader, ttlMs);
    }

    return cachedEntry.value;
  }

  if (cachedEntry?.inflight && policy !== 'force-refresh') {
    return cachedEntry.inflight;
  }

  return scheduleRefresh(key, scopeId, loader, ttlMs);
}
