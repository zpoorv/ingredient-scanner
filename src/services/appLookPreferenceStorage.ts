import AsyncStorage from '@react-native-async-storage/async-storage/lib/commonjs/index';

import { getAuthSession } from '../store';
import type { AppLookId } from '../models/preferences';
import { isAppLookId } from '../models/preferences';
import { saveCurrentUserPreferences } from './userProfileService';

const APP_LOOK_STORAGE_KEY_PREFIX = 'inqoura/app-look/v1';

function getAppLookStorageKey(scopeId: string) {
  return `${APP_LOOK_STORAGE_KEY_PREFIX}/${scopeId}`;
}

function getAppLookScopeId(uid?: string | null) {
  return uid ? `user:${uid}` : 'guest';
}

async function loadScopedAppLook(scopeId: string) {
  const scopedValue = await AsyncStorage.getItem(getAppLookStorageKey(scopeId));
  return isAppLookId(scopedValue) ? scopedValue : null;
}

async function writeScopedAppLook(scopeId: string, appLookId: AppLookId) {
  await AsyncStorage.setItem(getAppLookStorageKey(scopeId), appLookId);
}

export async function loadAppLookId(): Promise<AppLookId> {
  return loadAppLookIdForUser(getAuthSession().user?.id);
}

export async function loadAppLookIdForUser(
  uid?: string | null
): Promise<AppLookId> {
  const scopeId = getAppLookScopeId(uid);
  return (await loadScopedAppLook(scopeId)) ?? 'classic';
}

export async function syncAppLookForCurrentUser(): Promise<AppLookId> {
  const sessionUser = getAuthSession().user;
  const scopeId = getAppLookScopeId(sessionUser?.id);
  const localAppLookId = await loadScopedAppLook(scopeId);

  const resolvedAppLookId = localAppLookId ?? 'classic';
  await writeScopedAppLook(scopeId, resolvedAppLookId);

  if (sessionUser) {
    void saveCurrentUserPreferences({
      appLookId: resolvedAppLookId,
    }).catch(() => {
      // Keep app-look restores instant even if remote profile sync is slow.
    });
  }

  return resolvedAppLookId;
}

export async function saveAppLookId(appLookId: AppLookId) {
  const sessionUser = getAuthSession().user;
  const scopeId = getAppLookScopeId(sessionUser?.id);

  await writeScopedAppLook(scopeId, appLookId);

  if (sessionUser) {
    void saveCurrentUserPreferences({
      appLookId,
    }).catch(() => {
      // Local theme changes should not block on Firestore writes.
    });
  }

  return appLookId;
}

export async function clearAppLookIdForUser(uid?: string | null) {
  await AsyncStorage.removeItem(getAppLookStorageKey(getAppLookScopeId(uid)));
}
