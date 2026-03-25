export type HealthScoreGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export type HealthScoreRuleGroup = {
  cap: number;
  id: string;
  keywords: string[];
  label: string;
  penalty: number;
  regexPatterns?: string[];
};

export type HealthScoreRecognizableRatioAdjustment = {
  maxRatio?: number;
  minRatio?: number;
  points: number;
  reason: string;
};

export const HEALTH_SCORE_BASE = 78;
export const HEALTH_SCORE_MISSING_INGREDIENTS_PENALTY = 22;
export const HEALTH_SCORE_EXPLANATION_REASON_COUNT = 3;

export const HEALTH_SCORE_GRADE_BANDS: {
  grade: HealthScoreGrade;
  minScore: number;
}[] = [
  { grade: 'A', minScore: 85 },
  { grade: 'B', minScore: 72 },
  { grade: 'C', minScore: 58 },
  { grade: 'D', minScore: 42 },
  { grade: 'F', minScore: 0 },
];

export const HEALTH_SCORE_SHORT_LIST_REWARDS = [
  { maxIngredients: 5, points: 12, reason: 'a short ingredient list' },
  { maxIngredients: 8, points: 8, reason: 'a fairly short ingredient list' },
  { maxIngredients: 12, points: 4, reason: 'a manageable ingredient list' },
];

export const HEALTH_SCORE_LONG_LIST_PENALTIES = [
  { minIngredients: 18, points: -8, reason: 'a long ingredient list' },
  { minIngredients: 26, points: -14, reason: 'a very long ingredient list' },
];

export const HEALTH_SCORE_RECOGNIZABLE_RATIO_ADJUSTMENTS: HealthScoreRecognizableRatioAdjustment[] = [
  {
    minRatio: 0.55,
    points: 5,
    reason: 'several recognizable ingredients',
  },
  {
    minRatio: 0.75,
    points: 10,
    reason: 'mostly simple recognizable ingredients',
  },
];

export const RECOGNIZABLE_INGREDIENT_KEYWORDS = [
  'water',
  'salt',
  'sea salt',
  'pepper',
  'black pepper',
  'white pepper',
  'tomato',
  'diced tomato',
  'crushed tomato',
  'onion',
  'garlic',
  'garlic paste',
  'olive oil',
  'extra virgin olive oil',
  'sunflower oil',
  'soybean oil',
  'milk',
  'cream',
  'butter',
  'egg',
  'eggs',
  'oats',
  'rice',
  'brown rice',
  'wheat flour',
  'whole wheat flour',
  'coconut',
  'coconut water',
  'cocoa',
  'banana',
  'apple',
  'lemon juice',
  'vinegar',
  'oregano',
  'basil',
  'turmeric',
  'cinnamon',
  'ginger',
  'honey',
  'beans',
  'chickpeas',
  'lentils',
  'yeast',
];

export const UNRECOGNIZABLE_INGREDIENT_MARKERS = [
  'syrup',
  'maltodextrin',
  'hydrogenated',
  'benzoate',
  'sorbate',
  'nitrite',
  'nitrate',
  'phosphate',
  'emulsifier',
  'stabilizer',
  'stabiliser',
  'regulator',
  'artificial',
  'flavour',
  'flavor',
  'isolat',
  'lecithin',
  'diglyceride',
  'monoglyceride',
  'preservative',
  'colour',
  'color',
  'sweetener',
  'modified',
  'gum',
  'e ',
];

export const HEALTH_SCORE_RULE_GROUPS: HealthScoreRuleGroup[] = [
  {
    id: 'added-sugar',
    label: 'added sugars',
    penalty: 8,
    cap: 18,
    keywords: [
      'sugar',
      'cane sugar',
      'brown sugar',
      'invert sugar',
      'glucose syrup',
      'fructose',
      'dextrose',
      'corn syrup',
      'corn syrup solids',
      'evaporated cane juice',
      'molasses',
      'maltose',
      'brown rice syrup',
    ],
  },
  {
    id: 'artificial-sweeteners',
    label: 'artificial sweeteners',
    penalty: 12,
    cap: 24,
    keywords: [
      'aspartame',
      'sucralose',
      'acesulfame potassium',
      'acesulfame k',
      'saccharin',
      'neotame',
      'advantame',
      'cyclamate',
    ],
  },
  {
    id: 'preservatives',
    label: 'preservatives',
    penalty: 8,
    cap: 20,
    keywords: [
      'sodium benzoate',
      'potassium sorbate',
      'calcium propionate',
      'sodium nitrite',
      'sodium nitrate',
      'bha',
      'bht',
      'potassium bromate',
      'sulfites',
      'preservative',
    ],
    regexPatterns: ['\\be ?211\\b', '\\be ?202\\b'],
  },
  {
    id: 'emulsifiers',
    label: 'emulsifiers',
    penalty: 6,
    cap: 14,
    keywords: [
      'soy lecithin',
      'lecithin',
      'mono and diglycerides',
      'mono- and diglycerides',
      'polysorbate',
      'carrageenan',
      'carboxymethyl cellulose',
      'cellulose gum',
      'xanthan gum',
      'guar gum',
      'emulsifier',
      'stabilizer',
      'stabiliser',
    ],
    regexPatterns: ['\\be ?4(07|15)\\b', '\\be ?1422\\b'],
  },
  {
    id: 'trans-fats',
    label: 'trans fats',
    penalty: 18,
    cap: 24,
    keywords: [
      'partially hydrogenated',
      'hydrogenated vegetable oil',
      'hydrogenated oil',
      'shortening',
    ],
  },
  {
    id: 'highly-processed-patterns',
    label: 'highly processed ingredients',
    penalty: 6,
    cap: 18,
    keywords: [
      'maltodextrin',
      'modified starch',
      'modified food starch',
      'protein isolate',
      'soy protein isolate',
      'whey protein isolate',
      'artificial flavor',
      'artificial flavour',
      'flavor enhancer',
      'acidity regulator',
      'anti-caking agent',
      'color added',
    ],
    regexPatterns: ['\\be ?\\d{3,4}[a-z]?\\b'],
  },
];
