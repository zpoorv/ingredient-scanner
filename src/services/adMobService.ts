import { Platform } from 'react-native';

import type {
  NativeAdRequestOptions,
  RequestOptions,
} from 'react-native-google-mobile-ads';

export type NativeAdSurface = 'history' | 'home' | 'search';

const DEFAULT_NATIVE_AD_UNIT_ID = 'ca-app-pub-3940256099942544/2247696110';
const DEFAULT_REWARDED_AD_UNIT_ID = 'ca-app-pub-3940256099942544/5224354917';

const NATIVE_AD_ENV_KEYS: Record<NativeAdSurface, string> = {
  history: 'EXPO_PUBLIC_ADMOB_NATIVE_HISTORY_UNIT_ID',
  home: 'EXPO_PUBLIC_ADMOB_NATIVE_HOME_UNIT_ID',
  search: 'EXPO_PUBLIC_ADMOB_NATIVE_SEARCH_UNIT_ID',
};

const AD_KEYWORDS: Record<NativeAdSurface | 'rewarded', string[]> = {
  history: ['food', 'grocery', 'shopping'],
  home: ['food', 'grocery', 'wellness'],
  rewarded: ['food', 'grocery', 'health'],
  search: ['food', 'grocery', 'brands'],
};

type AdConsentState = {
  canRequestAds: boolean;
  requestNonPersonalizedAdsOnly: boolean;
};

let consentStatePromise: Promise<AdConsentState> | null = null;
let mobileAdsInitializationPromise: Promise<void> | null = null;

function getErrorMessage(error: unknown) {
  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.trim();
  }

  return null;
}

export function describeAdMobError(error: unknown) {
  const message = getErrorMessage(error);

  if (!message) {
    return 'AdMob did not return a detailed reason.';
  }

  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes('not ready')) {
    return 'The Google Mobile Ads SDK is not ready yet.';
  }

  if (normalizedMessage.includes('no fill')) {
    return 'AdMob returned no fill for this request.';
  }

  if (
    normalizedMessage.includes('consent') ||
    normalizedMessage.includes('ump')
  ) {
    return 'Ads consent is blocking this request on the device.';
  }

  if (
    normalizedMessage.includes('test device') ||
    normalizedMessage.includes('test mode')
  ) {
    return 'The request needs a test-device or test-ad configuration.';
  }

  if (
    normalizedMessage.includes('network') ||
    normalizedMessage.includes('internet') ||
    normalizedMessage.includes('timeout')
  ) {
    return 'The device could not reach AdMob right now.';
  }

  return message;
}

export function isMobileAdsSupportedPlatform() {
  return Platform.OS === 'android' || Platform.OS === 'ios';
}

export function getRewardedAdUnitId() {
  return process.env.EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID || DEFAULT_REWARDED_AD_UNIT_ID;
}

export function getNativeAdUnitId(surface: NativeAdSurface) {
  return process.env[NATIVE_AD_ENV_KEYS[surface]] || DEFAULT_NATIVE_AD_UNIT_ID;
}

async function ensureAdsConsentState() {
  if (!isMobileAdsSupportedPlatform()) {
    return {
      canRequestAds: false,
      requestNonPersonalizedAdsOnly: true,
    };
  }

  if (consentStatePromise) {
    return consentStatePromise;
  }

  consentStatePromise = (async () => {
    try {
      const mobileAdsModule = await import('react-native-google-mobile-ads');
      const consentInfo = await mobileAdsModule.AdsConsent.gatherConsent({
        tagForUnderAgeOfConsent: false,
      });

      if (!consentInfo.canRequestAds) {
        return {
          canRequestAds: false,
          requestNonPersonalizedAdsOnly: true,
        };
      }

      if (consentInfo.status === mobileAdsModule.AdsConsentStatus.NOT_REQUIRED) {
        return {
          canRequestAds: true,
          requestNonPersonalizedAdsOnly: false,
        };
      }

      try {
        const userChoices = await mobileAdsModule.AdsConsent.getUserChoices();

        return {
          canRequestAds: true,
          requestNonPersonalizedAdsOnly: !userChoices.selectPersonalisedAds,
        };
      } catch {
        return {
          canRequestAds: true,
          requestNonPersonalizedAdsOnly: true,
        };
      }
    } catch {
      // Fall back to non-personalized requests if consent refresh cannot complete.
      return {
        canRequestAds: true,
        requestNonPersonalizedAdsOnly: true,
      };
    }
  })();

  return consentStatePromise;
}

async function ensureMobileAdsInitialized() {
  if (!isMobileAdsSupportedPlatform()) {
    return;
  }

  if (!mobileAdsInitializationPromise) {
    mobileAdsInitializationPromise = import('react-native-google-mobile-ads').then(
      (mobileAdsModule) => mobileAdsModule.default().initialize().then(() => undefined)
    );
  }

  return mobileAdsInitializationPromise;
}

async function buildSharedAdRequestOptions(
  keywords: string[]
): Promise<RequestOptions | null> {
  if (!isMobileAdsSupportedPlatform()) {
    return null;
  }

  const consentState = await ensureAdsConsentState();

  if (!consentState.canRequestAds) {
    return null;
  }

  await ensureMobileAdsInitialized();

  return {
    keywords,
    requestNonPersonalizedAdsOnly: consentState.requestNonPersonalizedAdsOnly,
  };
}

export async function buildRewardedAdRequestOptions() {
  return buildSharedAdRequestOptions(AD_KEYWORDS.rewarded);
}

export async function buildNativeAdRequestOptions(
  surface: NativeAdSurface
): Promise<NativeAdRequestOptions | null> {
  const sharedOptions = await buildSharedAdRequestOptions(AD_KEYWORDS[surface]);

  if (!sharedOptions) {
    return null;
  }

  const mobileAdsModule = await import('react-native-google-mobile-ads');

  return {
    ...sharedOptions,
    adChoicesPlacement: mobileAdsModule.NativeAdChoicesPlacement.TOP_RIGHT,
    aspectRatio: mobileAdsModule.NativeMediaAspectRatio.LANDSCAPE,
    startVideoMuted: true,
  };
}

export async function openMobileAdsInspector() {
  if (!isMobileAdsSupportedPlatform()) {
    return false;
  }

  try {
    await ensureMobileAdsInitialized();
    const mobileAdsModule = await import('react-native-google-mobile-ads');
    await mobileAdsModule.default().openAdInspector();
    return true;
  } catch (error) {
    throw new Error(describeAdMobError(error));
  }
}
