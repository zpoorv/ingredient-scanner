import AsyncStorage from '@react-native-async-storage/async-storage/lib/commonjs/index';

import { loadCurrentUserTokenIssuedAtMs } from './firebaseAuth';

type TimeIntegrityState = {
  lastCanonicalMs: number;
  lastWallClockMs: number;
  trustedCapturedWallClockMs: number | null;
  trustedServerMs: number | null;
};

const CLOCK_ROLLBACK_TOLERANCE_MS = 2 * 60 * 1000;
const MAX_OFFLINE_FORWARD_ADVANCE_MS = 6 * 60 * 60 * 1000;
const TIME_INTEGRITY_STORAGE_KEY = 'inqoura/time-integrity/v1';
const TRUSTED_TIME_REFRESH_INTERVAL_MS = 30 * 60 * 1000;

let cachedState: TimeIntegrityState | null = null;

function buildDefaultState(nowMs = Date.now()): TimeIntegrityState {
  return {
    lastCanonicalMs: nowMs,
    lastWallClockMs: nowMs,
    trustedCapturedWallClockMs: null,
    trustedServerMs: null,
  };
}

function normalizeState(value: unknown) {
  if (!value || typeof value !== 'object') {
    return buildDefaultState();
  }

  const candidate = value as Partial<TimeIntegrityState>;
  const fallback = buildDefaultState();

  return {
    lastCanonicalMs:
      typeof candidate.lastCanonicalMs === 'number'
        ? candidate.lastCanonicalMs
        : fallback.lastCanonicalMs,
    lastWallClockMs:
      typeof candidate.lastWallClockMs === 'number'
        ? candidate.lastWallClockMs
        : fallback.lastWallClockMs,
    trustedCapturedWallClockMs:
      typeof candidate.trustedCapturedWallClockMs === 'number'
        ? candidate.trustedCapturedWallClockMs
        : null,
    trustedServerMs:
      typeof candidate.trustedServerMs === 'number' ? candidate.trustedServerMs : null,
  } satisfies TimeIntegrityState;
}

async function loadState() {
  if (cachedState) {
    return cachedState;
  }

  const rawValue = await AsyncStorage.getItem(TIME_INTEGRITY_STORAGE_KEY);

  if (!rawValue) {
    cachedState = buildDefaultState();
    return cachedState;
  }

  try {
    cachedState = normalizeState(JSON.parse(rawValue));
  } catch {
    cachedState = buildDefaultState();
  }

  return cachedState;
}

async function saveState(nextState: TimeIntegrityState) {
  cachedState = nextState;
  await AsyncStorage.setItem(TIME_INTEGRITY_STORAGE_KEY, JSON.stringify(nextState));
}

function estimateTrustedNowMs(state: TimeIntegrityState, wallClockMs: number) {
  if (state.trustedServerMs === null || state.trustedCapturedWallClockMs === null) {
    return null;
  }

  return state.trustedServerMs + Math.max(0, wallClockMs - state.trustedCapturedWallClockMs);
}

function shouldRefreshTrustedTime(
  state: TimeIntegrityState,
  wallClockMs: number,
  suspiciousClockChange: boolean
) {
  if (suspiciousClockChange) {
    return true;
  }

  if (state.trustedCapturedWallClockMs === null || state.trustedServerMs === null) {
    return true;
  }

  return wallClockMs - state.trustedCapturedWallClockMs > TRUSTED_TIME_REFRESH_INTERVAL_MS;
}

async function refreshTrustedTime(
  state: TimeIntegrityState,
  forceRefresh: boolean
) {
  const trustedServerMs = await loadCurrentUserTokenIssuedAtMs(forceRefresh);

  if (trustedServerMs === null) {
    return state;
  }

  return {
    ...state,
    trustedCapturedWallClockMs: Date.now(),
    trustedServerMs,
  };
}

export async function getCanonicalNowMs() {
  let state = await loadState();
  const initialWallClockMs = Date.now();
  const rollbackDetected =
    initialWallClockMs + CLOCK_ROLLBACK_TOLERANCE_MS < state.lastWallClockMs;
  const forwardJumpDetected =
    initialWallClockMs - state.lastWallClockMs > MAX_OFFLINE_FORWARD_ADVANCE_MS;

  if (
    shouldRefreshTrustedTime(state, initialWallClockMs, rollbackDetected || forwardJumpDetected)
  ) {
    state = await refreshTrustedTime(state, rollbackDetected || forwardJumpDetected);
  }

  const wallClockMs = Date.now();
  const estimatedTrustedNowMs = estimateTrustedNowMs(state, wallClockMs);
  const previousCanonicalMs = state.lastCanonicalMs;
  let nextCanonicalMs = previousCanonicalMs;

  if (rollbackDetected) {
    nextCanonicalMs = Math.max(previousCanonicalMs, estimatedTrustedNowMs ?? previousCanonicalMs);
  } else if (forwardJumpDetected && estimatedTrustedNowMs === null) {
    nextCanonicalMs = Math.max(
      previousCanonicalMs,
      previousCanonicalMs + MAX_OFFLINE_FORWARD_ADVANCE_MS
    );
  } else {
    nextCanonicalMs = Math.max(previousCanonicalMs, wallClockMs, estimatedTrustedNowMs ?? 0);
  }

  await saveState({
    ...state,
    lastCanonicalMs: nextCanonicalMs,
    lastWallClockMs: wallClockMs,
  });

  return nextCanonicalMs;
}

export async function getCanonicalIsoNow() {
  return new Date(await getCanonicalNowMs()).toISOString();
}

export async function getCanonicalUtcDayKey() {
  return new Date(await getCanonicalNowMs()).toISOString().slice(0, 10);
}
