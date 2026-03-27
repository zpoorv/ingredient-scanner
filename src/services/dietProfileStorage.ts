import AsyncStorage from '@react-native-async-storage/async-storage/lib/commonjs/index';

import {
  DEFAULT_DIET_PROFILE_ID,
  isDietProfileId,
  type DietProfileId,
} from '../constants/dietProfiles';
import { getAuthSession } from '../store';
import {
  getSessionDietProfile,
  setSessionDietProfile,
} from '../store/profileSessionStore';
import { loadRemoteUserProfile } from './cloudUserDataService';
import { saveCurrentUserPreferences } from './userProfileService';

const LEGACY_DIET_PROFILE_STORAGE_KEY = 'ingredient-scanner/diet-profile/v1';
const DIET_PROFILE_STORAGE_KEY_PREFIX = 'inqoura/diet-profile/v2';
const DIET_PROFILE_INTRO_SEEN_STORAGE_KEY =
  'ingredient-scanner/diet-profile-intro-seen/v1';

function getDietProfileStorageKey(scopeId: string) {
  return `${DIET_PROFILE_STORAGE_KEY_PREFIX}/${scopeId}`;
}

function getDietProfileScopeId(uid?: string | null) {
  return uid ? `user:${uid}` : 'guest';
}

async function loadScopedDietProfile(scopeId: string) {
  const scopedValue = await AsyncStorage.getItem(getDietProfileStorageKey(scopeId));

  if (scopedValue && isDietProfileId(scopedValue)) {
    return scopedValue;
  }

  if (scopeId !== 'guest') {
    return null;
  }

  const legacyValue = await AsyncStorage.getItem(LEGACY_DIET_PROFILE_STORAGE_KEY);
  return legacyValue && isDietProfileId(legacyValue) ? legacyValue : null;
}

async function writeScopedDietProfile(scopeId: string, profileId: DietProfileId) {
  await AsyncStorage.setItem(getDietProfileStorageKey(scopeId), profileId);
}

export async function loadDietProfile(): Promise<DietProfileId> {
  const sessionUser = getAuthSession().user;
  const scopeId = getDietProfileScopeId(sessionUser?.id);
  const localProfileId = await loadScopedDietProfile(scopeId);

  const resolvedProfileId = localProfileId ?? DEFAULT_DIET_PROFILE_ID;
  setSessionDietProfile(resolvedProfileId);

  return resolvedProfileId;
}

export async function syncDietProfileForCurrentUser(): Promise<DietProfileId> {
  const sessionUser = getAuthSession().user;
  const scopeId = getDietProfileScopeId(sessionUser?.id);
  const localProfileId = await loadScopedDietProfile(scopeId);

  if (!sessionUser) {
    const guestProfileId = localProfileId ?? DEFAULT_DIET_PROFILE_ID;
    setSessionDietProfile(guestProfileId);
    return guestProfileId;
  }

  const remoteProfile = await loadRemoteUserProfile(sessionUser.id);

  if (remoteProfile && isDietProfileId(remoteProfile.dietProfileId)) {
    await writeScopedDietProfile(scopeId, remoteProfile.dietProfileId);
    setSessionDietProfile(remoteProfile.dietProfileId);
    return remoteProfile.dietProfileId;
  }

  const resolvedProfileId = localProfileId ?? DEFAULT_DIET_PROFILE_ID;
  await writeScopedDietProfile(scopeId, resolvedProfileId);
  setSessionDietProfile(resolvedProfileId);
  await saveCurrentUserPreferences({
    appearanceMode: remoteProfile?.appearanceMode ?? 'light',
    dietProfileId: resolvedProfileId,
  });

  return resolvedProfileId;
}

export async function saveDietProfile(profileId: DietProfileId) {
  const sessionUser = getAuthSession().user;
  const scopeId = getDietProfileScopeId(sessionUser?.id);

  await writeScopedDietProfile(scopeId, profileId);
  setSessionDietProfile(profileId);

  if (sessionUser) {
    const remoteProfile = await loadRemoteUserProfile(sessionUser.id);
    await saveCurrentUserPreferences({
      appearanceMode: remoteProfile?.appearanceMode ?? 'light',
      dietProfileId: profileId,
    });
  }

  return profileId;
}

export function loadSessionDietProfile() {
  return getSessionDietProfile();
}

export async function loadDietProfileIntroSeen() {
  const rawValue = await AsyncStorage.getItem(DIET_PROFILE_INTRO_SEEN_STORAGE_KEY);

  return rawValue === 'true';
}

export async function markDietProfileIntroSeen() {
  await AsyncStorage.setItem(DIET_PROFILE_INTRO_SEEN_STORAGE_KEY, 'true');
}

export async function clearDietProfile() {
  await clearDietProfileForUser(getAuthSession().user?.id);
}

export async function clearDietProfileForUser(uid?: string | null) {
  await AsyncStorage.removeItem(getDietProfileStorageKey(getDietProfileScopeId(uid)));

  if ((uid ?? null) === (getAuthSession().user?.id ?? null)) {
    setSessionDietProfile(DEFAULT_DIET_PROFILE_ID);
  }
}

export async function clearDietProfileIntroSeen() {
  await AsyncStorage.removeItem(DIET_PROFILE_INTRO_SEEN_STORAGE_KEY);
}
