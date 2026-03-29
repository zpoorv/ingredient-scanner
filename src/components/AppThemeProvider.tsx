import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import { getThemeColors, getThemeTypography, type AppTypography } from '../constants/theme';
import type { AppearanceMode, AppLookId } from '../models/preferences';
import { subscribeAuthSession } from '../store';
import { loadStoredAuthSessionUser } from '../services/authStorage';
import {
  loadAppLookIdForUser,
  saveAppLookId,
  syncAppLookForCurrentUser,
} from '../services/appLookPreferenceStorage';
import {
  loadAppearanceModeForUser,
  saveAppearanceMode,
  syncAppearanceModeForCurrentUser,
} from '../services/themePreferenceStorage';

type AppThemeContextValue = {
  appLookId: AppLookId;
  appearanceMode: AppearanceMode;
  colors: ReturnType<typeof getThemeColors>;
  typography: AppTypography;
  setAppLookId: (appLookId: AppLookId) => Promise<void>;
  setAppearanceMode: (mode: AppearanceMode) => Promise<void>;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

export default function AppThemeProvider({ children }: PropsWithChildren) {
  const [appearanceMode, setAppearanceModeState] = useState<AppearanceMode>('light');
  const [appLookId, setAppLookIdState] = useState<AppLookId>('classic');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let requestId = 0;

    const restoreAppearanceMode = async ({
      shouldSyncRemote,
      useStoredFallback,
      userId,
    }: {
      shouldSyncRemote: boolean;
      useStoredFallback: boolean;
      userId?: string | null;
    }) => {
      requestId += 1;
      const currentRequestId = requestId;
      const fallbackUserId = useStoredFallback
        ? (await loadStoredAuthSessionUser())?.id ?? null
        : null;
      const resolvedUserId = userId ?? fallbackUserId;
      const [localMode, localAppLookId] = await Promise.all([
        loadAppearanceModeForUser(resolvedUserId),
        loadAppLookIdForUser(resolvedUserId),
      ]);

      if (isMounted && currentRequestId === requestId) {
        setAppearanceModeState(localMode);
        setAppLookIdState(localAppLookId);
        setIsReady(true);
      }

      if (!shouldSyncRemote) {
        return;
      }

      const [syncedMode, syncedAppLookId] = await Promise.all([
        syncAppearanceModeForCurrentUser(),
        syncAppLookForCurrentUser(),
      ]);

      if (isMounted && currentRequestId === requestId) {
        setAppearanceModeState(syncedMode);
        setAppLookIdState(syncedAppLookId);
      }
    };

    void restoreAppearanceMode({
      shouldSyncRemote: false,
      useStoredFallback: true,
      userId: null,
    });
    const unsubscribe = subscribeAuthSession((session) => {
      void restoreAppearanceMode({
        shouldSyncRemote: session.status === 'authenticated',
        useStoredFallback: false,
        userId: session.user?.id ?? null,
      });
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo<AppThemeContextValue>(
    () => ({
      appLookId,
      appearanceMode,
      colors: getThemeColors(appearanceMode, appLookId),
      typography: getThemeTypography(appLookId),
      setAppLookId: async (nextAppLookId) => {
        setAppLookIdState(nextAppLookId);
        await saveAppLookId(nextAppLookId);
      },
      setAppearanceMode: async (mode) => {
        setAppearanceModeState(mode);
        await saveAppearanceMode(mode);
      },
    }),
    [appLookId, appearanceMode]
  );

  if (!isReady) {
    return null;
  }

  return (
    <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>
  );
}

export function useAppTheme() {
  const value = useContext(AppThemeContext);

  if (!value) {
    throw new Error('useAppTheme must be used inside AppThemeProvider.');
  }

  return value;
}
