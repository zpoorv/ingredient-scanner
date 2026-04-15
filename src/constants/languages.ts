export type AppLanguageCode =
  | 'ar'
  | 'de'
  | 'en'
  | 'es'
  | 'fr'
  | 'hi'
  | 'id'
  | 'ja'
  | 'ko'
  | 'pt'
  | 'ru'
  | 'zh-CN';

export type AppLanguageDefinition = {
  code: AppLanguageCode;
  englishLabel: string;
  nativeLabel: string;
};

export const DEFAULT_APP_LANGUAGE_CODE: AppLanguageCode = 'en';

export const APP_LANGUAGE_DEFINITIONS: AppLanguageDefinition[] = [
  { code: 'en', englishLabel: 'English', nativeLabel: 'English' },
  { code: 'es', englishLabel: 'Spanish', nativeLabel: 'Español' },
  { code: 'zh-CN', englishLabel: 'Chinese (Simplified)', nativeLabel: '简体中文' },
  { code: 'hi', englishLabel: 'Hindi', nativeLabel: 'हिन्दी' },
  { code: 'ar', englishLabel: 'Arabic', nativeLabel: 'العربية' },
  { code: 'pt', englishLabel: 'Portuguese', nativeLabel: 'Português' },
  { code: 'fr', englishLabel: 'French', nativeLabel: 'Français' },
  { code: 'ja', englishLabel: 'Japanese', nativeLabel: '日本語' },
  { code: 'de', englishLabel: 'German', nativeLabel: 'Deutsch' },
  { code: 'ko', englishLabel: 'Korean', nativeLabel: '한국어' },
  { code: 'id', englishLabel: 'Indonesian', nativeLabel: 'Bahasa Indonesia' },
  { code: 'ru', englishLabel: 'Russian', nativeLabel: 'Русский' },
];

export function isAppLanguageCode(
  value: string | null | undefined
): value is AppLanguageCode {
  return APP_LANGUAGE_DEFINITIONS.some((language) => language.code === value);
}

export function getAppLanguageDefinition(code: AppLanguageCode) {
  return (
    APP_LANGUAGE_DEFINITIONS.find((language) => language.code === code) ??
    APP_LANGUAGE_DEFINITIONS[0]
  );
}

export function isRightToLeftLanguage(code: AppLanguageCode) {
  return code === 'ar';
}
