import { PREMIUM_FEATURE_COPY } from '../constants/premium';
import {
  buildPremiumEntitlement,
  createDefaultPremiumEntitlement,
  type PremiumEntitlement,
  type PremiumFeatureId,
} from '../models/premium';
import {
  clearPremiumSession,
  getAuthSession,
  getPremiumSession,
  setPremiumSession,
} from '../store';
import { loadRemoteUserProfile } from './cloudUserDataService';
import {
  getRevenueCatPremiumState,
  loadRevenueCatCustomerInfo,
} from './revenueCatService';
import { loadUserProfile, syncCurrentUserProfileToFirestore } from './userProfileService';
import { saveStoredUserProfile } from './userProfileStorage';

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

export async function loadCurrentPremiumEntitlement() {
  const authSession = getAuthSession();

  if (authSession.status !== 'authenticated' || !authSession.user) {
    clearPremiumSession();
    return createDefaultPremiumEntitlement();
  }

  const revenueCatCustomerInfo = await loadRevenueCatCustomerInfo();
  const profile = await loadUserProfile();
  const entitlement = buildPremiumEntitlement(
    profile,
    getRevenueCatPremiumState(revenueCatCustomerInfo)
  );
  setPremiumSession(entitlement);
  return entitlement;
}

export async function refreshCurrentPremiumEntitlement() {
  const authSession = getAuthSession();

  if (authSession.status !== 'authenticated' || !authSession.user) {
    clearPremiumSession();
    return createDefaultPremiumEntitlement();
  }

  const revenueCatCustomerInfo = await loadRevenueCatCustomerInfo();
  const localProfile = await loadUserProfile();
  const remoteProfile = await loadRemoteUserProfile(authSession.user.id);

  if (!remoteProfile) {
    const profile = await syncCurrentUserProfileToFirestore();
    const entitlement = buildPremiumEntitlement(
      profile,
      getRevenueCatPremiumState(revenueCatCustomerInfo)
    );
    setPremiumSession(entitlement);
    return entitlement;
  }

  const profile = {
    ...(localProfile ?? remoteProfile),
    ...remoteProfile,
  };

  await saveStoredUserProfile(profile);
  const entitlement = buildPremiumEntitlement(
    profile,
    getRevenueCatPremiumState(revenueCatCustomerInfo)
  );
  setPremiumSession(entitlement);
  return entitlement;
}
