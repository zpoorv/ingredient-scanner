import { useEffect } from 'react';
import * as NavigationBar from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import { AppState, LogBox, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AppThemeProvider, { useAppTheme } from './components/AppThemeProvider';
import { queueHistoryNavigation } from './navigation/navigationRef';
import RootNavigator from './navigation/RootNavigator';
import { startHistoryNotificationRuntime } from './services/historyNotificationRuntime';
import { startRevenueCatRuntime } from './services/revenueCatRuntime';

LogBox.ignoreLogs([
  '[RevenueCat] 😿‼️ Error fetching offerings',
  '[RevenueCat] 😿‼️ PurchasesError(code=NetworkError',
]);

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
    return startHistoryNotificationRuntime({
      onOpenHistory: queueHistoryNavigation,
    });
  }, []);

  useEffect(() => {
    return startRevenueCatRuntime();
  }, []);

  return (
    <>
      <StatusBar hidden style={appearanceMode === 'dark' ? 'light' : 'dark'} />
      <RootNavigator />
    </>
  );
}
