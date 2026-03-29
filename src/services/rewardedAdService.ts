import { Platform } from 'react-native';

let isInitialized = false;

const DEFAULT_REWARDED_AD_UNIT_ID = 'ca-app-pub-3940256099942544/5224354917';

type RewardedAdResult = 'dismissed' | 'rewarded' | 'unavailable';

function getRewardedAdUnitId() {
  return process.env.EXPO_PUBLIC_ADMOB_REWARDED_UNIT_ID || DEFAULT_REWARDED_AD_UNIT_ID;
}

async function ensureRewardedAdsInitialized() {
  if (isInitialized || (Platform.OS !== 'android' && Platform.OS !== 'ios')) {
    return;
  }

  const mobileAdsModule = await import('react-native-google-mobile-ads');
  await mobileAdsModule.default().initialize();
  isInitialized = true;
}

export async function showRewardedOcrUnlockAd(): Promise<RewardedAdResult> {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
    return 'unavailable';
  }

  try {
    await ensureRewardedAdsInitialized();

    const mobileAdsModule = await import('react-native-google-mobile-ads');
    const { AdEventType, RewardedAd, RewardedAdEventType } = mobileAdsModule;
    const rewardedAd = RewardedAd.createForAdRequest(getRewardedAdUnitId(), {
      keywords: ['food', 'grocery', 'health'],
      requestNonPersonalizedAdsOnly: true,
    });

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
      const unsubscribeError = rewardedAd.addAdEventListener(AdEventType.ERROR, () => {
        unsubscribeLoaded();
        unsubscribeReward();
        unsubscribeClosed();
        unsubscribeError();
        resolve('unavailable');
      });

      rewardedAd.load();
    });
  } catch {
    return 'unavailable';
  }
}
