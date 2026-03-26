import AsyncStorage from '@react-native-async-storage/async-storage/lib/commonjs/index';

import type { AuthUser } from '../models/auth';

const AUTH_SESSION_STORAGE_KEY = 'inqoura/auth-session/v1';

export async function loadStoredAuthSessionUser(): Promise<AuthUser | null> {
  const rawValue = await AsyncStorage.getItem(AUTH_SESSION_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as AuthUser;
  } catch {
    return null;
  }
}

// Keep only lightweight session metadata locally. Firebase remains the source of truth.
export async function saveStoredAuthSessionUser(user: AuthUser) {
  await AsyncStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(user));
}

export async function clearStoredAuthSessionUser() {
  await AsyncStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
}
