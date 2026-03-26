import { getApp, getApps, initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
};

const googleClientConfig = {
  androidClientId: process.env.EXPO_PUBLIC_FIREBASE_ANDROID_CLIENT_ID ?? '',
  iosClientId: process.env.EXPO_PUBLIC_FIREBASE_IOS_CLIENT_ID ?? '',
  webClientId: process.env.EXPO_PUBLIC_FIREBASE_WEB_CLIENT_ID ?? '',
};

export function getFirebaseConfigurationError() {
  const missingKeys = Object.entries(firebaseConfig)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingKeys.length === 0) {
    return null;
  }

  return `Firebase is not configured yet. Add these Expo public env vars: ${missingKeys.join(', ')}.`;
}

export function getGoogleConfigurationError() {
  const missingKeys = Object.entries(googleClientConfig)
    .filter(([key, value]) => !value && key !== 'iosClientId')
    .map(([key]) => key);

  if (missingKeys.length === 0) {
    return null;
  }

  return `Google sign in is not configured yet. Add these Expo public env vars: ${missingKeys.join(', ')}.`;
}

export function getGoogleClientConfig() {
  return googleClientConfig;
}

export function getFirebaseAppInstance() {
  const configurationError = getFirebaseConfigurationError();

  if (configurationError) {
    throw new Error(configurationError);
  }

  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}
