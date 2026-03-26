import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';

import type {
  EmailPasswordLoginInput,
  EmailPasswordSignUpInput,
} from '../models/auth';
import {
  normalizeAuthEmail,
  validateEmailAddress,
  validateLoginInput,
  validateSignUpInput,
} from '../utils/authValidation';
import {
  AuthServiceError,
  clearAuthenticatedSession,
  normalizeFirebaseFailure,
  storeAuthenticatedUser,
} from './authHelpers';
import { getEmailLinkActionSettings } from './emailLinkAuthService';
import { getFirebaseAuth } from './firebaseAuth';
import { signOutNativeGoogle } from './googleSignInService';

export async function hydrateAuthSession() {
  const auth = getFirebaseAuth();
  const firebaseUser = await new Promise<ReturnType<typeof getFirebaseAuth>['currentUser']>(
    (resolve, reject) => {
      const unsubscribe = onAuthStateChanged(
        auth,
        (user) => {
          unsubscribe();
          resolve(user);
        },
        reject
      );
    }
  );

  if (!firebaseUser) {
    await clearAuthenticatedSession();
    return null;
  }

  try {
    await reload(firebaseUser);
  } catch {
    // If reload fails due to connectivity, keep the last Firebase-authenticated user.
  }

  return storeAuthenticatedUser(firebaseUser);
}

export async function signUpWithEmail(input: EmailPasswordSignUpInput) {
  const validationError = validateSignUpInput(input);

  if (validationError) {
    throw new AuthServiceError(validationError);
  }

  try {
    const auth = getFirebaseAuth();
    const credentials = await createUserWithEmailAndPassword(
      auth,
      normalizeAuthEmail(input.email),
      input.password
    );

    await sendEmailVerification(
      credentials.user,
      getEmailLinkActionSettings()
    );
    await signOut(auth);
    await clearAuthenticatedSession();

    return `We created your account and sent a verification email to ${normalizeAuthEmail(input.email)}. Open that email before logging in.`;
  } catch (error) {
    normalizeFirebaseFailure(error);
  }
}

export async function loginWithEmail(input: EmailPasswordLoginInput) {
  const validationError = validateLoginInput(input);

  if (validationError) {
    throw new AuthServiceError(validationError);
  }

  try {
    const auth = getFirebaseAuth();
    const credentials = await signInWithEmailAndPassword(
      auth,
      normalizeAuthEmail(input.email),
      input.password
    );

    await reload(credentials.user);

    if (!credentials.user.emailVerified) {
      await sendEmailVerification(
        credentials.user,
        getEmailLinkActionSettings()
      );
      await signOut(auth);
      await clearAuthenticatedSession();
      throw new AuthServiceError(
        'Verify your email before logging in. We sent a fresh verification link to your inbox.'
      );
    }

    return await storeAuthenticatedUser(credentials.user);
  } catch (error) {
    normalizeFirebaseFailure(error);
  }
}

export async function signInWithGoogleIdToken(idToken: string) {
  if (!idToken) {
    throw new AuthServiceError('Google sign in did not return a valid ID token.');
  }

  try {
    const auth = getFirebaseAuth();
    const credential = GoogleAuthProvider.credential(idToken);
    const credentials = await signInWithCredential(auth, credential);

    return await storeAuthenticatedUser(credentials.user);
  } catch (error) {
    normalizeFirebaseFailure(error);
  }
}

export async function logoutAuth() {
  await signOutNativeGoogle();

  try {
    const auth = getFirebaseAuth();
    await signOut(auth);
  } catch {
    // Local session cleanup should still happen even if Firebase sign out cannot run.
  }

  await clearAuthenticatedSession();
}

export async function requestPasswordReset(email: string) {
  const validationError = validateEmailAddress(email);

  if (validationError) {
    throw new AuthServiceError(validationError);
  }

  try {
    const normalizedEmail = normalizeAuthEmail(email);
    await sendPasswordResetEmail(getFirebaseAuth(), normalizedEmail);

    return `If ${normalizedEmail} belongs to an account, Firebase will send a password reset email shortly.`;
  } catch (error) {
    normalizeFirebaseFailure(error);
  }
}
