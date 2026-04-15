import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import {
  APP_LANGUAGE_DEFINITIONS,
  getAppLanguageDefinition,
  isAppLanguageCode,
  isRightToLeftLanguage,
  type AppLanguageCode,
} from '../constants/languages';
import { translateAppText } from '../constants/translations';
import {
  getCachedAppBootstrapSnapshot,
  loadAppBootstrapSnapshot,
} from '../services/appBootstrapSnapshotService';
import {
  getCachedLanguageCode,
  loadSavedLanguageCode,
  saveSavedLanguageCode,
} from '../services/languagePreferenceStorage';
import { loadUserProfile, saveCurrentUserPreferences } from '../services/userProfileService';
import { subscribeAuthSession } from '../store';

type TranslateValues = Record<string, number | string | null | undefined>;

type AppLanguageContextValue = {
  isRTL: boolean;
  languageCode: AppLanguageCode;
  languageOptions: typeof APP_LANGUAGE_DEFINITIONS;
  setLanguageCode: (languageCode: AppLanguageCode) => Promise<void>;
  t: (source: string, values?: TranslateValues) => string;
};

const AppLanguageContext = createContext<AppLanguageContextValue | null>(null);

export default function AppLanguageProvider({ children }: PropsWithChildren) {
  const bootstrapSnapshot = getCachedAppBootstrapSnapshot();
  const [languageCode, setLanguageCodeState] = useState<AppLanguageCode>(
    bootstrapSnapshot?.languageCode ?? getCachedLanguageCode()
  );

  useEffect(() => {
    let isMounted = true;
    let requestId = 0;

    const restoreLanguage = async ({
      shouldSyncRemote,
      userId,
    }: {
      shouldSyncRemote: boolean;
      userId?: string | null;
    }) => {
      requestId += 1;
      const currentRequestId = requestId;
      const savedLanguageCode = await loadSavedLanguageCode();

      if (!isMounted || currentRequestId !== requestId) {
        return;
      }

      if (!shouldSyncRemote || !userId) {
        setLanguageCodeState(savedLanguageCode);
        return;
      }

      const profile = await loadUserProfile();

      if (!isMounted || currentRequestId !== requestId) {
        return;
      }

      const resolvedLanguageCode = isAppLanguageCode(profile?.languageCode)
        ? profile.languageCode
        : savedLanguageCode;

      setLanguageCodeState(resolvedLanguageCode);

      if (!isAppLanguageCode(profile?.languageCode)) {
        void saveCurrentUserPreferences({ languageCode: resolvedLanguageCode }).catch(() => null);
      }
    };

    void loadAppBootstrapSnapshot()
      .then((snapshot) => {
        if (!isMounted) {
          return;
        }

        setLanguageCodeState(snapshot.languageCode);
        return restoreLanguage({
          shouldSyncRemote: snapshot.authSession.status === 'authenticated',
          userId: snapshot.authSession.user?.id ?? null,
        });
      })
      .catch(() => {
        void restoreLanguage({
          shouldSyncRemote: false,
          userId: null,
        });
      });

    const unsubscribe = subscribeAuthSession((session) => {
      void restoreLanguage({
        shouldSyncRemote: session.status === 'authenticated',
        userId: session.user?.id ?? null,
      });
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo<AppLanguageContextValue>(
    () => ({
      isRTL: isRightToLeftLanguage(languageCode),
      languageCode,
      languageOptions: APP_LANGUAGE_DEFINITIONS,
      setLanguageCode: async (nextLanguageCode) => {
        setLanguageCodeState(nextLanguageCode);
        await saveSavedLanguageCode(nextLanguageCode);
        await saveCurrentUserPreferences({ languageCode: nextLanguageCode }).catch(() => null);
      },
      t: (source, values) => translateAppText(languageCode, source, values),
    }),
    [languageCode]
  );

  return (
    <AppLanguageContext.Provider value={value}>{children}</AppLanguageContext.Provider>
  );
}

export function useI18n() {
  const value = useContext(AppLanguageContext);

  if (!value) {
    throw new Error('useI18n must be used inside AppLanguageProvider.');
  }

  return value;
}

export function getLanguageDisplayLabel(languageCode: AppLanguageCode) {
  return getAppLanguageDefinition(languageCode).nativeLabel;
}
