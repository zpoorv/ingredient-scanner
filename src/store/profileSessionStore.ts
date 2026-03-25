import {
  DEFAULT_DIET_PROFILE_ID,
  type DietProfileId,
} from '../constants/dietProfiles';

let currentProfileId: DietProfileId = DEFAULT_DIET_PROFILE_ID;

export function getSessionDietProfile() {
  return currentProfileId;
}

export function setSessionDietProfile(profileId: DietProfileId) {
  currentProfileId = profileId;
}
