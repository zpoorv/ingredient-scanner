import { deleteUser } from 'firebase/auth';

import { getAuthSession } from '../store';
import { clearAppLookIdForUser } from './appLookPreferenceStorage';
import { clearAuthenticatedSession, AuthServiceError } from './authHelpers';
import { clearCommonProductsForUser } from './commonProductStorage';
import { deleteRemoteUserData } from './cloudUserDataService';
import {
  clearDietProfileForUser,
  clearDietProfileIntroSeen,
} from './dietProfileStorage';
import { clearFeatureUsageForUser } from './featureUsageStorage';
import { getFirebaseAuth } from './firebaseAuth';
import { clearGamificationForUser } from './gamificationService';
import { clearProductChangeAlertsForUser } from './productChangeAlertService';
import { clearScanHistoryForUser } from './scanHistoryStorage';
import { clearShareCardStyleForUser } from './shareCardPreferenceStorage';
import { clearAppearanceModeForUser } from './themePreferenceStorage';
import { clearUserProfile } from './userProfileService';

export async function deleteCurrentAccount() {
  const auth = getFirebaseAuth();
  const currentUser = auth.currentUser;
  const sessionUser = getAuthSession().user;

  if (!currentUser || !sessionUser) {
    throw new AuthServiceError('You need to be logged in before deleting the account.');
  }

  try {
    await deleteRemoteUserData(sessionUser.id);
    await deleteUser(currentUser);
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'auth/requires-recent-login'
    ) {
      throw new AuthServiceError(
        'For safety, sign in again before deleting your account.'
      );
    }

    if (error instanceof Error) {
      throw new AuthServiceError(
        'We could not fully remove your cloud data right now. Try again before deleting the account.'
      );
    }

    throw new AuthServiceError('We could not delete your account right now.');
  }

  await Promise.all([
    clearAppLookIdForUser(sessionUser.id),
    clearAppearanceModeForUser(sessionUser.id),
    clearAuthenticatedSession(),
    clearCommonProductsForUser(sessionUser.id),
    clearDietProfileForUser(sessionUser.id),
    clearDietProfileIntroSeen(),
    clearFeatureUsageForUser(sessionUser.id),
    clearGamificationForUser(sessionUser.id),
    clearProductChangeAlertsForUser(sessionUser.id),
    clearScanHistoryForUser(sessionUser.id),
    clearShareCardStyleForUser(sessionUser.id),
    clearUserProfile(sessionUser.id),
  ]);
}
