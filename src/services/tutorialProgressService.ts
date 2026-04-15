import AsyncStorage from '@react-native-async-storage/async-storage/lib/commonjs/index';

import { getAuthSession } from '../store';

export type TutorialFeatureId =
  | 'alerts'
  | 'featured'
  | 'history'
  | 'home'
  | 'ingredient-ocr'
  | 'premium'
  | 'progress'
  | 'profile'
  | 'result'
  | 'scanner'
  | 'search'
  | 'settings'
  | 'shelf-mode'
  | 'trips';

export type TutorialProgress = {
  dismissedFeatureTips: TutorialFeatureId[];
  hasCompletedWelcomeTutorial: boolean;
  lastUpdatedAt: string;
};

const STORAGE_KEY_PREFIX = 'inqoura/tutorial-progress/v1';

const createDefaultProgress = (): TutorialProgress => ({
  dismissedFeatureTips: [],
  hasCompletedWelcomeTutorial: false,
  lastUpdatedAt: new Date().toISOString(),
});

function getScopeId(userId?: string | null) {
  return userId || getAuthSession().user?.id || 'signed-out';
}

function getStorageKey(userId?: string | null) {
  return `${STORAGE_KEY_PREFIX}/${getScopeId(userId)}`;
}

export async function loadTutorialProgress(userId?: string | null) {
  const rawValue = await AsyncStorage.getItem(getStorageKey(userId));

  if (!rawValue) {
    return createDefaultProgress();
  }

  try {
    const parsedValue = JSON.parse(rawValue) as Partial<TutorialProgress>;

    return {
      dismissedFeatureTips: Array.isArray(parsedValue.dismissedFeatureTips)
        ? parsedValue.dismissedFeatureTips
        : [],
      hasCompletedWelcomeTutorial: Boolean(parsedValue.hasCompletedWelcomeTutorial),
      lastUpdatedAt:
        typeof parsedValue.lastUpdatedAt === 'string'
          ? parsedValue.lastUpdatedAt
          : new Date().toISOString(),
    };
  } catch {
    return createDefaultProgress();
  }
}

async function saveTutorialProgress(
  nextProgress: TutorialProgress,
  userId?: string | null
) {
  await AsyncStorage.setItem(
    getStorageKey(userId),
    JSON.stringify({
      ...nextProgress,
      lastUpdatedAt: new Date().toISOString(),
    })
  );
}

export async function shouldShowWelcomeTutorial(userId?: string | null) {
  try {
    const progress = await loadTutorialProgress(userId);
    return !progress.hasCompletedWelcomeTutorial;
  } catch {
    return true;
  }
}

export async function markWelcomeTutorialCompleted(userId?: string | null) {
  const progress = await loadTutorialProgress(userId);

  await saveTutorialProgress(
    {
      ...progress,
      hasCompletedWelcomeTutorial: true,
    },
    userId
  );
}

export async function isFeatureTipDismissed(
  featureId: TutorialFeatureId,
  userId?: string | null
) {
  try {
    const progress = await loadTutorialProgress(userId);
    return progress.dismissedFeatureTips.includes(featureId);
  } catch {
    return false;
  }
}

export async function dismissFeatureTip(
  featureId: TutorialFeatureId,
  userId?: string | null
) {
  const progress = await loadTutorialProgress(userId);

  if (progress.dismissedFeatureTips.includes(featureId)) {
    return;
  }

  await saveTutorialProgress(
    {
      ...progress,
      dismissedFeatureTips: [...progress.dismissedFeatureTips, featureId],
    },
    userId
  );
}
