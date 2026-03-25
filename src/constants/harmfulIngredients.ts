export type IngredientRiskLevel = 'safe' | 'caution' | 'high-risk';

export type HarmfulIngredientRule = {
  id: string;
  keywords: string[];
  label: string;
  penalty: number;
  risk: Exclude<IngredientRiskLevel, 'safe'>;
};

export const harmfulIngredientRules: HarmfulIngredientRule[] = [
  {
    id: 'high-fructose-corn-syrup',
    keywords: ['high fructose corn syrup', 'hfcs', 'fructose-glucose syrup'],
    label: 'High Fructose Corn Syrup',
    penalty: 18,
    risk: 'high-risk',
  },
  {
    id: 'artificial-flavors',
    keywords: [
      'artificial flavor',
      'artificial flavors',
      'artificial flavour',
      'artificial flavouring',
    ],
    label: 'Artificial Flavors',
    penalty: 8,
    risk: 'caution',
  },
  {
    id: 'msg',
    keywords: ['monosodium glutamate', 'msg', 'flavor enhancer 621'],
    label: 'Monosodium Glutamate',
    penalty: 12,
    risk: 'caution',
  },
  {
    id: 'sodium-nitrite',
    keywords: ['sodium nitrite', 'nitrite'],
    label: 'Sodium Nitrite',
    penalty: 20,
    risk: 'high-risk',
  },
  {
    id: 'sodium-nitrate',
    keywords: ['sodium nitrate', 'nitrate'],
    label: 'Sodium Nitrate',
    penalty: 20,
    risk: 'high-risk',
  },
  {
    id: 'aspartame',
    keywords: ['aspartame', 'e951'],
    label: 'Aspartame',
    penalty: 18,
    risk: 'caution',
  },
  {
    id: 'sucralose',
    keywords: ['sucralose', 'splenda'],
    label: 'Sucralose',
    penalty: 14,
    risk: 'caution',
  },
  {
    id: 'trans-fat',
    keywords: [
      'partially hydrogenated',
      'hydrogenated vegetable oil',
      'hydrogenated oil',
      'partially hydrogenated oil',
    ],
    label: 'Hydrogenated Oils',
    penalty: 22,
    risk: 'high-risk',
  },
  {
    id: 'preservatives',
    keywords: ['bha', 'bht', 'potassium bromate', 'butylated hydroxyanisole'],
    label: 'Synthetic Preservatives',
    penalty: 16,
    risk: 'high-risk',
  },
  {
    id: 'artificial-colors',
    keywords: [
      'red 40',
      'yellow 5',
      'yellow 6',
      'blue 1',
      'blue 2',
      'red no 40',
      'yellow no 5',
      'yellow no 6',
      'blue no 1',
      'blue no 2',
      'artificial color',
      'artificial colors',
      'artificial colour',
      'artificial color added',
    ],
    label: 'Artificial Colors',
    penalty: 14,
    risk: 'caution',
  },
];
