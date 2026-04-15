import AsyncStorage from '@react-native-async-storage/async-storage/lib/commonjs/index';

import {
  DEFAULT_APP_LANGUAGE_CODE,
  isAppLanguageCode,
  type AppLanguageCode,
} from '../constants/languages';

const LANGUAGE_STORAGE_KEY = 'inqoura/app-language/v1';

let cachedLanguageCode: AppLanguageCode | null = null;

function normalizeLocale(locale: string | null | undefined) {
  if (!locale) {
    return DEFAULT_APP_LANGUAGE_CODE;
  }

  const normalizedLocale = locale.replace('_', '-');
  const lowerCasedLocale = normalizedLocale.toLowerCase();

  if (lowerCasedLocale.startsWith('zh')) {
    return 'zh-CN';
  }

  if (lowerCasedLocale.startsWith('pt')) {
    return 'pt';
  }

  if (lowerCasedLocale.startsWith('es')) {
    return 'es';
  }

  if (lowerCasedLocale.startsWith('fr')) {
    return 'fr';
  }

  if (lowerCasedLocale.startsWith('de')) {
    return 'de';
  }

  if (lowerCasedLocale.startsWith('ja')) {
    return 'ja';
  }

  if (lowerCasedLocale.startsWith('ko')) {
    return 'ko';
  }

  if (lowerCasedLocale.startsWith('id')) {
    return 'id';
  }

  if (lowerCasedLocale.startsWith('ru')) {
    return 'ru';
  }

  if (lowerCasedLocale.startsWith('hi')) {
    return 'hi';
  }

  if (lowerCasedLocale.startsWith('ar')) {
    return 'ar';
  }

  return 'en';
}

export function getDeviceLanguageCode() {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    return normalizeLocale(locale);
  } catch {
    return DEFAULT_APP_LANGUAGE_CODE;
  }
}

export function getCachedLanguageCode() {
  return cachedLanguageCode ?? getDeviceLanguageCode();
}

export async function loadSavedLanguageCode() {
  const rawValue = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
  const resolvedLanguageCode = isAppLanguageCode(rawValue)
    ? rawValue
    : getDeviceLanguageCode();

  cachedLanguageCode = resolvedLanguageCode;
  return resolvedLanguageCode;
}

export async function saveSavedLanguageCode(languageCode: AppLanguageCode) {
  cachedLanguageCode = languageCode;
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, languageCode);
}
