import type { ShareCardStyleId } from '../models/shareCardStyle';

export type ShareCardStyleDefinition = {
  description: string;
  id: ShareCardStyleId;
  isPremiumOnly: boolean;
  label: string;
};

export const SHARE_CARD_STYLE_DEFINITIONS: ShareCardStyleDefinition[] = [
  {
    description: 'The original balanced share card with a bold score orb.',
    id: 'classic',
    isPremiumOnly: false,
    label: 'Classic',
  },
  {
    description: 'A hero-first layout built for strong score and verdict contrast.',
    id: 'spotlight',
    isPremiumOnly: true,
    label: 'Spotlight',
  },
  {
    description: 'Glassmorphism-inspired panels for a more premium social post.',
    id: 'glass',
    isPremiumOnly: true,
    label: 'Glass',
  },
  {
    description: 'A poster-style card with stacked score and strong section bands.',
    id: 'poster',
    isPremiumOnly: true,
    label: 'Poster',
  },
  {
    description: 'A receipt-inspired summary focused on clean, quick detail reading.',
    id: 'receipt',
    isPremiumOnly: true,
    label: 'Receipt',
  },
  {
    description: 'A diagnostic-style card with sharper metric framing and contrast.',
    id: 'radar',
    isPremiumOnly: true,
    label: 'Radar',
  },
];

export function getShareCardStyleDefinition(shareCardStyleId: ShareCardStyleId) {
  return (
    SHARE_CARD_STYLE_DEFINITIONS.find(
      (definition) => definition.id === shareCardStyleId
    ) ?? SHARE_CARD_STYLE_DEFINITIONS[0]
  );
}
