import { createNavigationContainerRef } from '@react-navigation/native';

import { getAuthSession } from '../store';
import type { RootStackParamList } from './types';

export const rootNavigationRef = createNavigationContainerRef<RootStackParamList>();

let pendingHistoryNavigation = false;

export function queueHistoryNavigation() {
  pendingHistoryNavigation = true;
  flushPendingHistoryNavigation(getAuthSession().status === 'authenticated');
}

export function flushPendingHistoryNavigation(isAuthenticated: boolean) {
  if (!pendingHistoryNavigation || !isAuthenticated || !rootNavigationRef.isReady()) {
    return;
  }

  if (rootNavigationRef.getCurrentRoute()?.name !== 'History') {
    rootNavigationRef.navigate('History');
  }

  pendingHistoryNavigation = false;
}
