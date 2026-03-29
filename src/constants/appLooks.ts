import type { AppLookId } from '../models/preferences';

export type AppLookDefinition = {
  description: string;
  id: AppLookId;
  isPremiumOnly: boolean;
  label: string;
  shortLabel: string;
};

export const APP_LOOK_DEFINITIONS: AppLookDefinition[] = [
  {
    description: 'The familiar Inqoura palette with calm green surfaces.',
    id: 'classic',
    isPremiumOnly: false,
    label: 'Classic Calm',
    shortLabel: 'Classic',
  },
  {
    description: 'Cool blue accents with a brighter wellness dashboard feel.',
    id: 'ocean',
    isPremiumOnly: true,
    label: 'Ocean Mint',
    shortLabel: 'Ocean',
  },
  {
    description: 'Warm citrus highlights for a brighter, energetic look.',
    id: 'sunset',
    isPremiumOnly: true,
    label: 'Sunset Citrus',
    shortLabel: 'Sunset',
  },
  {
    description: 'Deeper forest tones for a more grounded scan experience.',
    id: 'forest',
    isPremiumOnly: true,
    label: 'Forest Leaf',
    shortLabel: 'Forest',
  },
  {
    description: 'Berry accents that make cards and progress states pop more.',
    id: 'berry',
    isPremiumOnly: true,
    label: 'Berry Bloom',
    shortLabel: 'Berry',
  },
  {
    description: 'A moody premium look with sharper contrast and dark chrome.',
    id: 'midnight',
    isPremiumOnly: true,
    label: 'Midnight Ink',
    shortLabel: 'Midnight',
  },
];

export function getAppLookDefinition(appLookId: AppLookId) {
  return (
    APP_LOOK_DEFINITIONS.find((definition) => definition.id === appLookId) ??
    APP_LOOK_DEFINITIONS[0]
  );
}
