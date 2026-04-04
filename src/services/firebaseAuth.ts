import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getAuth,
  getIdTokenResult,
  getReactNativePersistence,
  initializeAuth,
  type Auth,
} from '@firebase/auth/dist/rn/index.js';

import { getFirebaseAppInstance } from './firebaseApp';

let authInstance: Auth | null = null;

export type TrustedAuthClaims = {
  admin: boolean;
  premium: boolean;
};

export function getFirebaseAuth() {
  if (authInstance) {
    return authInstance;
  }

  const app = getFirebaseAppInstance();

  try {
    authInstance = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage) as any,
    });
  } catch {
    authInstance = getAuth(app);
  }

  return authInstance;
}

export async function loadCurrentUserTrustedClaims(forceRefresh = false) {
  const currentUser = getFirebaseAuth().currentUser;

  if (!currentUser) {
    return null;
  }

  try {
    const tokenResult = await getIdTokenResult(currentUser, forceRefresh);

    return {
      admin: tokenResult.claims.admin === true,
      premium: tokenResult.claims.premium === true,
    } satisfies TrustedAuthClaims;
  } catch {
    return null;
  }
}

export async function loadCurrentUserTokenIssuedAtMs(forceRefresh = false) {
  const currentUser = getFirebaseAuth().currentUser;

  if (!currentUser) {
    return null;
  }

  try {
    const tokenResult = await getIdTokenResult(currentUser, forceRefresh);
    const issuedAtMs = Date.parse(tokenResult.issuedAtTime);

    return Number.isFinite(issuedAtMs) ? issuedAtMs : null;
  } catch {
    return null;
  }
}
