import {
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  type ActionCodeSettings,
} from 'firebase/auth';

import { APP_ANDROID_PACKAGE } from '../constants/branding';
import { normalizeAuthEmail, validateEmailAddress } from '../utils/authValidation';
import {
  AuthServiceError,
  normalizeFirebaseFailure,
  storeAuthenticatedUser,
} from './authHelpers';
import {
  clearPendingEmailLinkAddress,
  loadPendingEmailLinkAddress,
  savePendingEmailLinkAddress,
} from './authStorage';
import { getFirebaseAuth } from './firebaseAuth';
import { getFirebaseAuthLinkUrl } from './firebaseApp';
import { syncCurrentUserProfileToFirestore } from './userProfileService';

export function getEmailLinkActionSettings(): ActionCodeSettings {
  return {
    android: {
      installApp: true,
      packageName: APP_ANDROID_PACKAGE,
    },
    handleCodeInApp: true,
    url: getFirebaseAuthLinkUrl(),
  };
}

export function canHandleEmailLink(url: string) {
  try {
    return isSignInWithEmailLink(getFirebaseAuth(), url);
  } catch {
    return false;
  }
}

export async function sendPasswordlessEmailLink(email: string) {
  const validationError = validateEmailAddress(email);

  if (validationError) {
    throw new AuthServiceError(validationError);
  }

  const normalizedEmail = normalizeAuthEmail(email);

  try {
    await sendSignInLinkToEmail(
      getFirebaseAuth(),
      normalizedEmail,
      getEmailLinkActionSettings()
    );
    await savePendingEmailLinkAddress(normalizedEmail);

    return `We sent a sign-in link to ${normalizedEmail}. Open it on this device to finish signing in.`;
  } catch (error) {
    normalizeFirebaseFailure(error);
  }
}

export async function completeEmailLinkSignIn(url: string) {
  const pendingEmail = await loadPendingEmailLinkAddress();

  if (!pendingEmail) {
    throw new AuthServiceError(
      'We could not match that sign-in link to an email on this device. Request a new sign-in link and open it here.'
    );
  }

  try {
    const credentials = await signInWithEmailLink(
      getFirebaseAuth(),
      pendingEmail,
      url
    );

    await clearPendingEmailLinkAddress();

    const authUser = await storeAuthenticatedUser(credentials.user);
    await syncCurrentUserProfileToFirestore();

    return authUser;
  } catch (error) {
    await clearPendingEmailLinkAddress();
    normalizeFirebaseFailure(error);
  }
}
