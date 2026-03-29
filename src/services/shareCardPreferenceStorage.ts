import AsyncStorage from '@react-native-async-storage/async-storage/lib/commonjs/index';

import { getAuthSession } from '../store';
import type { ShareCardStyleId } from '../models/shareCardStyle';
import { isShareCardStyleId } from '../models/shareCardStyle';
import { loadRemoteUserProfile } from './cloudUserDataService';
import { saveCurrentUserPreferences } from './userProfileService';

const SHARE_CARD_STYLE_STORAGE_KEY_PREFIX = 'inqoura/share-card-style/v1';

function getShareCardStyleStorageKey(scopeId: string) {
  return `${SHARE_CARD_STYLE_STORAGE_KEY_PREFIX}/${scopeId}`;
}

function getShareCardScopeId(uid?: string | null) {
  return uid ? `user:${uid}` : 'guest';
}

async function loadScopedShareCardStyle(scopeId: string) {
  const scopedValue = await AsyncStorage.getItem(
    getShareCardStyleStorageKey(scopeId)
  );
  return isShareCardStyleId(scopedValue) ? scopedValue : null;
}

async function writeScopedShareCardStyle(
  scopeId: string,
  shareCardStyleId: ShareCardStyleId
) {
  await AsyncStorage.setItem(
    getShareCardStyleStorageKey(scopeId),
    shareCardStyleId
  );
}

export async function loadShareCardStyleId(): Promise<ShareCardStyleId> {
  const sessionUser = getAuthSession().user;
  const scopeId = getShareCardScopeId(sessionUser?.id);
  return (await loadScopedShareCardStyle(scopeId)) ?? 'classic';
}

export async function syncShareCardStyleForCurrentUser(): Promise<ShareCardStyleId> {
  const sessionUser = getAuthSession().user;
  const scopeId = getShareCardScopeId(sessionUser?.id);
  const localShareCardStyleId = await loadScopedShareCardStyle(scopeId);

  if (!sessionUser) {
    return localShareCardStyleId ?? 'classic';
  }

  const remoteProfile = await loadRemoteUserProfile(sessionUser.id);

  if (isShareCardStyleId(remoteProfile?.shareCardStyleId)) {
    await writeScopedShareCardStyle(scopeId, remoteProfile.shareCardStyleId);
    return remoteProfile.shareCardStyleId;
  }

  const resolvedShareCardStyleId = localShareCardStyleId ?? 'classic';
  await writeScopedShareCardStyle(scopeId, resolvedShareCardStyleId);
  await saveCurrentUserPreferences({
    shareCardStyleId: resolvedShareCardStyleId,
  });
  return resolvedShareCardStyleId;
}

export async function saveShareCardStyleId(shareCardStyleId: ShareCardStyleId) {
  const sessionUser = getAuthSession().user;
  const scopeId = getShareCardScopeId(sessionUser?.id);

  await writeScopedShareCardStyle(scopeId, shareCardStyleId);

  if (sessionUser) {
    await saveCurrentUserPreferences({
      shareCardStyleId,
    });
  }

  return shareCardStyleId;
}

export async function clearShareCardStyleForUser(uid?: string | null) {
  await AsyncStorage.removeItem(
    getShareCardStyleStorageKey(getShareCardScopeId(uid))
  );
}
