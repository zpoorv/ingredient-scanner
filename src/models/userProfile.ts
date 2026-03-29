import type { DietProfileId } from '../constants/dietProfiles';
import type { AppearanceMode, AppLookId } from './preferences';
import type { ShareCardStyleId } from './shareCardStyle';

export type UserRole = 'admin' | 'premium' | 'user';

export type UserProfile = {
  age: number | null;
  appLookId: AppLookId;
  appearanceMode: AppearanceMode;
  countryCode: string | null;
  createdAt: string;
  dietProfileId: DietProfileId;
  email: string;
  historyInsightsEnabled: boolean;
  name: string;
  plan: 'free' | 'premium';
  role: UserRole;
  shareCardStyleId: ShareCardStyleId;
  uid: string;
  updatedAt: string;
};
