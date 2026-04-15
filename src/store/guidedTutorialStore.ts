export type GuidedTutorialSession = {
  startedAt: number | null;
  status: 'inactive' | 'active';
  stepIndex: number;
};

export type GuidedTutorialTargetLayout = {
  height: number;
  width: number;
  x: number;
  y: number;
};

type GuidedTutorialListener = (session: GuidedTutorialSession) => void;
type GuidedTutorialTargetListener = (
  layouts: Partial<Record<string, GuidedTutorialTargetLayout>>
) => void;

const listeners = new Set<GuidedTutorialListener>();
const targetListeners = new Set<GuidedTutorialTargetListener>();

let sessionState: GuidedTutorialSession = {
  startedAt: null,
  status: 'inactive',
  stepIndex: 0,
};
let targetLayouts: Partial<Record<string, GuidedTutorialTargetLayout>> = {};

function emitGuidedTutorialSession() {
  listeners.forEach((listener) => {
    listener(sessionState);
  });
}

function emitGuidedTutorialTargets() {
  targetListeners.forEach((listener) => {
    listener(targetLayouts);
  });
}

export function getGuidedTutorialSession() {
  return sessionState;
}

export function startGuidedTutorial(stepIndex = 0) {
  sessionState = {
    startedAt: Date.now(),
    status: 'active',
    stepIndex,
  };
  emitGuidedTutorialSession();
}

export function setGuidedTutorialStep(stepIndex: number) {
  sessionState = {
    ...sessionState,
    status: 'active',
    stepIndex,
  };
  emitGuidedTutorialSession();
}

export function stopGuidedTutorial() {
  sessionState = {
    startedAt: null,
    status: 'inactive',
    stepIndex: 0,
  };
  emitGuidedTutorialSession();
}

export function subscribeGuidedTutorialSession(listener: GuidedTutorialListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getGuidedTutorialTargetLayouts() {
  return targetLayouts;
}

export function registerGuidedTutorialTarget(
  targetId: string,
  layout: GuidedTutorialTargetLayout
) {
  targetLayouts = {
    ...targetLayouts,
    [targetId]: layout,
  };
  emitGuidedTutorialTargets();
}

export function unregisterGuidedTutorialTarget(targetId: string) {
  if (!(targetId in targetLayouts)) {
    return;
  }

  const nextLayouts = { ...targetLayouts };
  delete nextLayouts[targetId];
  targetLayouts = nextLayouts;
  emitGuidedTutorialTargets();
}

export function subscribeGuidedTutorialTargets(listener: GuidedTutorialTargetListener) {
  targetListeners.add(listener);
  return () => {
    targetListeners.delete(listener);
  };
}
