import type { DietProfileId } from '../constants/dietProfiles';
import type { LoginScreenParams } from '../models/auth';
import type { PremiumFeatureId } from '../models/premium';
import type { ResolvedProduct } from '../types/product';
import type { ScanResultSource } from '../types/scanner';

export type RootStackParamList = {
  About: undefined;
  AccountIntro: undefined;
  AccountSettings: undefined;
  Alerts: undefined;
  AppearanceSettings: undefined;
  Feedback: undefined;
  FeaturedProducts: undefined;
  Help: undefined;
  Home: undefined;
  History: undefined;
  HouseholdSettings: undefined;
  Login: LoginScreenParams;
  IngredientOcr:
    | {
        profileId?: DietProfileId;
      }
    | undefined;
  NotificationSettings: undefined;
  PrivacyPolicy: undefined;
  Premium:
    | {
        featureId?: PremiumFeatureId;
      }
    | undefined;
  Progress: undefined;
  ProfileDetails: undefined;
  ResetPassword: undefined;
  Search: undefined;
  Scanner:
    | {
        profileId?: DietProfileId;
      }
    | undefined;
  ShelfMode: undefined;
  Settings: undefined;
  SignUp: undefined;
  SupportSettings: undefined;
  Trips: undefined;
  Result: {
    barcode: string;
    barcodeType?: string | null;
    persistToHistory?: boolean;
    profileId?: DietProfileId;
    product: ResolvedProduct;
    productSnapshotSource?: 'search-cache' | 'search-index';
    revalidateOnOpen?: boolean;
    resultSource?: ScanResultSource;
  };
};
