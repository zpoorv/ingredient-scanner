import type { DietProfileId } from '../constants/dietProfiles';
import type { ResolvedProduct } from '../types/product';
import type { ScanResultSource } from '../types/scanner';

export type RootStackParamList = {
  Home: undefined;
  History: undefined;
  IngredientOcr:
    | {
        profileId?: DietProfileId;
      }
    | undefined;
  Scanner:
    | {
        profileId?: DietProfileId;
      }
    | undefined;
  Result: {
    barcode: string;
    barcodeType?: string | null;
    persistToHistory?: boolean;
    profileId?: DietProfileId;
    product: ResolvedProduct;
    resultSource?: ScanResultSource;
  };
};
