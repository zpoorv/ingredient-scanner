import type { ComparisonSession } from '../models/comparisonSession';
import type { GamificationProfile } from '../models/gamification';
import type { PremiumEntitlement } from '../models/premium';
import type { ProductChangeAlert } from '../models/productChangeAlert';
import type { UserProfile } from '../models/userProfile';
import { loadComparisonSession } from './comparisonSessionStorage';
import { loadCurrentGamificationProfile } from './gamificationService';
import type { EffectiveShoppingProfile } from './householdProfilesService';
import { loadEffectiveShoppingProfile } from './householdProfilesService';
import { loadCurrentPremiumEntitlement } from './premiumEntitlementService';
import { loadProductChangeAlerts } from './productChangeAlertService';
import {
  loadScanHistory,
  type ScanHistoryEntry,
} from './scanHistoryStorage';
import {
  loadSessionResource,
  SESSION_CACHE_KEYS,
  type CachePolicy,
} from './sessionResourceCache';
import { loadUserProfile } from './userProfileService';

const SESSION_TTLS = {
  comparisonSession: 30_000,
  effectiveShoppingProfile: 30_000,
  gamificationProfile: 45_000,
  premiumEntitlement: 45_000,
  productChangeAlerts: 30_000,
  scanHistory: 45_000,
  userProfile: 60_000,
} as const;

export type { CachePolicy } from './sessionResourceCache';

export function loadSessionComparisonSession(policy: CachePolicy = 'cache-first') {
  return loadSessionResource<ComparisonSession>(
    SESSION_CACHE_KEYS.comparisonSession,
    () => loadComparisonSession(),
    { policy, ttlMs: SESSION_TTLS.comparisonSession }
  );
}

export function loadSessionEffectiveShoppingProfile(
  policy: CachePolicy = 'cache-first'
) {
  return loadSessionResource<EffectiveShoppingProfile>(
    SESSION_CACHE_KEYS.effectiveShoppingProfile,
    () => loadEffectiveShoppingProfile(),
    { policy, ttlMs: SESSION_TTLS.effectiveShoppingProfile }
  );
}

export function loadSessionPremiumEntitlement(
  policy: CachePolicy = 'cache-first'
) {
  return loadSessionResource<PremiumEntitlement>(
    SESSION_CACHE_KEYS.premiumEntitlement,
    () => loadCurrentPremiumEntitlement(),
    { policy, ttlMs: SESSION_TTLS.premiumEntitlement }
  );
}

export function loadSessionGamificationProfile(
  policy: CachePolicy = 'cache-first',
  historyEntries?: ScanHistoryEntry[]
): Promise<GamificationProfile> {
  return loadCurrentGamificationProfile({
    historyEntries,
    policy,
  });
}

export function loadSessionProductChangeAlerts(
  policy: CachePolicy = 'cache-first'
) {
  return loadSessionResource<ProductChangeAlert[]>(
    SESSION_CACHE_KEYS.productChangeAlerts,
    () => loadProductChangeAlerts(),
    { policy, ttlMs: SESSION_TTLS.productChangeAlerts }
  );
}

export function loadSessionScanHistory(policy: CachePolicy = 'cache-first') {
  return loadSessionResource<ScanHistoryEntry[]>(
    SESSION_CACHE_KEYS.scanHistory,
    () => loadScanHistory(),
    { policy, ttlMs: SESSION_TTLS.scanHistory }
  );
}

export function loadSessionUserProfile(policy: CachePolicy = 'cache-first') {
  return loadSessionResource<UserProfile | null>(
    SESSION_CACHE_KEYS.userProfile,
    () => loadUserProfile(),
    { policy, ttlMs: SESSION_TTLS.userProfile }
  );
}
