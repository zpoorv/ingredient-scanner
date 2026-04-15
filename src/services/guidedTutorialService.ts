import { Ionicons } from '@expo/vector-icons';
import { StackActions } from '@react-navigation/native';

import { openMainRoute, rootNavigationRef } from '../navigation/navigationRef';
import { loadEffectiveShoppingProfile } from './householdProfilesService';
import {
  getGuidedTutorialSession,
  setGuidedTutorialStep,
} from '../store/guidedTutorialStore';

export type GuidedTutorialStepId =
  | 'home-scan'
  | 'scanner-overview'
  | 'search-open'
  | 'search-overview'
  | 'featured-open'
  | 'featured-overview'
  | 'history-open'
  | 'history-overview'
  | 'progress-open'
  | 'progress-overview'
  | 'alerts-open'
  | 'alerts-overview'
  | 'trips-open'
  | 'trips-overview'
  | 'profile-open'
  | 'profile-overview'
  | 'settings-open'
  | 'settings-overview'
  | 'premium-open'
  | 'premium-overview';

export type GuidedTutorialRouteName =
  | 'Home'
  | 'Scanner'
  | 'Search'
  | 'FeaturedProducts'
  | 'History'
  | 'Progress'
  | 'Alerts'
  | 'Trips'
  | 'ProfileDetails'
  | 'Settings'
  | 'Premium';

export type GuidedTutorialTargetId =
  | 'alerts-hero'
  | 'bottom-featured-tab'
  | 'bottom-history-tab'
  | 'bottom-search-tab'
  | 'header-premium-button'
  | 'header-profile-button'
  | 'home-open-alerts'
  | 'home-open-progress'
  | 'home-open-scanner'
  | 'home-open-trips'
  | 'history-hero'
  | 'premium-sheet-header'
  | 'profile-hero'
  | 'profile-open-settings'
  | 'progress-hero'
  | 'scanner-panel'
  | 'search-hero'
  | 'settings-sheet-header'
  | 'featured-hero'
  | 'trips-hero';

export type GuidedTutorialStep = {
  body: string;
  icon: keyof typeof Ionicons.glyphMap;
  id: GuidedTutorialStepId;
  kind: 'target' | 'info';
  nextLabel?: string;
  routeName: GuidedTutorialRouteName;
  screenLabel: string;
  targetId: GuidedTutorialTargetId;
  title: string;
};

export const GUIDED_TUTORIAL_STEPS: GuidedTutorialStep[] = [
  {
    body: 'Tap the highlighted scan button to start where most people start: one quick barcode check.',
    icon: 'scan-outline',
    id: 'home-scan',
    kind: 'target',
    routeName: 'Home',
    screenLabel: 'Home',
    targetId: 'home-open-scanner',
    title: 'Start with scan',
  },
  {
    body: 'This is the live barcode scanner. It is the fastest path into product details, while OCR stays lower on the page as the backup option.',
    icon: 'scan-outline',
    id: 'scanner-overview',
    kind: 'info',
    nextLabel: 'Next: Search',
    routeName: 'Scanner',
    screenLabel: 'Scan',
    targetId: 'scanner-panel',
    title: 'Scan barcodes first',
  },
  {
    body: 'Tap the Search tab to switch from camera-first lookup to typed product discovery.',
    icon: 'search-outline',
    id: 'search-open',
    kind: 'target',
    routeName: 'Scanner',
    screenLabel: 'Search',
    targetId: 'bottom-search-tab',
    title: 'Open Search',
  },
  {
    body: 'Search is where product name lookup happens. It keeps your recent queries, suggestions, and Firestore-backed product results in one focused place.',
    icon: 'search-outline',
    id: 'search-overview',
    kind: 'info',
    nextLabel: 'Next: Featured',
    routeName: 'Search',
    screenLabel: 'Search',
    targetId: 'search-hero',
    title: 'Search by product name',
  },
  {
    body: 'Tap the Featured tab to see curated picks kept separate from normal search results.',
    icon: 'star-outline',
    id: 'featured-open',
    kind: 'target',
    routeName: 'Search',
    screenLabel: 'Featured',
    targetId: 'bottom-featured-tab',
    title: 'Open Featured',
  },
  {
    body: 'Featured is the curated shelf. It is separate from search so hand-picked or promoted items do not get mixed into everyday lookup.',
    icon: 'star-outline',
    id: 'featured-overview',
    kind: 'info',
    nextLabel: 'Next: History',
    routeName: 'FeaturedProducts',
    screenLabel: 'Featured',
    targetId: 'featured-hero',
    title: 'Browse curated picks',
  },
  {
    body: 'Tap History to open your scan timeline and return to past products quickly.',
    icon: 'time-outline',
    id: 'history-open',
    kind: 'target',
    routeName: 'FeaturedProducts',
    screenLabel: 'History',
    targetId: 'bottom-history-tab',
    title: 'Open History',
  },
  {
    body: 'History is only your scan timeline now. Search, sort, reopen, and delete past scans here without mixing in badges or watch-outs.',
    icon: 'time-outline',
    id: 'history-overview',
    kind: 'info',
    nextLabel: 'Next: Progress',
    routeName: 'History',
    screenLabel: 'History',
    targetId: 'history-hero',
    title: 'Review your timeline',
  },
  {
    body: 'Back on Home, tap Progress to open your achievements, streak, and weekly momentum.',
    icon: 'trophy-outline',
    id: 'progress-open',
    kind: 'target',
    routeName: 'Home',
    screenLabel: 'Achievements',
    targetId: 'home-open-progress',
    title: 'Open Progress',
  },
  {
    body: 'Achievements track weekly momentum, streaks, and badges. They stay separate so progress feels motivating without interfering with product scores.',
    icon: 'trophy-outline',
    id: 'progress-overview',
    kind: 'info',
    nextLabel: 'Next: Alerts',
    routeName: 'Progress',
    screenLabel: 'Achievements',
    targetId: 'progress-hero',
    title: 'Track weekly momentum',
  },
  {
    body: 'Back on Home, tap Alerts to review changed products and watch-outs.',
    icon: 'alert-circle-outline',
    id: 'alerts-open',
    kind: 'target',
    routeName: 'Home',
    screenLabel: 'Alerts',
    targetId: 'home-open-alerts',
    title: 'Open Alerts',
  },
  {
    body: 'Alerts is where changed products, watch-outs, and replace-first nudges live. This keeps important changes visible without crowding Home.',
    icon: 'alert-circle-outline',
    id: 'alerts-overview',
    kind: 'info',
    nextLabel: 'Next: Trips',
    routeName: 'Alerts',
    screenLabel: 'Alerts',
    targetId: 'alerts-hero',
    title: 'Watch what changed',
  },
  {
    body: 'Back on Home, tap Trips to open comparisons and shopping recaps.',
    icon: 'bag-handle-outline',
    id: 'trips-open',
    kind: 'target',
    routeName: 'Home',
    screenLabel: 'Trips',
    targetId: 'home-open-trips',
    title: 'Open Trips',
  },
  {
    body: 'Trips and Shelf Mode help with shopping comparisons. This is where multi-product store decisions live instead of being buried inside result pages.',
    icon: 'bag-handle-outline',
    id: 'trips-overview',
    kind: 'info',
    nextLabel: 'Next: Profile',
    routeName: 'Trips',
    screenLabel: 'Trips',
    targetId: 'trips-hero',
    title: 'Compare during a trip',
  },
  {
    body: 'Tap the profile icon to open your identity and account hub.',
    icon: 'person-circle-outline',
    id: 'profile-open',
    kind: 'target',
    routeName: 'Trips',
    screenLabel: 'Profile',
    targetId: 'header-profile-button',
    title: 'Open Profile',
  },
  {
    body: 'Profile holds identity and achievements together. It is the place for your account details, while Settings stays focused on preferences.',
    icon: 'person-circle-outline',
    id: 'profile-overview',
    kind: 'info',
    nextLabel: 'Next: Settings',
    routeName: 'ProfileDetails',
    screenLabel: 'Profile',
    targetId: 'profile-hero',
    title: 'Keep account details here',
  },
  {
    body: 'Tap the highlighted settings button to open your preference sheet.',
    icon: 'settings-outline',
    id: 'settings-open',
    kind: 'target',
    routeName: 'ProfileDetails',
    screenLabel: 'Settings',
    targetId: 'profile-open-settings',
    title: 'Open Settings',
  },
  {
    body: 'Settings is your quick control menu. From here you branch into account, notifications, appearance, household, and support.',
    icon: 'settings-outline',
    id: 'settings-overview',
    kind: 'info',
    nextLabel: 'Next: Premium',
    routeName: 'Settings',
    screenLabel: 'Settings',
    targetId: 'settings-sheet-header',
    title: 'Adjust preferences here',
  },
  {
    body: 'Tap the premium icon to open the optional upgrade sheet.',
    icon: 'sparkles-outline',
    id: 'premium-open',
    kind: 'target',
    routeName: 'ProfileDetails',
    screenLabel: 'Premium',
    targetId: 'header-premium-button',
    title: 'Open Premium',
  },
  {
    body: 'Premium is optional depth. It adds more history and convenience, but it does not manipulate scores or change product honesty.',
    icon: 'sparkles-outline',
    id: 'premium-overview',
    kind: 'info',
    nextLabel: 'Finish',
    routeName: 'Premium',
    screenLabel: 'Premium',
    targetId: 'premium-sheet-header',
    title: 'Premium adds depth, not bias',
  },
];

export function getGuidedTutorialStep(stepIndex: number) {
  return GUIDED_TUTORIAL_STEPS[stepIndex] ?? null;
}

export function getGuidedTutorialStepIndexByRoute(
  routeName: GuidedTutorialRouteName | null | undefined
) {
  if (!routeName) {
    return -1;
  }

  return GUIDED_TUTORIAL_STEPS.findIndex((step) => step.routeName === routeName);
}

export function advanceGuidedTutorialFromTarget(targetId: GuidedTutorialTargetId) {
  const session = getGuidedTutorialSession();
  const currentStep = getGuidedTutorialStep(session.stepIndex);

  if (
    session.status !== 'active' ||
    !currentStep ||
    currentStep.kind !== 'target' ||
    currentStep.targetId !== targetId
  ) {
    return;
  }

  setGuidedTutorialStep(session.stepIndex + 1);
}

export async function openGuidedTutorialStep(stepIndex: number) {
  const step = getGuidedTutorialStep(stepIndex);

  if (!step || !rootNavigationRef.isReady()) {
    return;
  }

  switch (step.routeName) {
    case 'Home':
    case 'Search':
    case 'History':
    case 'FeaturedProducts':
      openMainRoute(step.routeName);
      return;
    case 'Scanner': {
      const effectiveProfile = await loadEffectiveShoppingProfile();
      rootNavigationRef.navigate('Scanner', {
        profileId: effectiveProfile.dietProfileId,
      });
      return;
    }
    case 'Premium':
      rootNavigationRef.navigate('Premium', {
        featureId: 'weekly-history-insights',
      });
      return;
    default:
      if (rootNavigationRef.getRootState().routes.some((entry) => entry.name === step.routeName)) {
        rootNavigationRef.dispatch(StackActions.popTo(step.routeName));
        return;
      }

      rootNavigationRef.navigate(step.routeName);
  }
}
