export type InqouraSubscriptionPackageId =
  | 'monthly'
  | 'yearly'
  | 'three_month'
  | 'six_month';

export const REVENUECAT_ANDROID_API_KEY =
  process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY ||
  'goog_EfVuJZSnhECfuJyahBvKFQxlmkh';
export const REVENUECAT_IOS_API_KEY =
  process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY || '';
export const REVENUECAT_ENTITLEMENT_ID =
  process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID || 'Inqoura Premium';

export const REVENUECAT_PACKAGE_DEFINITIONS: Record<
  InqouraSubscriptionPackageId,
  { description: string; label: string; periodLabel: string; types: string[] }
> = {
  monthly: {
    description: 'Best for trying premium monthly.',
    label: 'Monthly',
    periodLabel: 'Billed every month',
    types: ['MONTHLY'],
  },
  yearly: {
    description: 'Best long-term value for regular shoppers.',
    label: 'Yearly',
    periodLabel: 'Billed every year',
    types: ['ANNUAL'],
  },
  three_month: {
    description: 'A lighter commitment for one season of shopping.',
    label: 'Three Month',
    periodLabel: 'Billed every 3 months',
    types: ['THREE_MONTH'],
  },
  six_month: {
    description: 'A balanced option between monthly and yearly.',
    label: 'Six Month',
    periodLabel: 'Billed every 6 months',
    types: ['SIX_MONTH'],
  },
};

export const REVENUECAT_PACKAGE_ORDER: InqouraSubscriptionPackageId[] = [
  'monthly',
  'three_month',
  'six_month',
  'yearly',
];
