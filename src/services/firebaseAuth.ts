import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getAuth,
  getReactNativePersistence,
  initializeAuth,
  type Auth,
} from '@firebase/auth/dist/rn/index.js';

import { getFirebaseAppInstance } from './firebaseApp';

let authInstance: Auth | null = null;

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
