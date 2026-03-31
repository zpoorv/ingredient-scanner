import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AppThemeProvider, { useAppTheme } from './components/AppThemeProvider';
import { queueHistoryNavigation } from './navigation/navigationRef';
import RootNavigator from './navigation/RootNavigator';
import { startHistoryNotificationRuntime } from './services/historyNotificationRuntime';
import { startRevenueCatRuntime } from './services/revenueCatRuntime';

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
    return startHistoryNotificationRuntime({
      onOpenHistory: queueHistoryNavigation,
    });
  }, []);

  useEffect(() => {
    return startRevenueCatRuntime();
  }, []);

  return (
    <>
      <StatusBar style={appearanceMode === 'dark' ? 'light' : 'dark'} />
      <RootNavigator />
    </>
  );
}
