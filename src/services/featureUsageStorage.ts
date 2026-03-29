import AsyncStorage from '@react-native-async-storage/async-storage/lib/commonjs/index';

import type { PremiumEntitlement, PremiumFeatureId } from '../models/premium';
import { getAuthSession, getPremiumSession } from '../store';

export type DailyFeatureId = Extract<
  PremiumFeatureId,
  'ingredient-ocr' | 'share-result-card'
>;

export type FeatureQuotaSnapshot = {
  baseLimit: number | null;
  bonusCredits: number;
  canUse: boolean;
  featureId: DailyFeatureId;
  isUnlimited: boolean;
  remaining: number | null;
  used: number;
};

type FeatureUsageRecord = {
  bonusCredits: number;
  used: number;
};

type FeatureUsageState = {
  dayKey: string;
  features: Record<DailyFeatureId, FeatureUsageRecord>;
};

const FEATURE_USAGE_STORAGE_KEY_PREFIX = 'inqoura/feature-usage/v1';
const BASIC_DAILY_LIMIT = 5;

function getFeatureUsageStorageKey(scopeId: string) {
  return `${FEATURE_USAGE_STORAGE_KEY_PREFIX}/${scopeId}`;
}

function getFeatureUsageScopeId(uid?: string | null) {
  return uid ? `user:${uid}` : 'guest';
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getDefaultFeatureUsageState(dayKey = getTodayKey()): FeatureUsageState {
  return {
    dayKey,
    features: {
      'ingredient-ocr': {
        bonusCredits: 0,
        used: 0,
      },
      'share-result-card': {
        bonusCredits: 0,
        used: 0,
      },
    },
  };
}

function isFeatureUsageRecord(value: unknown): value is FeatureUsageRecord {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<FeatureUsageRecord>;
  return typeof candidate.used === 'number' && typeof candidate.bonusCredits === 'number';
}

function normalizeFeatureUsageState(value: unknown): FeatureUsageState {
  const fallback = getDefaultFeatureUsageState();

  if (!value || typeof value !== 'object') {
    return fallback;
  }

  const candidate = value as Partial<FeatureUsageState>;
  const dayKey = candidate.dayKey === getTodayKey() ? candidate.dayKey : getTodayKey();
  const features = (candidate.features ?? {}) as Partial<
    Record<DailyFeatureId, FeatureUsageRecord>
  >;

  return {
    dayKey,
    features: {
      'ingredient-ocr': isFeatureUsageRecord(features['ingredient-ocr'])
        ? features['ingredient-ocr']
        : fallback.features['ingredient-ocr'],
      'share-result-card': isFeatureUsageRecord(features['share-result-card'])
        ? features['share-result-card']
        : fallback.features['share-result-card'],
    },
  };
}

async function loadScopedFeatureUsageState(scopeId: string) {
  const rawValue = await AsyncStorage.getItem(getFeatureUsageStorageKey(scopeId));

  if (!rawValue) {
    return getDefaultFeatureUsageState();
  }

  try {
    return normalizeFeatureUsageState(JSON.parse(rawValue));
  } catch {
    return getDefaultFeatureUsageState();
  }
}

async function writeScopedFeatureUsageState(
  scopeId: string,
  state: FeatureUsageState
) {
  await AsyncStorage.setItem(getFeatureUsageStorageKey(scopeId), JSON.stringify(state));
}

function getDailyFeatureLimit(
  featureId: DailyFeatureId,
  entitlement: PremiumEntitlement
) {
  if (entitlement.isPremium) {
    return null;
  }

  if (featureId === 'ingredient-ocr' || featureId === 'share-result-card') {
    return BASIC_DAILY_LIMIT;
  }

  return BASIC_DAILY_LIMIT;
}

function buildQuotaSnapshot(
  featureId: DailyFeatureId,
  entitlement: PremiumEntitlement,
  usageRecord: FeatureUsageRecord
): FeatureQuotaSnapshot {
  const baseLimit = getDailyFeatureLimit(featureId, entitlement);

  if (baseLimit === null) {
    return {
      baseLimit: null,
      bonusCredits: 0,
      canUse: true,
      featureId,
      isUnlimited: true,
      remaining: null,
      used: usageRecord.used,
    };
  }

  const remainingBaseUses = Math.max(0, baseLimit - usageRecord.used);
  const remaining = remainingBaseUses + usageRecord.bonusCredits;

  return {
    baseLimit,
    bonusCredits: usageRecord.bonusCredits,
    canUse: remaining > 0,
    featureId,
    isUnlimited: false,
    remaining,
    used: usageRecord.used,
  };
}

async function loadFeatureUsageState() {
  const scopeId = getFeatureUsageScopeId(getAuthSession().user?.id);
  const state = await loadScopedFeatureUsageState(scopeId);

  if (state.dayKey !== getTodayKey()) {
    const nextState = getDefaultFeatureUsageState();
    await writeScopedFeatureUsageState(scopeId, nextState);
    return { scopeId, state: nextState };
  }

  return { scopeId, state };
}

export async function loadFeatureQuotaSnapshot(
  featureId: DailyFeatureId,
  entitlement: PremiumEntitlement = getPremiumSession()
) {
  const { state } = await loadFeatureUsageState();
  return buildQuotaSnapshot(featureId, entitlement, state.features[featureId]);
}

export async function consumeFeatureQuota(
  featureId: DailyFeatureId,
  entitlement: PremiumEntitlement = getPremiumSession()
) {
  const { scopeId, state } = await loadFeatureUsageState();
  const snapshot = buildQuotaSnapshot(featureId, entitlement, state.features[featureId]);

  if (!snapshot.canUse) {
    return { allowed: false, snapshot };
  }

  if (!snapshot.isUnlimited) {
    const usageRecord = state.features[featureId];

    if (usageRecord.used >= BASIC_DAILY_LIMIT && usageRecord.bonusCredits > 0) {
      usageRecord.bonusCredits -= 1;
    } else {
      usageRecord.used += 1;
    }

    await writeScopedFeatureUsageState(scopeId, state);
  }

  return {
    allowed: true,
    snapshot: await loadFeatureQuotaSnapshot(featureId, entitlement),
  };
}

export async function grantRewardedOcrBonus() {
  const { scopeId, state } = await loadFeatureUsageState();
  state.features['ingredient-ocr'].bonusCredits += 1;
  await writeScopedFeatureUsageState(scopeId, state);
  return loadFeatureQuotaSnapshot('ingredient-ocr');
}

export async function clearFeatureUsageForUser(uid?: string | null) {
  await AsyncStorage.removeItem(
    getFeatureUsageStorageKey(getFeatureUsageScopeId(uid))
  );
}
