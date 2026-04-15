import { useCallback } from 'react';

import type { TutorialFeatureId } from '../services/tutorialProgressService';

export function useFeatureTutorial(featureId: TutorialFeatureId) {
  const dismiss = useCallback(() => {
    void featureId;
  }, [featureId]);

  return {
    dismiss,
    // The product now uses a single dedicated guided tutorial instead of
    // interrupting feature pages with contextual cards.
    isVisible: false,
  };
}
