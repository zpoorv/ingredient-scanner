import AsyncStorage from '@react-native-async-storage/async-storage/lib/commonjs/index';

import { getAuthSession } from '../store';
import type { AppearanceMode } from '../models/preferences';
import { isAppearanceMode } from '../models/preferences';
import { saveCurrentUserPreferences } from './userProfileService';

const LEGACY_APPEARANCE_MODE_STORAGE_KEY = 'inqoura/appearance-mode/v1';
const APPEARANCE_MODE_STORAGE_KEY_PREFIX = 'inqoura/appearance-mode/v2';

function getAppearanceModeStorageKey(scopeId: string) {
  return `${APPEARANCE_MODE_STORAGE_KEY_PREFIX}/${scopeId}`;
}

function getAppearanceModeScopeId(uid?: string | null) {
  return uid ? `user:${uid}` : 'guest';
}

async function loadScopedAppearanceMode(scopeId: string) {
  const scopedValue = await AsyncStorage.getItem(getAppearanceModeStorageKey(scopeId));

  if (isAppearanceMode(scopedValue)) {
    return scopedValue;
  }

  if (scopeId !== 'guest') {
    return null;
  }

  const legacyValue = await AsyncStorage.getItem(LEGACY_APPEARANCE_MODE_STORAGE_KEY);
  return isAppearanceMode(legacyValue) ? legacyValue : null;
}

async function writeScopedAppearanceMode(scopeId: string, mode: AppearanceMode) {
  await AsyncStorage.setItem(getAppearanceModeStorageKey(scopeId), mode);
}

export async function loadAppearanceMode(): Promise<AppearanceMode> {
  return loadAppearanceModeForUser(getAuthSession().user?.id);
}

export async function loadAppearanceModeForUser(
  uid?: string | null
): Promise<AppearanceMode> {
  const scopeId = getAppearanceModeScopeId(uid);
  return (await loadScopedAppearanceMode(scopeId)) ?? 'light';
}

export async function syncAppearanceModeForCurrentUser(): Promise<AppearanceMode> {
  const sessionUser = getAuthSession().user;
  const scopeId = getAppearanceModeScopeId(sessionUser?.id);
  const localMode = await loadScopedAppearanceMode(scopeId);

  const resolvedMode = localMode ?? 'light';
  await writeScopedAppearanceMode(scopeId, resolvedMode);

  if (sessionUser) {
    await saveCurrentUserPreferences({
      appearanceMode: resolvedMode,
    });
  }

  return resolvedMode;
}

export async function saveAppearanceMode(mode: AppearanceMode) {
  const sessionUser = getAuthSession().user;
  const scopeId = getAppearanceModeScopeId(sessionUser?.id);

  await writeScopedAppearanceMode(scopeId, mode);

  if (sessionUser) {
    await saveCurrentUserPreferences({
      appearanceMode: mode,
    });
  }

  return mode;
}

export async function clearAppearanceMode() {
  await clearAppearanceModeForUser(getAuthSession().user?.id);
}

export async function clearAppearanceModeForUser(uid?: string | null) {
  await AsyncStorage.removeItem(
    getAppearanceModeStorageKey(getAppearanceModeScopeId(uid))
  );
}
