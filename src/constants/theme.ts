import type { AppearanceMode, AppLookId } from '../models/preferences';

export type AppColors = {
  background: string;
  border: string;
  danger: string;
  dangerMuted: string;
  primary: string;
  primaryMuted: string;
  scanOverlay: string;
  success: string;
  successMuted: string;
  surface: string;
  text: string;
  textMuted: string;
  warning: string;
  warningMuted: string;
};

type ThemeLooks = Record<AppLookId, { dark: AppColors; light: AppColors }>;

const THEME_LOOKS: ThemeLooks = {
  berry: {
    dark: {
      background: '#17131A',
      border: '#3D2C46',
      danger: '#FF8A7A',
      dangerMuted: '#4D2520',
      primary: '#D990FF',
      primaryMuted: '#382041',
      scanOverlay: 'rgba(10, 7, 12, 0.75)',
      success: '#89E0AF',
      successMuted: '#1B3327',
      surface: '#211A26',
      text: '#F8F2FB',
      textMuted: '#C8B7CE',
      warning: '#F6C36A',
      warningMuted: '#473614',
    },
    light: {
      background: '#FBF5FA',
      border: '#E8D9E8',
      danger: '#CC564B',
      dangerMuted: '#FBE5E1',
      primary: '#8A4FB7',
      primaryMuted: '#F2E5FA',
      scanOverlay: 'rgba(32, 24, 36, 0.58)',
      success: '#3B9D66',
      successMuted: '#E2F5E8',
      surface: '#FFFFFF',
      text: '#251A2D',
      textMuted: '#73647B',
      warning: '#C98A20',
      warningMuted: '#FAECCF',
    },
  },
  classic: {
    dark: {
      background: '#101715',
      border: '#2A3A35',
      danger: '#F47B71',
      dangerMuted: '#4A241E',
      primary: '#63C7A6',
      primaryMuted: '#183A32',
      scanOverlay: 'rgba(6, 10, 9, 0.74)',
      success: '#72D89A',
      successMuted: '#173224',
      surface: '#17211F',
      text: '#F3F7F5',
      textMuted: '#AAB9B3',
      warning: '#F0BC61',
      warningMuted: '#43320F',
    },
    light: {
      background: '#F4F7F3',
      border: '#D7E1DC',
      danger: '#C43D32',
      dangerMuted: '#F9E2DF',
      primary: '#1F6F5B',
      primaryMuted: '#D9EEE7',
      scanOverlay: 'rgba(23, 33, 31, 0.58)',
      success: '#2E8B57',
      successMuted: '#DFF1E6',
      surface: '#FFFFFF',
      text: '#17211F',
      textMuted: '#5F6F69',
      warning: '#C28518',
      warningMuted: '#F6E9C9',
    },
  },
  forest: {
    dark: {
      background: '#101710',
      border: '#2A3A28',
      danger: '#FF8B73',
      dangerMuted: '#49271E',
      primary: '#75D27D',
      primaryMuted: '#1A3720',
      scanOverlay: 'rgba(6, 11, 6, 0.74)',
      success: '#8EE39B',
      successMuted: '#16311A',
      surface: '#172017',
      text: '#F3F8F1',
      textMuted: '#A8B8A8',
      warning: '#EAC36D',
      warningMuted: '#423612',
    },
    light: {
      background: '#F2F7EF',
      border: '#D4E0CF',
      danger: '#C65B3E',
      dangerMuted: '#F9E7DE',
      primary: '#2C7A3F',
      primaryMuted: '#DFF2E3',
      scanOverlay: 'rgba(21, 31, 21, 0.58)',
      success: '#3E9954',
      successMuted: '#E0F4E5',
      surface: '#FFFFFF',
      text: '#182117',
      textMuted: '#63705F',
      warning: '#B98A1B',
      warningMuted: '#F5E8C8',
    },
  },
  midnight: {
    dark: {
      background: '#0C1220',
      border: '#22324B',
      danger: '#FF8F85',
      dangerMuted: '#432127',
      primary: '#7CB8FF',
      primaryMuted: '#18304E',
      scanOverlay: 'rgba(5, 8, 16, 0.78)',
      success: '#8BE1D0',
      successMuted: '#17312D',
      surface: '#131C2F',
      text: '#F4F7FC',
      textMuted: '#A7B5CC',
      warning: '#F4C86A',
      warningMuted: '#423516',
    },
    light: {
      background: '#F4F8FD',
      border: '#D7E2F0',
      danger: '#C9584D',
      dangerMuted: '#FAE3E0',
      primary: '#245C9A',
      primaryMuted: '#DDEAF9',
      scanOverlay: 'rgba(20, 28, 46, 0.58)',
      success: '#2E8E83',
      successMuted: '#DFF3F0',
      surface: '#FFFFFF',
      text: '#162136',
      textMuted: '#62728E',
      warning: '#BB8A1F',
      warningMuted: '#F7EACF',
    },
  },
  ocean: {
    dark: {
      background: '#0F161A',
      border: '#28404B',
      danger: '#FF8C79',
      dangerMuted: '#482720',
      primary: '#69C8D9',
      primaryMuted: '#193844',
      scanOverlay: 'rgba(5, 10, 13, 0.74)',
      success: '#85E2C6',
      successMuted: '#17342B',
      surface: '#162027',
      text: '#F3F8FA',
      textMuted: '#A9BBC1',
      warning: '#F4C468',
      warningMuted: '#473716',
    },
    light: {
      background: '#F1F8FA',
      border: '#D1E2E8',
      danger: '#CB5A47',
      dangerMuted: '#FBE6E1',
      primary: '#257C96',
      primaryMuted: '#D9EFF5',
      scanOverlay: 'rgba(17, 30, 35, 0.58)',
      success: '#2F9D86',
      successMuted: '#DFF4EE',
      surface: '#FFFFFF',
      text: '#17242B',
      textMuted: '#60747C',
      warning: '#C88E21',
      warningMuted: '#FAEDCF',
    },
  },
  sunset: {
    dark: {
      background: '#1A1410',
      border: '#473229',
      danger: '#FF9C7A',
      dangerMuted: '#522820',
      primary: '#FFB45B',
      primaryMuted: '#49331A',
      scanOverlay: 'rgba(12, 8, 5, 0.74)',
      success: '#9AE089',
      successMuted: '#23331B',
      surface: '#241B15',
      text: '#FBF6F0',
      textMuted: '#C7B5A8',
      warning: '#FFD36E',
      warningMuted: '#4A3815',
    },
    light: {
      background: '#FFF6EF',
      border: '#E9D8CA',
      danger: '#D86143',
      dangerMuted: '#FDE6DE',
      primary: '#D27A1E',
      primaryMuted: '#FBE9D5',
      scanOverlay: 'rgba(37, 25, 18, 0.58)',
      success: '#5A9C3F',
      successMuted: '#E7F4DF',
      surface: '#FFFFFF',
      text: '#2A1D16',
      textMuted: '#7D6A60',
      warning: '#D79A1D',
      warningMuted: '#FCEFCC',
    },
  },
};

export const lightColors: AppColors = THEME_LOOKS.classic.light;
export const darkColors: AppColors = THEME_LOOKS.classic.dark;

export function getThemeColors(
  mode: AppearanceMode,
  appLookId: AppLookId = 'classic'
) {
  const look = THEME_LOOKS[appLookId] ?? THEME_LOOKS.classic;
  return mode === 'dark' ? look.dark : look.light;
}
