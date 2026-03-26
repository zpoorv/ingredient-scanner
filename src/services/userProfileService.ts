import { updateProfile } from 'firebase/auth';

import type { AuthUser } from '../models/auth';
import { getAuthSession } from '../store';
import type { UserProfile } from '../models/userProfile';
import { getFirebaseAuth } from './firebaseAuth';
import {
  clearStoredUserProfile,
  loadStoredUserProfile,
  saveStoredUserProfile,
} from './userProfileStorage';
import { loadRemoteUserProfile, saveRemoteUserProfile } from './cloudUserDataService';

function buildDefaultProfileFromAuthUser(authUser: AuthUser): UserProfile {
  const now = new Date().toISOString();

  return {
    age: null,
    countryCode: null,
    createdAt: authUser.createdAt || now,
    email: authUser.email,
    name: authUser.displayName ?? '',
    plan: 'free',
    role: 'user',
    uid: authUser.id,
    updatedAt: authUser.updatedAt || now,
  };
}

function buildDefaultProfile(): UserProfile | null {
  const authUser = getAuthSession().user;
  return authUser ? buildDefaultProfileFromAuthUser(authUser) : null;
}

async function resolveUserProfile(baseProfile: UserProfile) {
  const [localProfile, remoteProfile] = await Promise.all([
    loadStoredUserProfile(baseProfile.uid),
    loadRemoteUserProfile(baseProfile.uid),
  ]);

  return {
    profile: {
      ...baseProfile,
      ...(localProfile ?? {}),
      ...(remoteProfile ?? {}),
      createdAt:
        remoteProfile?.createdAt ??
        localProfile?.createdAt ??
        baseProfile.createdAt,
      email: baseProfile.email,
      plan: remoteProfile?.plan ?? localProfile?.plan ?? baseProfile.plan,
      role: remoteProfile?.role ?? localProfile?.role ?? baseProfile.role,
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

  const { profile: mergedProfile } = await resolveUserProfile(defaultProfile);

  await saveStoredUserProfile(mergedProfile);
  return mergedProfile;
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

export async function saveUserProfile(
  input: Pick<UserProfile, 'age' | 'countryCode' | 'name'>
) {
  const currentProfile =
    (await syncCurrentUserProfileToFirestore()) ?? (await loadUserProfile());

  if (!currentProfile) {
    return null;
  }

  const nextProfile: UserProfile = {
    ...currentProfile,
    age: input.age,
    countryCode: input.countryCode,
    name: input.name.trim(),
    updatedAt: new Date().toISOString(),
  };

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

export async function clearUserProfile(uid: string) {
  await clearStoredUserProfile(uid);
}
