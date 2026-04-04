import type { UserProfile } from './userProfile';

export type PremiumFeatureId =
  | 'ingredient-ocr'
  | 'share-result-card'
  | 'app-look-presets'
  | 'history-personalization'
  | 'ad-free-experience'
  | 'deeper-result-guidance'
  | 'advanced-ocr-recovery'
  | 'weekly-history-insights'
  | 'favorites-and-comparisons';

export type PremiumEntitlementSource =
  | 'admin-claim'
  | 'admin-role'
  | 'premium-claim'
  | 'premium-role'
  | 'revenuecat-entitlement'
  | 'verified-profile-plan'
  | 'none';

export type PremiumEntitlement = {
  billingProductIdentifier: string | null;
  features: PremiumFeatureId[];
  isPremium: boolean;
  managementUrl: string | null;
  plan: UserProfile['plan'];
  role: UserProfile['role'];
  source: PremiumEntitlementSource;
  status: 'active' | 'inactive';
  updatedAt: string | null;
};

const PREMIUM_FEATURES: PremiumFeatureId[] = [
  'ingredient-ocr',
  'share-result-card',
  'app-look-presets',
  'history-personalization',
  'ad-free-experience',
  'deeper-result-guidance',
  'advanced-ocr-recovery',
  'weekly-history-insights',
  'favorites-and-comparisons',
];

export function createDefaultPremiumEntitlement(): PremiumEntitlement {
  return {
    billingProductIdentifier: null,
    features: [],
    isPremium: false,
    managementUrl: null,
    plan: 'free',
    role: 'user',
    source: 'none',
    status: 'inactive',
    updatedAt: null,
  };
}

export function buildPremiumEntitlement(
  profile: Pick<UserProfile, 'plan' | 'role' | 'updatedAt'> | null,
  billingState?: {
    isActive: boolean;
    managementUrl: string | null;
    productIdentifier: string | null;
    updatedAt: string | null;
  } | null,
  claimSource: 'admin-claim' | 'premium-claim' | null = null
): PremiumEntitlement {
  if (!profile) {
    return createDefaultPremiumEntitlement();
  }

  const isAdmin = profile.role === 'admin';
  const hasPremiumRole = profile.role === 'premium';
  const hasPremiumPlan = profile.plan === 'premium';
  const hasRevenueCatEntitlement = billingState?.isActive ?? false;
  const isPremium =
    isAdmin || hasPremiumRole || hasPremiumPlan || hasRevenueCatEntitlement;

  return {
    billingProductIdentifier: billingState?.productIdentifier ?? null,
    features: isPremium ? PREMIUM_FEATURES : [],
    isPremium,
    managementUrl: billingState?.managementUrl ?? null,
    plan: profile.plan,
    role: profile.role,
    source: claimSource === 'admin-claim'
      ? 'admin-claim'
      : claimSource === 'premium-claim'
        ? 'premium-claim'
      : isAdmin
      ? 'admin-role'
      : hasPremiumRole
        ? 'premium-role'
        : hasRevenueCatEntitlement
          ? 'revenuecat-entitlement'
        : hasPremiumPlan
          ? 'verified-profile-plan'
          : 'none',
    status: isPremium ? 'active' : 'inactive',
    updatedAt: billingState?.updatedAt ?? profile.updatedAt,
  };
}
