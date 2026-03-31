import { AppState } from 'react-native';

import { getAuthSession, subscribeAuthSession } from '../store';
import { subscribeScanHistoryChanges } from './scanHistoryStorage';
import {
  cancelHistoryNotificationsForUserScope,
  handleInitialHistoryNotificationResponse,
  initializeHistoryNotifications,
  subscribeToHistoryNotificationResponses,
  syncHistoryNotificationsForCurrentUser,
} from './historyNotificationService';

type StartHistoryNotificationRuntimeOptions = {
  onOpenHistory: () => void;
};

export function startHistoryNotificationRuntime({
  onOpenHistory,
}: StartHistoryNotificationRuntimeOptions) {
  let queuedSync: ReturnType<typeof setTimeout> | null = null;
  let previousUserId = getAuthSession().user?.id ?? null;

  const queueSync = () => {
    if (queuedSync) {
      clearTimeout(queuedSync);
    }

    queuedSync = setTimeout(() => {
      queuedSync = null;
      void syncHistoryNotificationsForCurrentUser().catch(() => {
        // Local notifications should never crash the app if scheduling fails.
      });
    }, 0);
  };

  void initializeHistoryNotifications().catch(() => {
    // Permission prompts happen later, so bootstrap failure should stay silent.
  });
  void handleInitialHistoryNotificationResponse(onOpenHistory);
  queueSync();

  const unsubscribeAuth = subscribeAuthSession((session) => {
    const nextUserId = session.user?.id ?? null;

    if (previousUserId && previousUserId !== nextUserId) {
      void cancelHistoryNotificationsForUserScope(previousUserId);
    }

    previousUserId = nextUserId;
    queueSync();
  });

  const unsubscribeHistory = subscribeScanHistoryChanges(() => {
    queueSync();
  });

  const responseCleanup = subscribeToHistoryNotificationResponses(onOpenHistory);
  const appStateSubscription = AppState.addEventListener('change', (nextState) => {
    if (nextState === 'active') {
      queueSync();
    }
  });

  return () => {
    if (queuedSync) {
      clearTimeout(queuedSync);
    }

    unsubscribeAuth();
    unsubscribeHistory();
    responseCleanup();
    appStateSubscription.remove();
  };
}
