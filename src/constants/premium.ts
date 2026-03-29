import type { PremiumFeatureId } from '../models/premium';

export const PREMIUM_MONTHLY_PRODUCT_ID = 'premium_monthly';

export const PREMIUM_FEATURE_COPY: Record<
  PremiumFeatureId,
  { description: string; shortLabel: string; title: string }
> = {
  'ingredient-ocr': {
    description:
      'Remove the 5-per-day OCR cap, skip rewarded-ad unlocks, and keep ingredient label scanning ready whenever you need it.',
    shortLabel: 'Unlimited OCR',
    title: 'Unlimited ingredient OCR',
  },
  'share-result-card': {
    description:
      'Unlock five extra share-card styles and unlimited result-card exports for social posting.',
    shortLabel: 'Share Styles',
    title: 'Premium share-card styles',
  },
  'app-look-presets': {
    description:
      'Choose from extra premium app looks to personalize the feel of your Inqoura account.',
    shortLabel: 'UI Looks',
    title: 'Premium UI looks',
  },
  'history-personalization': {
    description:
      'Get premium-only history insights like weekly harmful-product counts, healthier streaks, and scan pattern nudges.',
    shortLabel: 'History Insights',
    title: 'History personalization',
  },
  'ad-free-experience': {
    description:
      'Premium users never need to watch rewarded ads to continue scanning ingredient labels.',
    shortLabel: 'No Ads',
    title: 'Ad-free scanning',
  },
};

export const PREMIUM_PAYWALL_FEATURES = [
  'Unlimited ingredient OCR without the 5-per-day basic cap.',
  'No rewarded ads required to keep scanning.',
  'Five extra share-card styles for social-friendly exports.',
  'Five extra app looks for the main experience.',
  'Premium history insights based on what you scanned this week.',
];

export const PREMIUM_PRICE_PREVIEW_COPY =
  'Monthly pricing will be shown by Google Play at checkout based on country.';
