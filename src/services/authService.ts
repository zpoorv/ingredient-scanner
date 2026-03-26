import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';

import type {
  AuthSession,
  AuthUser,
  EmailPasswordLoginInput,
  EmailPasswordSignUpInput,
} from '../models/auth';
import { setAuthSession } from '../store/authSessionStore';
import {
  normalizeAuthEmail,
  validateEmailAddress,
  validateLoginInput,
  validateSignUpInput,
} from '../utils/authValidation';
import {
  clearStoredAuthSessionUser,
  loadStoredAuthSessionUser,
  saveStoredAuthSessionUser,
} from './authStorage';
import { getFirebaseAppInstance } from './firebaseApp';
import { signOutNativeGoogle } from './googleSignInService';

export class AuthServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthServiceError';
  }
}

function getFirebaseAuth() {
  return getAuth(getFirebaseAppInstance());
}

function toIsoDate(value: string | null | undefined) {
  return value ? new Date(value).toISOString() : new Date().toISOString();
}

function inferAuthProvider(user: User): AuthUser['provider'] {
  const providerIds = user.providerData.map((provider) => provider?.providerId);

  if (providerIds.includes('google.com')) {
    return 'google';
  }

  return 'email';
}

function toAuthUser(user: User): AuthUser {
  return {
    createdAt: toIsoDate(user.metadata.creationTime),
    displayName: user.displayName,
    email: user.email ?? '',
    id: user.uid,
    photoUrl: user.photoURL,
    provider: inferAuthProvider(user),
    updatedAt: toIsoDate(user.metadata.lastSignInTime),
  };
}

async function storeAuthenticatedUser(user: User) {
  const authUser = toAuthUser(user);
  const authSession: AuthSession = {
    status: 'authenticated',
    user: authUser,
  };

  await saveStoredAuthSessionUser(authUser);
  setAuthSession(authSession);

  return authUser;
}

function mapAuthError(error: unknown) {
  if (!(error instanceof Error)) {
    return 'We could not complete authentication right now.';
  }

  const messageByCode: Record<string, string> = {
    'auth/account-exists-with-different-credential':
      'This email is already linked to a different sign-in method.',
    'auth/email-already-in-use':
      'An account with this email already exists.',
    'auth/invalid-credential':
      'Email, password, or Google sign in could not be verified.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/network-request-failed':
      'Network connection failed. Check your internet and try again.',
    'auth/operation-not-allowed':
      'This sign-in method is not enabled in Firebase yet.',
    'auth/popup-closed-by-user': 'Google sign in was closed before it finished.',
    'auth/too-many-requests':
      'Too many attempts were made. Please wait and try again.',
    'auth/user-not-found': 'No account was found for this email.',
    'auth/weak-password': 'Use a stronger password with at least 6 characters.',
    'auth/wrong-password': 'Email or password is incorrect.',
  };

  const code =
    'code' in error && typeof error.code === 'string' ? error.code : '';

  return messageByCode[code] ?? error.message;
}

function normalizeFirebaseFailure(error: unknown): never {
  throw new AuthServiceError(mapAuthError(error));
}

export async function hydrateAuthSession() {
  const storedSessionUser = await loadStoredAuthSessionUser();

  if (!storedSessionUser) {
    setAuthSession({ status: 'guest', user: null });
    return null;
  }

  setAuthSession({
    status: 'authenticated',
    user: storedSessionUser,
  });

  return storedSessionUser;
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

    return await storeAuthenticatedUser(credentials.user);
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

  await clearStoredAuthSessionUser();
  setAuthSession({ status: 'guest', user: null });
}

export async function requestPasswordReset(email: string) {
  const validationError = validateEmailAddress(email);

  if (validationError) {
    throw new AuthServiceError(validationError);
  }

  try {
    await sendPasswordResetEmail(getFirebaseAuth(), normalizeAuthEmail(email));

    return 'If this email is registered, Firebase will send a reset link shortly.';
  } catch (error) {
    normalizeFirebaseFailure(error);
  }
}
