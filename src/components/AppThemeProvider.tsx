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
import {
  getCachedAppBootstrapSnapshot,
  loadAppBootstrapSnapshot,
} from '../services/appBootstrapSnapshotService';
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
  const bootstrapSnapshot = getCachedAppBootstrapSnapshot();
  const [appearanceMode, setAppearanceModeState] = useState<AppearanceMode>(
    bootstrapSnapshot?.appearanceMode ?? 'light'
  );
  const [appLookId, setAppLookIdState] = useState<AppLookId>(
    bootstrapSnapshot?.appLookId ?? 'classic'
  );

  useEffect(() => {
    let isMounted = true;
    let requestId = 0;

    const restoreAppearanceMode = async ({
      shouldSyncRemote,
      userId,
    }: {
      shouldSyncRemote: boolean;
      userId?: string | null;
    }) => {
      requestId += 1;
      const currentRequestId = requestId;
      const resolvedUserId = userId ?? null;
      const [localMode, localAppLookId] = await Promise.all([
        loadAppearanceModeForUser(resolvedUserId),
        loadAppLookIdForUser(resolvedUserId),
      ]);

      if (isMounted && currentRequestId === requestId) {
        setAppearanceModeState(localMode);
        setAppLookIdState(localAppLookId);
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

    void loadAppBootstrapSnapshot()
      .then((snapshot) => {
        if (!isMounted) {
          return;
        }

        setAppearanceModeState(snapshot.appearanceMode);
        setAppLookIdState(snapshot.appLookId);

        return restoreAppearanceMode({
          shouldSyncRemote: false,
          userId: snapshot.authSession.user?.id ?? null,
        });
      })
      .catch(() => {
        void restoreAppearanceMode({
          shouldSyncRemote: false,
          userId: null,
        });
      });
    const unsubscribe = subscribeAuthSession((session) => {
      void restoreAppearanceMode({
        shouldSyncRemote: session.status === 'authenticated',
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
