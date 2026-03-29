import type { UserProfile } from './userProfile';

export type PremiumFeatureId =
  | 'ingredient-ocr'
  | 'share-result-card'
  | 'app-look-presets'
  | 'history-personalization'
  | 'ad-free-experience';

export type PremiumEntitlementSource =
  | 'admin-role'
  | 'premium-role'
  | 'profile-plan'
  | 'none';

export type PremiumEntitlement = {
  features: PremiumFeatureId[];
  isPremium: boolean;
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
];

export function createDefaultPremiumEntitlement(): PremiumEntitlement {
  return {
    features: [],
    isPremium: false,
    plan: 'free',
    role: 'user',
    source: 'none',
    status: 'inactive',
    updatedAt: null,
  };
}

export function buildPremiumEntitlement(
  profile: Pick<UserProfile, 'plan' | 'role' | 'updatedAt'> | null
): PremiumEntitlement {
  if (!profile) {
    return createDefaultPremiumEntitlement();
  }

  const isAdmin = profile.role === 'admin';
  const hasPremiumRole = profile.role === 'premium';
  const hasPremiumPlan = profile.plan === 'premium';
  const isPremium = isAdmin || hasPremiumRole || hasPremiumPlan;

  return {
    features: isPremium ? PREMIUM_FEATURES : [],
    isPremium,
    plan: profile.plan,
    role: profile.role,
    source: isAdmin
      ? 'admin-role'
      : hasPremiumRole
        ? 'premium-role'
        : hasPremiumPlan
          ? 'profile-plan'
          : 'none',
    status: isPremium ? 'active' : 'inactive',
    updatedAt: profile.updatedAt,
  };
}
