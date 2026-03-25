import AsyncStorage from '@react-native-async-storage/async-storage/lib/commonjs/index';

import {
  DEFAULT_DIET_PROFILE_ID,
  isDietProfileId,
  type DietProfileId,
} from '../constants/dietProfiles';
import {
  getSessionDietProfile,
  setSessionDietProfile,
} from '../store/profileSessionStore';

const DIET_PROFILE_STORAGE_KEY = 'ingredient-scanner/diet-profile/v1';
const DIET_PROFILE_INTRO_SEEN_STORAGE_KEY =
  'ingredient-scanner/diet-profile-intro-seen/v1';

export async function loadDietProfile(): Promise<DietProfileId> {
  const rawValue = await AsyncStorage.getItem(DIET_PROFILE_STORAGE_KEY);

  if (!rawValue || !isDietProfileId(rawValue)) {
    setSessionDietProfile(DEFAULT_DIET_PROFILE_ID);
    return DEFAULT_DIET_PROFILE_ID;
  }

  setSessionDietProfile(rawValue);
  return rawValue;
}

export async function saveDietProfile(profileId: DietProfileId) {
  await AsyncStorage.setItem(DIET_PROFILE_STORAGE_KEY, profileId);
  setSessionDietProfile(profileId);

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
