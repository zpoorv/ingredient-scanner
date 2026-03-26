import {
  GoogleSignin,
  statusCodes,
  type SignInResponse,
} from '@react-native-google-signin/google-signin';

import { getGoogleClientConfig, getGoogleConfigurationError } from './firebaseApp';

let isConfigured = false;

function configureGoogleSignin() {
  if (isConfigured) {
    return;
  }

  const configurationError = getGoogleConfigurationError();

  if (configurationError) {
    throw new Error(configurationError);
  }

  const { iosClientId, webClientId } = getGoogleClientConfig();

  GoogleSignin.configure({
    iosClientId: iosClientId || undefined,
    webClientId,
  });

  isConfigured = true;
}

export function getGoogleSignInSetupError() {
  return getGoogleConfigurationError();
}

export async function signInWithNativeGoogle() {
  configureGoogleSignin();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  const response: SignInResponse = await GoogleSignin.signIn();

  if (response.type === 'cancelled') {
    return {
      cancelled: true as const,
      idToken: null,
    };
  }

  const idToken = response.data.idToken;

  if (!idToken) {
    const tokens = await GoogleSignin.getTokens();

    return {
      cancelled: false as const,
      idToken: tokens.idToken,
    };
  }

  return {
    cancelled: false as const,
    idToken,
  };
}

export async function signOutNativeGoogle() {
  if (!isConfigured) {
    return;
  }

  try {
    await GoogleSignin.signOut();
  } catch {
    // Firebase logout should still succeed even if Google session cleanup fails.
  }
}

export function mapGoogleSignInError(error: unknown) {
  if (!(error instanceof Error)) {
    return 'Google sign in could not be opened right now.';
  }

  const code = 'code' in error && typeof error.code === 'string' ? error.code : '';

  if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
    return 'Google Play Services is unavailable on this device.';
  }

  if (code === statusCodes.IN_PROGRESS) {
    return 'Google sign in is already in progress.';
  }

  if (code === statusCodes.SIGN_IN_CANCELLED) {
    return 'Google sign in was cancelled.';
  }

  return error.message || 'Google sign in could not be opened right now.';
}
