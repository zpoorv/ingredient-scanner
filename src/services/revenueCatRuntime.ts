import { subscribeAuthSession } from '../store';
import { refreshCurrentPremiumEntitlement } from './premiumEntitlementService';
import {
  initializeRevenueCatForCurrentUser,
  subscribeToRevenueCatCustomerInfoUpdates,
} from './revenueCatService';

export function startRevenueCatRuntime() {
  let unsubscribeCustomerInfo: () => void = () => {};
  let isDisposed = false;
  let hasAttachedCustomerListener = false;

  const ensureRuntime = async () => {
    const isReady = await initializeRevenueCatForCurrentUser().catch(() => false);

    if (isDisposed || !isReady) {
      return;
    }

    if (!hasAttachedCustomerListener) {
      unsubscribeCustomerInfo = await subscribeToRevenueCatCustomerInfoUpdates(() => {
        void refreshCurrentPremiumEntitlement();
      });
      hasAttachedCustomerListener = true;
    }

    await refreshCurrentPremiumEntitlement();
  };

  void ensureRuntime();

  const unsubscribeAuth = subscribeAuthSession(() => {
    void ensureRuntime();
  });

  return () => {
    isDisposed = true;
    unsubscribeAuth();
    unsubscribeCustomerInfo();
  };
}
