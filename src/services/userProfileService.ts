import { updateProfile } from 'firebase/auth';

import {
  DEFAULT_DIET_PROFILE_ID,
  isDietProfileId,
} from '../constants/dietProfiles';
import type { AuthUser } from '../models/auth';
import { isAppLookId, isAppearanceMode } from '../models/preferences';
import { isShareCardStyleId } from '../models/shareCardStyle';
import { getAuthSession } from '../store';
import type { UserProfile } from '../models/userProfile';
import { getFirebaseAuth } from './firebaseAuth';
import { AuthServiceError } from './authHelpers';
import {
  clearStoredUserProfile,
  loadStoredUserProfile,
  saveStoredUserProfile,
} from './userProfileStorage';
import { loadRemoteUserProfile, saveRemoteUserProfile } from './cloudUserDataService';

function buildDefaultProfileFromAuthUser(authUser: AuthUser): UserProfile {
  const now = new Date().toISOString();

  return {
    appLookId: 'classic',
    appearanceMode: 'light',
    countryCode: null,
    createdAt: authUser.createdAt || now,
    dietProfileId: DEFAULT_DIET_PROFILE_ID,
    email: authUser.email,
    historyInsightsEnabled: true,
    name: authUser.displayName ?? '',
    plan: 'free',
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
      historyInsightsEnabled:
        remoteProfile?.historyInsightsEnabled ??
        localProfile?.historyInsightsEnabled ??
        baseProfile.historyInsightsEnabled,
      plan: remoteProfile?.plan ?? localProfile?.plan ?? baseProfile.plan,
      role: remoteProfile?.role ?? localProfile?.role ?? baseProfile.role,
      shareCardStyleId: resolveShareCardStyleIdValue(
        remoteShareCardStyleId,
        localShareCardStyleId,
        baseProfile.shareCardStyleId
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
      | 'historyInsightsEnabled'
      | 'name'
      | 'shareCardStyleId'
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
    name:
      typeof patch.name === 'string' ? patch.name.trim() : currentProfile.name,
    updatedAt: new Date().toISOString(),
  };

  if (!nextProfile.name.trim()) {
    throw new AuthServiceError('Enter your name.');
  }

  await saveStoredUserProfile(nextProfile);
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
      | 'dietProfileId'
      | 'historyInsightsEnabled'
      | 'shareCardStyleId'
    >
  >
) {
  return saveUserProfilePatch({
    appLookId: input.appLookId,
    appearanceMode: input.appearanceMode,
    dietProfileId: input.dietProfileId,
    historyInsightsEnabled: input.historyInsightsEnabled,
    shareCardStyleId: input.shareCardStyleId,
  });
}

export async function clearUserProfile(uid: string) {
  await clearStoredUserProfile(uid);
}
