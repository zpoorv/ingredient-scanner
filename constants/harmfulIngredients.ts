export type HarmfulIngredientRule = {
  id: string;
  keywords: string[];
  label: string;
  penalty: number;
};

export const harmfulIngredientRules: HarmfulIngredientRule[] = [
  {
    id: 'high-fructose-corn-syrup',
    keywords: ['high fructose corn syrup', 'hfcs'],
    label: 'High Fructose Corn Syrup',
    penalty: 18,
  },
  {
    id: 'artificial-flavors',
    keywords: ['artificial flavor', 'artificial flavors', 'artificial flavour'],
    label: 'Artificial Flavors',
    penalty: 8,
  },
  {
    id: 'msg',
    keywords: ['monosodium glutamate', 'msg'],
    label: 'Monosodium Glutamate',
    penalty: 12,
  },
  {
    id: 'sodium-nitrite',
    keywords: ['sodium nitrite'],
    label: 'Sodium Nitrite',
    penalty: 20,
  },
  {
    id: 'sodium-nitrate',
    keywords: ['sodium nitrate'],
    label: 'Sodium Nitrate',
    penalty: 20,
  },
  {
    id: 'aspartame',
    keywords: ['aspartame'],
    label: 'Aspartame',
    penalty: 18,
  },
  {
    id: 'sucralose',
    keywords: ['sucralose'],
    label: 'Sucralose',
    penalty: 14,
  },
  {
    id: 'trans-fat',
    keywords: [
      'partially hydrogenated',
      'hydrogenated vegetable oil',
      'hydrogenated oil',
    ],
    label: 'Hydrogenated Oils',
    penalty: 22,
  },
  {
    id: 'preservatives',
    keywords: ['bha', 'bht', 'potassium bromate'],
    label: 'Synthetic Preservatives',
    penalty: 16,
  },
  {
    id: 'artificial-colors',
    keywords: [
      'red 40',
      'yellow 5',
      'yellow 6',
      'blue 1',
      'blue 2',
      'artificial color',
      'artificial colors',
      'artificial colour',
      'artificial color added',
    ],
    label: 'Artificial Colors',
    penalty: 14,
  },
];
