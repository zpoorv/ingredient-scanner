export type AppearanceMode = 'dark' | 'light';

export type AppLookId =
  | 'classic'
  | 'ocean'
  | 'sunset'
  | 'forest'
  | 'berry'
  | 'midnight';

export function isAppearanceMode(value: string | null | undefined): value is AppearanceMode {
  return value === 'dark' || value === 'light';
}

export function isAppLookId(value: string | null | undefined): value is AppLookId {
  return (
    value === 'classic' ||
    value === 'ocean' ||
    value === 'sunset' ||
    value === 'forest' ||
    value === 'berry' ||
    value === 'midnight'
  );
}
