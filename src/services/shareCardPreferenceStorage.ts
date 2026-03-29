import AsyncStorage from '@react-native-async-storage/async-storage/lib/commonjs/index';

import { getAuthSession } from '../store';
import type { ShareCardStyleId } from '../models/shareCardStyle';
import { isShareCardStyleId } from '../models/shareCardStyle';
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

  const resolvedShareCardStyleId = localShareCardStyleId ?? 'classic';
  await writeScopedShareCardStyle(scopeId, resolvedShareCardStyleId);

  if (sessionUser) {
    void saveCurrentUserPreferences({
      shareCardStyleId: resolvedShareCardStyleId,
    }).catch(() => {
      // Keep share-style restores instant even if profile sync is slow.
    });
  }

  return resolvedShareCardStyleId;
}

export async function saveShareCardStyleId(shareCardStyleId: ShareCardStyleId) {
  const sessionUser = getAuthSession().user;
  const scopeId = getShareCardScopeId(sessionUser?.id);

  await writeScopedShareCardStyle(scopeId, shareCardStyleId);

  if (sessionUser) {
    void saveCurrentUserPreferences({
      shareCardStyleId,
    }).catch(() => {
      // Local share-style changes should not block on remote profile writes.
    });
  }

  return shareCardStyleId;
}

export async function clearShareCardStyleForUser(uid?: string | null) {
  await AsyncStorage.removeItem(
    getShareCardStyleStorageKey(getShareCardScopeId(uid))
  );
}
