import {
  DEFAULT_DIET_PROFILE_ID,
  isDietProfileId,
  type DietProfileId,
} from '../constants/dietProfiles';
import type { AuthSession } from '../models/auth';
import type { AppLookId, AppearanceMode } from '../models/preferences';
import type { UserProfile } from '../models/userProfile';
import { loadAppLookIdForUser } from './appLookPreferenceStorage';
import { loadStoredAuthSessionUser } from './authStorage';
import { loadAppearanceModeForUser } from './themePreferenceStorage';
import { loadStoredUserProfile } from './userProfileStorage';

export type AppBootstrapSnapshot = {
  appLookId: AppLookId;
  appearanceMode: AppearanceMode;
  authSession: AuthSession;
  lastSelectedProfileId: DietProfileId;
};

let bootstrapSnapshot: AppBootstrapSnapshot | null = null;
let bootstrapSnapshotPromise: Promise<AppBootstrapSnapshot> | null = null;

function resolveLastSelectedProfileId(profile: UserProfile | null) {
  const householdProfiles = Array.isArray(profile?.householdProfiles)
    ? profile.householdProfiles
    : [];
  const activeHouseholdProfile = householdProfiles.find(
    (item) => item.id === profile?.activeHouseholdProfileId
  );

  if (
    activeHouseholdProfile &&
    typeof activeHouseholdProfile.dietProfileId === 'string' &&
    isDietProfileId(activeHouseholdProfile.dietProfileId)
  ) {
    return activeHouseholdProfile.dietProfileId;
  }

  return typeof profile?.dietProfileId === 'string' && isDietProfileId(profile.dietProfileId)
    ? profile.dietProfileId
    : DEFAULT_DIET_PROFILE_ID;
}

export function getCachedAppBootstrapSnapshot() {
  return bootstrapSnapshot;
}

export function resetAppBootstrapSnapshot() {
  bootstrapSnapshot = null;
  bootstrapSnapshotPromise = null;
}

export async function loadAppBootstrapSnapshot() {
  if (bootstrapSnapshot) {
    return bootstrapSnapshot;
  }

  if (bootstrapSnapshotPromise) {
    return bootstrapSnapshotPromise;
  }

  bootstrapSnapshotPromise = (async () => {
    const storedUser = await loadStoredAuthSessionUser();
    const [appearanceMode, appLookId, storedProfile] = await Promise.all([
      loadAppearanceModeForUser(storedUser?.id ?? null),
      loadAppLookIdForUser(storedUser?.id ?? null),
      storedUser ? loadStoredUserProfile(storedUser.id) : Promise.resolve(null),
    ]);

    const resolvedSnapshot: AppBootstrapSnapshot = {
      appLookId,
      appearanceMode,
      authSession: storedUser
        ? {
            status: 'authenticated',
            user: storedUser,
          }
        : {
            status: 'guest',
            user: null,
          },
      lastSelectedProfileId: resolveLastSelectedProfileId(storedProfile),
    };

    bootstrapSnapshot = resolvedSnapshot;
    bootstrapSnapshotPromise = null;
    return resolvedSnapshot;
  })();

  return bootstrapSnapshotPromise;
}
