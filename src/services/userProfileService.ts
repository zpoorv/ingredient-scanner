import { updateProfile } from 'firebase/auth';

import {
  DEFAULT_DIET_PROFILE_ID,
  isDietProfileId,
} from '../constants/dietProfiles';
import { isAppLanguageCode } from '../constants/languages';
import { isRestrictionId } from '../constants/restrictions';
import type { AuthUser } from '../models/auth';
import type { HouseholdProfile } from '../models/householdProfile';
import { isAppLookId, isAppearanceMode } from '../models/preferences';
import type { RestrictionSeverity } from '../models/restrictions';
import { isShareCardStyleId } from '../models/shareCardStyle';
import { getAuthSession } from '../store';
import type {
  HistoryNotificationCadence,
  UserProfile,
} from '../models/userProfile';
import { getFirebaseAuth } from './firebaseAuth';
import { AuthServiceError } from './authHelpers';
import {
  invalidateSessionResourceCache,
  primeSessionResourceCache,
  SESSION_CACHE_KEYS,
} from './sessionResourceCache';
import {
  clearStoredUserProfile,
  loadStoredUserProfile,
  saveStoredUserProfile,
} from './userProfileStorage';
import { loadRemoteUserProfile, saveRemoteUserProfile } from './cloudUserDataService';
import { getDeviceLanguageCode } from './languagePreferenceStorage';

function buildDefaultProfileFromAuthUser(authUser: AuthUser): UserProfile {
  const now = new Date().toISOString();

  return {
    activeHouseholdProfileId: null,
    appLookId: 'classic',
    appearanceMode: 'light',
    comparisonProductCodes: [],
    countryCode: null,
    createdAt: authUser.createdAt || now,
    dietProfileId: DEFAULT_DIET_PROFILE_ID,
    email: authUser.email,
    favoriteProductCodes: [],
    historyInsightsEnabled: true,
    historyNotificationCadence: 'weekly',
    historyNotificationsEnabled: false,
    householdProfiles: [],
    languageCode: getDeviceLanguageCode(),
    name: authUser.displayName ?? '',
    plan: 'free',
    restrictionIds: [],
    restrictionSeverity: 'strict',
    role: 'user',
    shareCardStyleId: 'classic',
    uid: authUser.id,
    updatedAt: authUser.updatedAt || now,
  };
}

function buildDefaultProfile(): UserProfile | null {
  const authUser = getAuthSession().user;
  return authUser ? buildDefaultProfileFromAuthUser(authUser) : null;
}

function resolveAppearanceModeValue(
  remoteAppearanceMode: string | null | undefined,
  localAppearanceMode: string | null | undefined,
  baseAppearanceMode: UserProfile['appearanceMode']
): UserProfile['appearanceMode'] {
  if (isAppearanceMode(remoteAppearanceMode)) {
    return remoteAppearanceMode;
  }

  if (isAppearanceMode(localAppearanceMode)) {
    return localAppearanceMode;
  }

  return baseAppearanceMode;
}

function resolveDietProfileIdValue(
  remoteDietProfileId: string | null | undefined,
  localDietProfileId: string | null | undefined,
  baseDietProfileId: UserProfile['dietProfileId']
): UserProfile['dietProfileId'] {
  if (typeof remoteDietProfileId === 'string' && isDietProfileId(remoteDietProfileId)) {
    return remoteDietProfileId;
  }

  if (typeof localDietProfileId === 'string' && isDietProfileId(localDietProfileId)) {
    return localDietProfileId;
  }

  return baseDietProfileId;
}

function resolveAppLookIdValue(
  remoteAppLookId: string | null | undefined,
  localAppLookId: string | null | undefined,
  baseAppLookId: UserProfile['appLookId']
): UserProfile['appLookId'] {
  if (isAppLookId(remoteAppLookId)) {
    return remoteAppLookId;
  }

  if (isAppLookId(localAppLookId)) {
    return localAppLookId;
  }

  return baseAppLookId;
}

function resolveShareCardStyleIdValue(
  remoteShareCardStyleId: string | null | undefined,
  localShareCardStyleId: string | null | undefined,
  baseShareCardStyleId: UserProfile['shareCardStyleId']
): UserProfile['shareCardStyleId'] {
  if (isShareCardStyleId(remoteShareCardStyleId)) {
    return remoteShareCardStyleId;
  }

  if (isShareCardStyleId(localShareCardStyleId)) {
    return localShareCardStyleId;
  }

  return baseShareCardStyleId;
}

function resolveHistoryNotificationCadenceValue(
  remoteCadence: string | null | undefined,
  localCadence: string | null | undefined,
  baseCadence: HistoryNotificationCadence
): HistoryNotificationCadence {
  if (remoteCadence === 'smart' || remoteCadence === 'weekly') {
    return remoteCadence;
  }

  if (localCadence === 'smart' || localCadence === 'weekly') {
    return localCadence;
  }

  return baseCadence;
}

function resolveLanguageCodeValue(
  remoteLanguageCode: string | null | undefined,
  localLanguageCode: string | null | undefined,
  baseLanguageCode: UserProfile['languageCode']
): UserProfile['languageCode'] {
  if (isAppLanguageCode(remoteLanguageCode)) {
    return remoteLanguageCode;
  }

  if (isAppLanguageCode(localLanguageCode)) {
    return localLanguageCode;
  }

  return baseLanguageCode;
}

function resolveRestrictionSeverityValue(
  remoteSeverity: string | null | undefined,
  localSeverity: string | null | undefined,
  fallback: RestrictionSeverity
) {
  if (remoteSeverity === 'caution' || remoteSeverity === 'strict') {
    return remoteSeverity;
  }

  if (localSeverity === 'caution' || localSeverity === 'strict') {
    return localSeverity;
  }

  return fallback;
}

function resolveStringArray(
  remoteValue: unknown,
  localValue: unknown,
  fallback: string[]
) {
  if (Array.isArray(remoteValue)) {
    return remoteValue.filter((item): item is string => typeof item === 'string');
  }

  if (Array.isArray(localValue)) {
    return localValue.filter((item): item is string => typeof item === 'string');
  }

  return fallback;
}

function resolveHouseholdProfiles(
  remoteValue: unknown,
  localValue: unknown
) {
  const sourceValue = Array.isArray(remoteValue)
    ? remoteValue
    : Array.isArray(localValue)
      ? localValue
      : [];

  return sourceValue
    .map((value) => {
      if (!value || typeof value !== 'object') {
        return null;
      }

      const candidate = value as Partial<HouseholdProfile>;

      if (typeof candidate.id !== 'string' || typeof candidate.name !== 'string') {
        return null;
      }

      const rawDietProfileId = candidate.dietProfileId;
      const dietProfileId =
        typeof rawDietProfileId === 'string' && isDietProfileId(rawDietProfileId)
          ? rawDietProfileId
          : DEFAULT_DIET_PROFILE_ID;

      return {
        dietProfileId,
        id: candidate.id,
        name: candidate.name.trim(),
        restrictionIds: Array.isArray(candidate.restrictionIds)
          ? candidate.restrictionIds.filter(isRestrictionId)
          : [],
        restrictionSeverity: resolveRestrictionSeverityValue(
          candidate.restrictionSeverity,
          candidate.restrictionSeverity,
          'strict'
        ),
      } satisfies HouseholdProfile;
    })
    .filter(
      (profile): profile is HouseholdProfile =>
        profile !== null && Boolean(profile.name.trim())
    )
    .slice(0, 4);
}

async function resolveUserProfile(baseProfile: UserProfile) {
  const [localProfile, remoteProfile] = await Promise.all([
    loadStoredUserProfile(baseProfile.uid),
    loadRemoteUserProfile(baseProfile.uid),
  ]);
  const remoteAppearanceMode = remoteProfile?.appearanceMode;
  const remoteAppLookId = remoteProfile?.appLookId;
  const localAppearanceMode = localProfile?.appearanceMode;
  const localAppLookId = localProfile?.appLookId;
  const remoteDietProfileId = remoteProfile?.dietProfileId;
  const localDietProfileId = localProfile?.dietProfileId;
  const remoteShareCardStyleId = remoteProfile?.shareCardStyleId;
  const localShareCardStyleId = localProfile?.shareCardStyleId;
  const remoteLanguageCode = remoteProfile?.languageCode;
  const localLanguageCode = localProfile?.languageCode;
  const householdProfiles = resolveHouseholdProfiles(
    remoteProfile?.householdProfiles,
    localProfile?.householdProfiles
  );
  const activeHouseholdProfileId =
    typeof remoteProfile?.activeHouseholdProfileId === 'string'
      ? remoteProfile.activeHouseholdProfileId
      : typeof localProfile?.activeHouseholdProfileId === 'string'
        ? localProfile.activeHouseholdProfileId
        : null;

  return {
    profile: {
      ...baseProfile,
      ...(localProfile ?? {}),
      ...(remoteProfile ?? {}),
      appLookId: resolveAppLookIdValue(
        remoteAppLookId,
        localAppLookId,
        baseProfile.appLookId
      ),
      createdAt:
        remoteProfile?.createdAt ??
        localProfile?.createdAt ??
        baseProfile.createdAt,
      appearanceMode: resolveAppearanceModeValue(
        remoteAppearanceMode,
        localAppearanceMode,
        baseProfile.appearanceMode
      ),
      email: baseProfile.email,
      dietProfileId: resolveDietProfileIdValue(
        remoteDietProfileId,
        localDietProfileId,
        baseProfile.dietProfileId
      ),
      favoriteProductCodes: resolveStringArray(
        remoteProfile?.favoriteProductCodes,
        localProfile?.favoriteProductCodes,
        baseProfile.favoriteProductCodes
      ),
      historyInsightsEnabled:
        remoteProfile?.historyInsightsEnabled ??
        localProfile?.historyInsightsEnabled ??
        baseProfile.historyInsightsEnabled,
      historyNotificationCadence: resolveHistoryNotificationCadenceValue(
        remoteProfile?.historyNotificationCadence,
        localProfile?.historyNotificationCadence,
        baseProfile.historyNotificationCadence
      ),
      languageCode: resolveLanguageCodeValue(
        remoteLanguageCode,
        localLanguageCode,
        baseProfile.languageCode
      ),
      historyNotificationsEnabled:
        remoteProfile?.historyNotificationsEnabled ??
        localProfile?.historyNotificationsEnabled ??
        baseProfile.historyNotificationsEnabled,
      householdProfiles,
      activeHouseholdProfileId:
        activeHouseholdProfileId &&
        householdProfiles.some((profile) => profile.id === activeHouseholdProfileId)
          ? activeHouseholdProfileId
          : null,
      plan: remoteProfile?.plan ?? localProfile?.plan ?? baseProfile.plan,
      restrictionIds: resolveStringArray(
        remoteProfile?.restrictionIds,
        localProfile?.restrictionIds,
        baseProfile.restrictionIds
      ).filter(isRestrictionId),
      restrictionSeverity: resolveRestrictionSeverityValue(
        remoteProfile?.restrictionSeverity,
        localProfile?.restrictionSeverity,
        baseProfile.restrictionSeverity
      ),
      role: remoteProfile?.role ?? localProfile?.role ?? baseProfile.role,
      shareCardStyleId: resolveShareCardStyleIdValue(
        remoteShareCardStyleId,
        localShareCardStyleId,
        baseProfile.shareCardStyleId
      ),
      comparisonProductCodes: resolveStringArray(
        remoteProfile?.comparisonProductCodes,
        localProfile?.comparisonProductCodes,
        baseProfile.comparisonProductCodes
      ),
      uid: baseProfile.uid,
      updatedAt: remoteProfile?.updatedAt ?? localProfile?.updatedAt ?? baseProfile.updatedAt,
    },
    remoteProfile,
  };
}

export async function loadUserProfile() {
  const defaultProfile = buildDefaultProfile();

  if (!defaultProfile) {
    return null;
  }

  const localProfile = await loadStoredUserProfile(defaultProfile.uid);
  const resolvedProfile: UserProfile = {
    ...defaultProfile,
    ...(localProfile ?? {}),
    email: defaultProfile.email,
    uid: defaultProfile.uid,
  };

  await saveStoredUserProfile(resolvedProfile);
  primeSessionResourceCache(SESSION_CACHE_KEYS.userProfile, resolvedProfile);
  invalidateSessionResourceCache(SESSION_CACHE_KEYS.effectiveShoppingProfile);
  return resolvedProfile;
}

export async function syncCurrentUserProfileToFirestore() {
  const defaultProfile = buildDefaultProfile();

  if (!defaultProfile) {
    return null;
  }

  const { profile: mergedProfile, remoteProfile } = await resolveUserProfile(defaultProfile);
  const syncedProfile: UserProfile = {
    ...mergedProfile,
    // Login is the best time to backfill missing Firestore user docs for admin tools.
    updatedAt: new Date().toISOString(),
  };

  await saveStoredUserProfile(syncedProfile);
  primeSessionResourceCache(SESSION_CACHE_KEYS.userProfile, syncedProfile);
  invalidateSessionResourceCache(SESSION_CACHE_KEYS.effectiveShoppingProfile);

  if (!remoteProfile || JSON.stringify(remoteProfile) !== JSON.stringify(syncedProfile)) {
    await saveRemoteUserProfile(syncedProfile);
  }

  return syncedProfile;
}

async function saveUserProfilePatch(
  patch: Partial<
    Pick<
      UserProfile,
      | 'appLookId'
      | 'appearanceMode'
      | 'countryCode'
      | 'dietProfileId'
      | 'favoriteProductCodes'
      | 'historyInsightsEnabled'
      | 'historyNotificationCadence'
      | 'historyNotificationsEnabled'
      | 'householdProfiles'
      | 'languageCode'
      | 'name'
      | 'comparisonProductCodes'
      | 'restrictionIds'
      | 'restrictionSeverity'
      | 'shareCardStyleId'
      | 'activeHouseholdProfileId'
    >
  >
) {
  const currentProfile =
    (await syncCurrentUserProfileToFirestore()) ?? (await loadUserProfile());

  if (!currentProfile) {
    return null;
  }

  const nextProfile: UserProfile = {
    ...currentProfile,
    ...patch,
    comparisonProductCodes: Array.isArray(patch.comparisonProductCodes)
      ? patch.comparisonProductCodes
      : currentProfile.comparisonProductCodes,
    favoriteProductCodes: Array.isArray(patch.favoriteProductCodes)
      ? patch.favoriteProductCodes
      : currentProfile.favoriteProductCodes,
    householdProfiles: Array.isArray(patch.householdProfiles)
      ? resolveHouseholdProfiles(patch.householdProfiles, [])
      : currentProfile.householdProfiles,
    historyNotificationCadence:
      patch.historyNotificationCadence ?? currentProfile.historyNotificationCadence,
    historyNotificationsEnabled:
      patch.historyNotificationsEnabled ?? currentProfile.historyNotificationsEnabled,
    activeHouseholdProfileId:
      typeof patch.activeHouseholdProfileId === 'string' || patch.activeHouseholdProfileId === null
        ? patch.activeHouseholdProfileId
        : currentProfile.activeHouseholdProfileId,
    restrictionIds: Array.isArray(patch.restrictionIds)
      ? patch.restrictionIds.filter(isRestrictionId)
      : currentProfile.restrictionIds,
    restrictionSeverity:
      patch.restrictionSeverity ?? currentProfile.restrictionSeverity,
    name:
      typeof patch.name === 'string' ? patch.name.trim() : currentProfile.name,
    updatedAt: new Date().toISOString(),
  };

  if (
    nextProfile.activeHouseholdProfileId &&
    !nextProfile.householdProfiles.some(
      (profile) => profile.id === nextProfile.activeHouseholdProfileId
    )
  ) {
    nextProfile.activeHouseholdProfileId = null;
  }

  if (!nextProfile.name.trim()) {
    throw new AuthServiceError('Enter your name.');
  }

  await saveStoredUserProfile(nextProfile);
  primeSessionResourceCache(SESSION_CACHE_KEYS.userProfile, nextProfile);
  invalidateSessionResourceCache(SESSION_CACHE_KEYS.effectiveShoppingProfile);
  await saveRemoteUserProfile(nextProfile);

  const auth = getFirebaseAuth();
  if (auth.currentUser && nextProfile.name !== auth.currentUser.displayName) {
    await updateProfile(auth.currentUser, {
      displayName: nextProfile.name || null,
    }).catch(() => {
      // The profile document is still stored even if auth profile update fails.
    });
  }

  return nextProfile;
}

export async function saveUserProfile(
  input: Pick<UserProfile, 'countryCode' | 'name'>
) {
  return saveUserProfilePatch({
    countryCode: input.countryCode,
    name: input.name,
  });
}

export async function saveCurrentUserPreferences(
  input: Partial<
    Pick<
      UserProfile,
      | 'appLookId'
      | 'appearanceMode'
      | 'comparisonProductCodes'
      | 'dietProfileId'
      | 'favoriteProductCodes'
      | 'historyInsightsEnabled'
      | 'historyNotificationCadence'
      | 'historyNotificationsEnabled'
      | 'householdProfiles'
      | 'languageCode'
      | 'activeHouseholdProfileId'
      | 'restrictionIds'
      | 'restrictionSeverity'
      | 'shareCardStyleId'
    >
  >
) {
  return saveUserProfilePatch({
    appLookId: input.appLookId,
    appearanceMode: input.appearanceMode,
    comparisonProductCodes: input.comparisonProductCodes,
    dietProfileId: input.dietProfileId,
    favoriteProductCodes: input.favoriteProductCodes,
    historyInsightsEnabled: input.historyInsightsEnabled,
    historyNotificationCadence: input.historyNotificationCadence,
    historyNotificationsEnabled: input.historyNotificationsEnabled,
    householdProfiles: input.householdProfiles,
    languageCode: input.languageCode,
    activeHouseholdProfileId: input.activeHouseholdProfileId,
    restrictionIds: input.restrictionIds,
    restrictionSeverity: input.restrictionSeverity,
    shareCardStyleId: input.shareCardStyleId,
  });
}

export async function clearUserProfile(uid: string) {
  await clearStoredUserProfile(uid);
  invalidateSessionResourceCache(SESSION_CACHE_KEYS.userProfile);
  invalidateSessionResourceCache(SESSION_CACHE_KEYS.effectiveShoppingProfile);
}
