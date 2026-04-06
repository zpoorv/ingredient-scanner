import type { PremiumFeatureId } from '../models/premium';

export const PREMIUM_MONTHLY_PRODUCT_ID = 'premium_monthly';

export const PREMIUM_FEATURE_COPY: Record<
  PremiumFeatureId,
  { description: string; shortLabel: string; title: string }
> = {
  'deeper-result-guidance': {
    description:
      'See a clearer breakdown of why a score landed where it did, what matters most, and how often the product makes sense.',
    shortLabel: 'Deeper Guidance',
    title: 'Deeper result guidance',
  },
  'advanced-ocr-recovery': {
    description:
      'Use a stronger ingredient-photo recovery pass with better OCR cleanup and more specific help when a label scan looks weak.',
    shortLabel: 'Smarter OCR Help',
    title: 'Smarter OCR help',
  },
  'ingredient-ocr': {
    description:
      'Remove the 5-per-day OCR cap, skip rewarded-ad unlocks, and keep ingredient label scanning ready whenever you need it.',
    shortLabel: 'Unlimited OCR',
    title: 'Unlimited ingredient OCR',
  },
  'weekly-history-insights': {
    description:
      'Get weekly shopping recaps, stronger scan patterns, and a clearer sense of what is helping or hurting your usual picks.',
    shortLabel: 'Weekly Insights',
    title: 'Weekly shopping insights',
  },
  'favorites-and-comparisons': {
    description:
      'Save products you buy often, keep comparison slots ready, and make repeat shopping decisions faster.',
    shortLabel: 'Shelf Compare',
    title: 'Favorites and comparison slots',
  },
  'history-personalization': {
    description:
      'See expanded shopping patterns, repeat-buy signals, and products worth replacing first.',
    shortLabel: 'History Insights',
    title: 'History personalization',
  },
  'ad-free-experience': {
    description:
      'Premium users never need to watch rewarded ads to continue scanning ingredient labels.',
    shortLabel: 'No Ads',
    title: 'Ad-free scanning',
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
};

export const PREMIUM_FREE_PLAN_FEATURES = [
  'Barcode scanning with the full trust score and ingredient highlights.',
  'Basic scan history with your best picks, repeat buys, and items to rethink.',
  'Ingredient photo scans with a 5-per-day cap plus rewarded unlocks.',
  'One share-card style and the core shopping flow.',
];

export const PREMIUM_PRIMARY_VALUE_FEATURES = [
  'Smarter OCR help when ingredient photos are blurry, partial, or noisy.',
  'Deeper result guidance that explains what most affected the score.',
  'Weekly shopping insights and stronger repeat-buy habit tracking.',
  'Healthier swap guidance that tells you what to look for next time.',
  'Deeper progress history for your weekly momentum, streaks, and calm badge milestones.',
  'Shelf Mode extras that make in-store comparisons faster and clearer.',
  'Ad-free ingredient scans with unlimited daily OCR use.',
];

export const PREMIUM_BONUS_FEATURES = [
  'Five extra share-card styles.',
  'Five extra app looks.',
  'Saved favorites and ready-to-open comparison slots.',
  'Richer achievement breakdowns and share-ready progress moments.',
];

export const PREMIUM_PRICE_PREVIEW_COPY =
  'Monthly pricing will be shown by Google Play at checkout based on country.';
