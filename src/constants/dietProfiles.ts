export type DietProfileId =
  | 'general'
  | 'weight-loss'
  | 'diabetes-aware'
  | 'vegan'
  | 'gym-muscle-gain';

export type DietProfileDefinition = {
  description: string;
  id: DietProfileId;
  label: string;
  shortLabel: string;
};

export const DEFAULT_DIET_PROFILE_ID: DietProfileId = 'general';

export const DIET_PROFILE_DEFINITIONS: DietProfileDefinition[] = [
  {
    id: 'general',
    label: 'General',
    shortLabel: 'General',
    description: 'Balanced scoring for everyday packaged-food decisions.',
  },
  {
    id: 'weight-loss',
    label: 'Weight Loss',
    shortLabel: 'Weight Loss',
    description: 'Prioritizes lower sugar, calorie density, and fuller-feeling choices.',
  },
  {
    id: 'diabetes-aware',
    label: 'Diabetes-Aware',
    shortLabel: 'Diabetes',
    description: 'Puts extra focus on sugar load, carbs, fiber, and sweeteners.',
  },
  {
    id: 'vegan',
    label: 'Vegan',
    shortLabel: 'Vegan',
    description: 'Flags likely animal-derived ingredients and rewards plant-based signals.',
  },
  {
    id: 'gym-muscle-gain',
    label: 'Gym / Muscle Gain',
    shortLabel: 'Muscle Gain',
    description: 'Rewards stronger protein density and enough energy to support training.',
  },
];

export const DIET_PROFILE_KEYWORDS = {
  animalDerived: [
    'milk',
    'whey',
    'casein',
    'cheese',
    'butter',
    'cream',
    'egg',
    'eggs',
    'gelatin',
    'gelatine',
    'honey',
    'yogurt',
    'curd',
    'fish sauce',
    'anchovy',
    'chicken',
    'beef',
    'pork',
    'lard',
  ],
  artificialSweeteners: [
    'aspartame',
    'sucralose',
    'acesulfame potassium',
    'acesulfame k',
    'saccharin',
    'neotame',
    'advantame',
    'cyclamate',
    'sugar substitute',
  ],
  proteinBoosters: [
    'protein isolate',
    'whey protein',
    'soy protein',
    'pea protein',
    'milk protein',
    'casein',
  ],
  veganSignals: ['vegan', 'plant based', 'plant-based', '100% plant'],
};

export const DIET_PROFILE_SCORE_TUNING = {
  diabetesAware: {
    highCarbsPenalty: -8,
    highSugarPenalty: -12,
    lowSugarReward: 4,
    mediumSugarPenalty: -6,
    sweetenerPenalty: -4,
    fiberReward: 5,
    proteinReward: 3,
  },
  gymMuscleGain: {
    highProteinReward: 12,
    lowCaloriesPenalty: -4,
    lowProteinPenalty: -8,
    moderateCaloriesReward: 4,
    proteinBoosterReward: 4,
    solidProteinReward: 7,
    sugarPenalty: -6,
  },
  vegan: {
    animalIngredientPenalty: -35,
    likelyVeganReward: 4,
    veganSignalReward: 10,
  },
  weightLoss: {
    fiberReward: 5,
    highCaloriesPenalty: -12,
    highSugarPenalty: -8,
    lightCaloriesReward: 4,
    moderateCaloriesPenalty: -6,
    proteinReward: 4,
  },
};

export function isDietProfileId(value: string): value is DietProfileId {
  return DIET_PROFILE_DEFINITIONS.some((profile) => profile.id === value);
}
