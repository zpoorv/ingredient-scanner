import { Platform } from 'react-native';
import type {
  CustomerInfo,
  PurchasesEntitlementInfo,
  PurchasesError,
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases';

import {
  REVENUECAT_ANDROID_API_KEY,
  REVENUECAT_ENTITLEMENT_ID,
  REVENUECAT_IOS_API_KEY,
  REVENUECAT_PACKAGE_DEFINITIONS,
  REVENUECAT_PACKAGE_ORDER,
  type InqouraSubscriptionPackageId,
} from '../constants/revenueCat';
import type { UserProfile } from '../models/userProfile';
import { getAuthSession } from '../store';
import {
  DEFAULT_NETWORK_ERROR_MESSAGE,
  isLikelyNetworkError,
} from '../utils/networkErrors';
import { saveRemoteUserProfile } from './cloudUserDataService';
import { loadUserProfile } from './userProfileService';
import { saveStoredUserProfile } from './userProfileStorage';

export type RevenueCatPackageOption = {
  description: string;
  id: InqouraSubscriptionPackageId;
  packageRef: PurchasesPackage;
  periodLabel: string;
  priceLabel: string;
  productIdentifier: string;
  title: string;
};

type RevenueCatPremiumState = {
  isActive: boolean;
  managementUrl: string | null;
  productIdentifier: string | null;
  updatedAt: string | null;
};

let isRevenueCatConfigured = false;
let configuredRevenueCatUserId: string | null = null;

function isSupportedRevenueCatPlatform() {
  return Platform.OS === 'android' || Platform.OS === 'ios';
}

function getRevenueCatApiKey() {
  if (Platform.OS === 'android') {
    return REVENUECAT_ANDROID_API_KEY;
  }

  if (Platform.OS === 'ios') {
    return REVENUECAT_IOS_API_KEY || null;
  }

  return null;
}

function matchesConfiguredPackage(
  candidatePackage: PurchasesPackage,
  packageId: InqouraSubscriptionPackageId
) {
  const definition = REVENUECAT_PACKAGE_DEFINITIONS[packageId];

  return (
    candidatePackage.identifier === packageId ||
    definition.types.includes(candidatePackage.packageType)
  );
}

function formatPackagePrice(candidatePackage: PurchasesPackage) {
  return candidatePackage.product.priceString;
}

function extractRevenueCatErrorDetails(error: unknown) {
  const candidate = error as Partial<PurchasesError> | null;
  const readableErrorCode =
    candidate?.readableErrorCode ?? candidate?.userInfo?.readableErrorCode ?? null;

  if (error instanceof Error) {
    return {
      code: null,
      message: error.message,
      readableErrorCode,
    };
  }

  return {
    code: candidate?.code ?? null,
    message: candidate?.message ?? null,
    readableErrorCode,
  };
}

export function isRevenueCatOfferingsConfigurationError(error: unknown) {
  const { code, message, readableErrorCode } = extractRevenueCatErrorDetails(error);
  const normalizedMessage = message?.toLowerCase() ?? '';
  const normalizedReadableCode = readableErrorCode?.toLowerCase() ?? '';

  return (
    code === '23' ||
    normalizedReadableCode === 'configurationerror' ||
    normalizedMessage.includes('error fetching offerings') ||
    normalizedMessage.includes('no play store products registered') ||
    normalizedMessage.includes('no products registered in the revenuecat dashboard')
  );
}

export function isRevenueCatNetworkError(error: unknown) {
  const { code, message, readableErrorCode } = extractRevenueCatErrorDetails(error);
  const normalizedReadableCode = readableErrorCode?.toLowerCase() ?? '';

  return (
    code === '2' ||
    normalizedReadableCode === 'networkerror' ||
    isLikelyNetworkError(message ?? error)
  );
}

async function loadPurchasesModule() {
  const purchasesModule = await import('react-native-purchases');
  return purchasesModule.default;
}

async function loadPurchasesUiModule() {
  const purchasesUiModule = await import('react-native-purchases-ui');
  return purchasesUiModule.default;
}

async function syncRevenueCatPlanForCurrentUser(customerInfo: CustomerInfo | null) {
  const sessionUser = getAuthSession().user;

  if (!sessionUser) {
    return;
  }

  const profile = await loadUserProfile();

  if (!profile || profile.role !== 'user') {
    return;
  }

  const nextPlan: UserProfile['plan'] = getRevenueCatPremiumState(customerInfo).isActive
    ? 'premium'
    : 'free';

  if (profile.plan === nextPlan) {
    return;
  }

  const nextProfile: UserProfile = {
    ...profile,
    plan: nextPlan,
    updatedAt: new Date().toISOString(),
  };

  await saveStoredUserProfile(nextProfile);
  await saveRemoteUserProfile(nextProfile).catch(() => {
    // Premium should still unlock locally if the billing profile mirror fails.
  });
}

export function getRevenueCatPremiumState(
  customerInfo: CustomerInfo | null
): RevenueCatPremiumState {
  const activeEntitlement =
    customerInfo?.entitlements.active[REVENUECAT_ENTITLEMENT_ID] ?? null;

  return {
    isActive: Boolean(activeEntitlement?.isActive),
    managementUrl: customerInfo?.managementURL ?? null,
    productIdentifier: activeEntitlement?.productIdentifier ?? null,
    updatedAt: customerInfo?.requestDate ?? null,
  };
}

export function getActiveRevenueCatEntitlement(
  customerInfo: CustomerInfo | null
): PurchasesEntitlementInfo | null {
  return customerInfo?.entitlements.active[REVENUECAT_ENTITLEMENT_ID] ?? null;
}

export async function initializeRevenueCatForCurrentUser() {
  const apiKey = getRevenueCatApiKey();

  if (!isSupportedRevenueCatPlatform() || !apiKey) {
    return false;
  }

  const Purchases = await loadPurchasesModule();
  const currentUserId = getAuthSession().user?.id ?? undefined;

  if (!isRevenueCatConfigured) {
    Purchases.configure({
      apiKey,
      appUserID: currentUserId,
      // RevenueCat diagnostics are optional and can fail on restrictive DNS/network setups.
      diagnosticsEnabled: false,
    });
    await Purchases.setLogLevel(
      __DEV__ ? Purchases.LOG_LEVEL.DEBUG : Purchases.LOG_LEVEL.INFO
    );
    isRevenueCatConfigured = true;
    configuredRevenueCatUserId = currentUserId ?? null;
    return true;
  }

  if (currentUserId && configuredRevenueCatUserId !== currentUserId) {
    await Purchases.logIn(currentUserId);
    configuredRevenueCatUserId = currentUserId;
    return true;
  }

  if (!currentUserId && configuredRevenueCatUserId !== null) {
    await Purchases.logOut();
    configuredRevenueCatUserId = null;
  }

  return true;
}

export async function loadRevenueCatCustomerInfo() {
  const isReady = await initializeRevenueCatForCurrentUser();

  if (!isReady) {
    return null;
  }

  const Purchases = await loadPurchasesModule();
  const customerInfo = await Purchases.getCustomerInfo();
  await syncRevenueCatPlanForCurrentUser(customerInfo);
  return customerInfo;
}

export async function loadRevenueCatOfferings() {
  const isReady = await initializeRevenueCatForCurrentUser();

  if (!isReady) {
    return null;
  }

  const Purchases = await loadPurchasesModule();

  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current ?? null;
  } catch (error) {
    if (isRevenueCatOfferingsConfigurationError(error)) {
      return null;
    }

    throw error;
  }
}

export async function loadRevenueCatPackageOptions(
  offering: PurchasesOffering | null,
  customerInfo: CustomerInfo | null
) {
  const activeProductIdentifier = getRevenueCatPremiumState(customerInfo).productIdentifier;

  return REVENUECAT_PACKAGE_ORDER.map((packageId) => {
    const definition = REVENUECAT_PACKAGE_DEFINITIONS[packageId];
    const matchingPackage =
      offering?.availablePackages.find((candidatePackage) =>
        matchesConfiguredPackage(candidatePackage, packageId)
      ) ?? null;

    if (!matchingPackage) {
      return null;
    }

    return {
      description: definition.description,
      id: packageId,
      packageRef: matchingPackage,
      periodLabel: definition.periodLabel,
      priceLabel: formatPackagePrice(matchingPackage),
      productIdentifier: matchingPackage.product.identifier,
      title:
        activeProductIdentifier === matchingPackage.product.identifier
          ? `${definition.label} · Active`
          : definition.label,
    };
  }).filter((item): item is RevenueCatPackageOption => item !== null);
}

export async function purchaseRevenueCatPackage(selectedPackage: PurchasesPackage) {
  await initializeRevenueCatForCurrentUser();
  const Purchases = await loadPurchasesModule();
  const purchaseResult = await Purchases.purchasePackage(selectedPackage);
  await syncRevenueCatPlanForCurrentUser(purchaseResult.customerInfo);
  return purchaseResult.customerInfo;
}

export async function restoreRevenueCatPurchases() {
  await initializeRevenueCatForCurrentUser();
  const Purchases = await loadPurchasesModule();
  const customerInfo = await Purchases.restorePurchases();
  await syncRevenueCatPlanForCurrentUser(customerInfo);
  return customerInfo;
}

export async function presentRevenueCatPaywall(offering?: PurchasesOffering | null) {
  await initializeRevenueCatForCurrentUser();
  const RevenueCatUI = await loadPurchasesUiModule();
  const paywallResult = await RevenueCatUI.presentPaywallIfNeeded({
    displayCloseButton: true,
    offering: offering ?? undefined,
    requiredEntitlementIdentifier: REVENUECAT_ENTITLEMENT_ID,
  });
  const customerInfo = await loadRevenueCatCustomerInfo().catch(() => null);

  return {
    customerInfo,
    paywallResult,
  };
}

export async function presentRevenueCatCustomerCenter() {
  await initializeRevenueCatForCurrentUser();
  const RevenueCatUI = await loadPurchasesUiModule();
  await RevenueCatUI.presentCustomerCenter();
  return loadRevenueCatCustomerInfo().catch(() => null);
}

export async function subscribeToRevenueCatCustomerInfoUpdates(
  onCustomerInfoUpdated: (customerInfo: CustomerInfo) => void
) {
  const isReady = await initializeRevenueCatForCurrentUser();

  if (!isReady) {
    return () => undefined;
  }

  const Purchases = await loadPurchasesModule();
  const listener = (customerInfo: CustomerInfo) => {
    void syncRevenueCatPlanForCurrentUser(customerInfo);
    onCustomerInfoUpdated(customerInfo);
  };

  Purchases.addCustomerInfoUpdateListener(listener);

  return () => {
    Purchases.removeCustomerInfoUpdateListener(listener);
  };
}

export function isRevenueCatPurchaseCancelled(error: unknown) {
  const candidate = error as Partial<PurchasesError> | null;
  return candidate?.userCancelled === true || candidate?.code === '1';
}

export function getRevenueCatErrorMessage(error: unknown, fallbackMessage: string) {
  if (isRevenueCatPurchaseCancelled(error)) {
    return 'Purchase cancelled.';
  }

  if (isRevenueCatNetworkError(error)) {
    return DEFAULT_NETWORK_ERROR_MESSAGE;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  const candidate = error as Partial<PurchasesError> | null;
  return candidate?.message || fallbackMessage;
}

export function isRevenueCatAvailable() {
  return Boolean(getRevenueCatApiKey()) && isSupportedRevenueCatPlatform();
}
