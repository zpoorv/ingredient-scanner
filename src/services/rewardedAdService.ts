import { Platform } from 'react-native';

import {
  buildRewardedAdRequestOptions,
  describeAdMobError,
  getRewardedAdUnitId,
} from './adMobService';

type RewardedAdResult = 'dismissed' | 'rewarded' | 'unavailable';

export async function showRewardedOcrUnlockAd(): Promise<RewardedAdResult> {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
    return 'unavailable';
  }

  try {
    const requestOptions = await buildRewardedAdRequestOptions();

    if (!requestOptions) {
      if (__DEV__) {
        console.warn('[AdMob] Rewarded OCR ad blocked before request creation.');
      }
      return 'unavailable';
    }

    const mobileAdsModule = await import('react-native-google-mobile-ads');
    const { AdEventType, RewardedAd, RewardedAdEventType } = mobileAdsModule;
    const rewardedAd = RewardedAd.createForAdRequest(
      getRewardedAdUnitId(),
      requestOptions
    );

    return await new Promise<RewardedAdResult>((resolve) => {
      let hasEarnedReward = false;

      const unsubscribeLoaded = rewardedAd.addAdEventListener(
        RewardedAdEventType.LOADED,
        () => {
          void rewardedAd.show();
        }
      );
      const unsubscribeReward = rewardedAd.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        () => {
          hasEarnedReward = true;
        }
      );
      const unsubscribeClosed = rewardedAd.addAdEventListener(AdEventType.CLOSED, () => {
        unsubscribeLoaded();
        unsubscribeReward();
        unsubscribeClosed();
        unsubscribeError();
        resolve(hasEarnedReward ? 'rewarded' : 'dismissed');
      });
      const unsubscribeError = rewardedAd.addAdEventListener(AdEventType.ERROR, (error) => {
        if (__DEV__) {
          console.warn(
            `[AdMob] Rewarded OCR ad failed: ${describeAdMobError(error)}`
          );
        }

        unsubscribeLoaded();
        unsubscribeReward();
        unsubscribeClosed();
        unsubscribeError();
        resolve('unavailable');
      });

      rewardedAd.load();
    });
  } catch (error) {
    if (__DEV__) {
      console.warn(`[AdMob] Rewarded OCR ad failed: ${describeAdMobError(error)}`);
    }

    return 'unavailable';
  }
}
