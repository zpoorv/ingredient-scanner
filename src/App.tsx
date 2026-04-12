import { useEffect, useState } from 'react';
import * as NavigationBar from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import { AppState, InteractionManager, LogBox, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AppThemeProvider, { useAppTheme } from './components/AppThemeProvider';
import { queueHistoryNavigation } from './navigation/navigationRef';
import RootNavigator from './navigation/RootNavigator';
import { loadAppBootstrapSnapshot } from './services/appBootstrapSnapshotService';
import { startHistoryNotificationRuntime } from './services/historyNotificationRuntime';
import { markPerformanceTrace } from './services/performanceTrace';
import { startRevenueCatRuntime } from './services/revenueCatRuntime';
import { getAuthSession, subscribeAuthSession } from './store';

LogBox.ignoreLogs([
  'Could not reach Cloud Firestore backend',
  'Fetching auth token failed: Firebase: Error (auth/network-request-failed)',
  '[RevenueCat] 😿‼️ Error fetching offerings',
  '[RevenueCat] 😿‼️ PurchasesError(code=NetworkError',
]);
markPerformanceTrace('app-start');
void loadAppBootstrapSnapshot().catch(() => null);

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppThemeProvider>
          <AppShell />
        </AppThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppShell() {
  const { appearanceMode } = useAppTheme();
  const [authSession, setAuthSession] = useState(getAuthSession());
  const [hasCompletedFirstPaint, setHasCompletedFirstPaint] = useState(false);

  useEffect(() => {
    const applySystemChrome = async () => {
      if (Platform.OS !== 'android') {
        return;
      }

      try {
        await NavigationBar.setVisibilityAsync('hidden');
      } catch {
        // Ignore device-specific navigation bar limitations.
      }
    };

    void applySystemChrome();

    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void applySystemChrome();
      }
    });
    const navigationBarSubscription =
      Platform.OS === 'android'
        ? NavigationBar.addVisibilityListener(() => {
            void applySystemChrome();
          })
        : null;

    return () => {
      appStateSubscription.remove();
      navigationBarSubscription?.remove();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeAuthSession(setAuthSession);
    return unsubscribe;
  }, []);

  useEffect(() => {
    const frameHandle = requestAnimationFrame(() => {
      setHasCompletedFirstPaint(true);
    });

    return () => {
      cancelAnimationFrame(frameHandle);
    };
  }, []);

  useEffect(() => {
    if (authSession.status !== 'authenticated' || !hasCompletedFirstPaint) {
      return;
    }

    let historyCleanup: (() => void) | null = null;
    let revenueCatCleanup: (() => void) | null = null;
    const interactionHandle = InteractionManager.runAfterInteractions(() => {
      historyCleanup = startHistoryNotificationRuntime({
        onOpenHistory: queueHistoryNavigation,
      });
      revenueCatCleanup = startRevenueCatRuntime();
    });

    return () => {
      interactionHandle.cancel();
      historyCleanup?.();
      revenueCatCleanup?.();
    };
  }, [authSession.status, authSession.user?.id, hasCompletedFirstPaint]);

  useEffect(() => {
    if (authSession.status !== 'authenticated') {
      return;
    }

    markPerformanceTrace('app-authenticated-shell');
  }, [authSession.status]);

  return (
    <>
      <StatusBar hidden style={appearanceMode === 'dark' ? 'light' : 'dark'} />
      <RootNavigator />
    </>
  );
}
