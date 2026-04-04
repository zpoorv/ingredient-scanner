import { PREMIUM_FEATURE_COPY } from '../constants/premium';
import {
  buildPremiumEntitlement,
  createDefaultPremiumEntitlement,
  type PremiumEntitlement,
  type PremiumFeatureId,
} from '../models/premium';
import type { UserProfile } from '../models/userProfile';
import {
  clearPremiumSession,
  getAuthSession,
  getPremiumSession,
  setPremiumSession,
} from '../store';
import { loadRemoteUserProfile } from './cloudUserDataService';
import { loadCurrentUserTrustedClaims } from './firebaseAuth';
import {
  getRevenueCatPremiumState,
  loadRevenueCatCustomerInfo,
} from './revenueCatService';
import {
  invalidateSessionResourceCache,
  primeSessionResourceCache,
  SESSION_CACHE_KEYS,
} from './sessionResourceCache';
import { loadUserProfile, syncCurrentUserProfileToFirestore } from './userProfileService';
import { saveStoredUserProfile } from './userProfileStorage';

type TrustedPremiumProfile = Pick<UserProfile, 'plan' | 'role' | 'updatedAt'>;

const TRUSTED_PROFILE_CACHE_MS = 60_000;

let trustedPremiumProfileCache:
  | {
      accessSource: 'admin-claim' | 'premium-claim' | null;
      fetchedAt: number;
      profile: TrustedPremiumProfile;
      uid: string;
    }
  | null = null;

export function getPremiumUpsellCopy(featureId: PremiumFeatureId) {
  const feature = PREMIUM_FEATURE_COPY[featureId];

  return {
    body: `${feature.title} is part of Inqoura Premium. Upgrade to unlock it on this account.`,
    title: `Unlock ${feature.shortLabel}`,
  };
}

export function hasPremiumFeatureAccess(
  featureId: PremiumFeatureId,
  entitlement: PremiumEntitlement = getPremiumSession()
) {
  return entitlement.isPremium && entitlement.features.includes(featureId);
}

function resolveTrustedRole(
  remoteProfile: UserProfile | null,
  claims: Awaited<ReturnType<typeof loadCurrentUserTrustedClaims>>
) {
  if (claims?.admin) {
    return {
      accessSource: 'admin-claim' as const,
      role: 'admin' as const,
    };
  }

  if (claims?.premium) {
    return {
      accessSource: 'premium-claim' as const,
      role: 'premium' as const,
    };
  }

  if (remoteProfile?.role === 'admin' || remoteProfile?.role === 'premium') {
    return {
      accessSource: null,
      role: remoteProfile.role,
    };
  }

  return {
    accessSource: null,
    role: 'user' as const,
  };
}

async function mirrorTrustedProfileToLocalCache(
  localProfile: UserProfile | null,
  trustedProfile: TrustedPremiumProfile
) {
  if (!localProfile) {
    return;
  }

  if (
    localProfile.plan === trustedProfile.plan &&
    localProfile.role === trustedProfile.role
  ) {
    return;
  }

  await saveStoredUserProfile({
    ...localProfile,
    plan: trustedProfile.plan,
    role: trustedProfile.role,
    updatedAt: trustedProfile.updatedAt,
  });
}

async function loadTrustedPremiumProfile(forceRefresh = false) {
  const authSession = getAuthSession();

  if (authSession.status !== 'authenticated' || !authSession.user) {
    trustedPremiumProfileCache = null;
    return {
      accessSource: null,
      profile: null,
    };
  }

  const cachedProfile =
    !forceRefresh &&
    trustedPremiumProfileCache &&
    trustedPremiumProfileCache.uid === authSession.user.id &&
    Date.now() - trustedPremiumProfileCache.fetchedAt < TRUSTED_PROFILE_CACHE_MS
      ? trustedPremiumProfileCache
      : null;

  if (cachedProfile) {
    return {
      accessSource: cachedProfile.accessSource,
      profile: cachedProfile.profile,
    };
  }

  const [localProfile, remoteProfile, claims] = await Promise.all([
    loadUserProfile(),
    loadRemoteUserProfile(authSession.user.id),
    loadCurrentUserTrustedClaims(forceRefresh),
  ]);
  const trustedRole = resolveTrustedRole(remoteProfile, claims);
  const trustedProfile: TrustedPremiumProfile = {
    plan:
      trustedRole.role !== 'user' || remoteProfile?.plan === 'premium'
        ? 'premium'
        : 'free',
    role: trustedRole.role,
    updatedAt:
      remoteProfile?.updatedAt ??
      localProfile?.updatedAt ??
      authSession.user.updatedAt,
  };

  await mirrorTrustedProfileToLocalCache(localProfile, trustedProfile);

  if (forceRefresh && !remoteProfile) {
    await syncCurrentUserProfileToFirestore().catch(() => null);
  }

  trustedPremiumProfileCache = {
    accessSource: trustedRole.accessSource,
    fetchedAt: Date.now(),
    profile: trustedProfile,
    uid: authSession.user.id,
  };

  return {
    accessSource: trustedRole.accessSource,
    profile: trustedProfile,
  };
}

export async function loadCurrentPremiumEntitlement() {
  const authSession = getAuthSession();

  if (authSession.status !== 'authenticated' || !authSession.user) {
    clearPremiumSession();
    trustedPremiumProfileCache = null;
    invalidateSessionResourceCache(SESSION_CACHE_KEYS.premiumEntitlement);
    return createDefaultPremiumEntitlement();
  }

  const [revenueCatCustomerInfo, trustedProfile] = await Promise.all([
    loadRevenueCatCustomerInfo(),
    loadTrustedPremiumProfile(),
  ]);
  const entitlement = buildPremiumEntitlement(
    trustedProfile.profile,
    getRevenueCatPremiumState(revenueCatCustomerInfo),
    trustedProfile.accessSource
  );
  setPremiumSession(entitlement);
  primeSessionResourceCache(SESSION_CACHE_KEYS.premiumEntitlement, entitlement);
  return entitlement;
}

export async function refreshCurrentPremiumEntitlement() {
  const authSession = getAuthSession();

  if (authSession.status !== 'authenticated' || !authSession.user) {
    clearPremiumSession();
    trustedPremiumProfileCache = null;
    invalidateSessionResourceCache(SESSION_CACHE_KEYS.premiumEntitlement);
    return createDefaultPremiumEntitlement();
  }

  const [revenueCatCustomerInfo, trustedProfile] = await Promise.all([
    loadRevenueCatCustomerInfo(),
    loadTrustedPremiumProfile(true),
  ]);
  const entitlement = buildPremiumEntitlement(
    trustedProfile.profile,
    getRevenueCatPremiumState(revenueCatCustomerInfo),
    trustedProfile.accessSource
  );
  setPremiumSession(entitlement);
  primeSessionResourceCache(SESSION_CACHE_KEYS.premiumEntitlement, entitlement);
  return entitlement;
}
