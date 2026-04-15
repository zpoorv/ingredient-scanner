import type { DietProfileId } from '../constants/dietProfiles';
import type { AppLanguageCode } from '../constants/languages';
import type { HouseholdProfile } from './householdProfile';
import type { AppearanceMode, AppLookId } from './preferences';
import type { RestrictionId, RestrictionSeverity } from './restrictions';
import type { ShareCardStyleId } from './shareCardStyle';

export type UserRole = 'admin' | 'premium' | 'user';
export type HistoryNotificationCadence = 'smart' | 'weekly';

export type UserProfile = {
  activeHouseholdProfileId: string | null;
  appLookId: AppLookId;
  appearanceMode: AppearanceMode;
  comparisonProductCodes: string[];
  countryCode: string | null;
  createdAt: string;
  dietProfileId: DietProfileId;
  email: string;
  favoriteProductCodes: string[];
  historyInsightsEnabled: boolean;
  historyNotificationCadence: HistoryNotificationCadence;
  historyNotificationsEnabled: boolean;
  householdProfiles: HouseholdProfile[];
  languageCode: AppLanguageCode;
  name: string;
  plan: 'free' | 'premium';
  restrictionIds: RestrictionId[];
  restrictionSeverity: RestrictionSeverity;
  role: UserRole;
  shareCardStyleId: ShareCardStyleId;
  uid: string;
  updatedAt: string;
};
