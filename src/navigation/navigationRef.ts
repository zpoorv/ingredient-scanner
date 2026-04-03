import { StackActions, createNavigationContainerRef } from '@react-navigation/native';

import { getAuthSession } from '../store';
import type { RootStackParamList } from './types';

export const rootNavigationRef = createNavigationContainerRef<RootStackParamList>();

export type MainNavigationRoute = 'History' | 'Home' | 'Search' | 'Settings';

let pendingHistoryNavigation = false;

export function queueHistoryNavigation() {
  pendingHistoryNavigation = true;
  flushPendingHistoryNavigation(getAuthSession().status === 'authenticated');
}

export function flushPendingHistoryNavigation(isAuthenticated: boolean) {
  if (!pendingHistoryNavigation || !isAuthenticated || !rootNavigationRef.isReady()) {
    return;
  }

  openMainRoute('History');

  pendingHistoryNavigation = false;
}

export function openMainRoute(route: MainNavigationRoute) {
  if (!rootNavigationRef.isReady()) {
    return;
  }

  if (rootNavigationRef.getCurrentRoute()?.name === route) {
    return;
  }

  const rootState = rootNavigationRef.getRootState();

  if (rootState.routes.some((entry) => entry.name === route)) {
    rootNavigationRef.dispatch(StackActions.popTo(route));
    return;
  }

  rootNavigationRef.navigate(route);
}
