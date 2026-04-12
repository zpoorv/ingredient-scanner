import { Ionicons } from '@expo/vector-icons';
import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Alert, InteractionManager, Linking, Pressable, StyleSheet, View } from 'react-native';

import BottomMenuBar from '../components/BottomMenuBar';
import { useAppTheme } from '../components/AppThemeProvider';
import ScreenLoadingView from '../components/ScreenLoadingView';
import { APP_NAME } from '../constants/branding';
import {
  flushPendingHistoryNavigation,
  openMainRoute,
  rootNavigationRef,
  type MainNavigationRoute,
} from './navigationRef';
import HistoryScreen from '../screens/HistoryScreen';
import FeaturedProductsScreen from '../screens/FeaturedProductsScreen';
import HomeScreen from '../screens/HomeScreen';
import LoginScreen from '../screens/LoginScreen';
import { PremiumSheet } from '../screens/PremiumScreen';
import ResultScreen from '../screens/ResultScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import ScannerScreen from '../screens/ScannerScreen';
import SearchScreen from '../screens/SearchScreen';
import SettingsScreen, { SettingsSheet } from '../screens/SettingsScreen';
import SignUpScreen from '../screens/SignUpScreen';
import { hydrateAuthSession } from '../services/authService';
import { AuthServiceError } from '../services/authHelpers';
import {
  getCachedAppBootstrapSnapshot,
  loadAppBootstrapSnapshot,
} from '../services/appBootstrapSnapshotService';
import {
  canHandleEmailLink,
  completeEmailLinkSignIn,
} from '../services/emailLinkAuthService';
import { loadEffectiveShoppingProfile } from '../services/householdProfilesService';
import {
  markPerformanceTrace,
  measurePerformanceTrace,
} from '../services/performanceTrace';
import { refreshCurrentPremiumEntitlement } from '../services/premiumEntitlementService';
import { clearSessionResourceCache } from '../services/sessionResourceCache';
import {
  clearPremiumSession,
  getAuthSession,
  setAuthSession,
  subscribeAuthSession,
} from '../store';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const loadPremiumScreen = () => import('../screens/PremiumScreen');
const loadProfileDetailsScreen = () => import('../screens/ProfileDetailsScreen');
const loadProgressScreen = () => import('../screens/ProgressScreen');
const loadAlertsScreen = () => import('../screens/AlertsScreen');
const loadTripsScreen = () => import('../screens/TripsScreen');
const loadShelfModeScreen = () => import('../screens/ShelfModeScreen');
const loadIngredientOcrScreen = () => import('../screens/IngredientOcrScreen');
const loadAccountSettingsScreen = () => import('../screens/AccountSettingsScreen');
const loadNotificationSettingsScreen = () =>
  import('../screens/NotificationSettingsScreen');
const loadAppearanceSettingsScreen = () =>
  import('../screens/AppearanceSettingsScreen');
const loadHouseholdSettingsScreen = () =>
  import('../screens/HouseholdSettingsScreen');
const loadSupportSettingsScreen = () => import('../screens/SupportSettingsScreen');
const loadHelpScreen = () => import('../screens/HelpScreen');
const loadPrivacyPolicyScreen = () => import('../screens/PrivacyPolicyScreen');
const loadAboutScreen = () => import('../screens/AboutScreen');
const loadFeedbackScreen = () => import('../screens/FeedbackScreen');

const PremiumScreen = lazy(loadPremiumScreen);
const ProfileDetailsScreen = lazy(loadProfileDetailsScreen);
const ProgressScreen = lazy(loadProgressScreen);
const AlertsScreen = lazy(loadAlertsScreen);
const TripsScreen = lazy(loadTripsScreen);
const ShelfModeScreen = lazy(loadShelfModeScreen);
const IngredientOcrScreen = lazy(loadIngredientOcrScreen);
const AccountSettingsScreen = lazy(loadAccountSettingsScreen);
const NotificationSettingsScreen = lazy(loadNotificationSettingsScreen);
const AppearanceSettingsScreen = lazy(loadAppearanceSettingsScreen);
const HouseholdSettingsScreen = lazy(loadHouseholdSettingsScreen);
const SupportSettingsScreen = lazy(loadSupportSettingsScreen);
const HelpScreen = lazy(loadHelpScreen);
const PrivacyPolicyScreen = lazy(loadPrivacyPolicyScreen);
const AboutScreen = lazy(loadAboutScreen);
const FeedbackScreen = lazy(loadFeedbackScreen);

const BOTTOM_BAR_ROUTES = new Set<keyof RootStackParamList>([
  'FeaturedProducts',
  'Home',
  'Search',
  'History',
  'Scanner',
]);
const HIDE_BACK_ARROW_ROUTES = new Set<keyof RootStackParamList>([
  'FeaturedProducts',
  'Home',
  'Search',
  'History',
]);
const HEADER_ACTION_ROUTES = new Set<keyof RootStackParamList>([
  'FeaturedProducts',
  'Home',
  'Search',
  'History',
  'Progress',
  'Alerts',
  'Trips',
  'Scanner',
  'Result',
  'ProfileDetails',
]);

export default function RootNavigator() {
  const initialBootstrapSnapshot = getCachedAppBootstrapSnapshot();
  const [authSession, setAuthSessionState] = useState(
    initialBootstrapSnapshot?.authSession ?? getAuthSession()
  );
  const [currentRouteName, setCurrentRouteName] =
    useState<keyof RootStackParamList | null>(null);
  const [isHandlingEmailLink, setIsHandlingEmailLink] = useState(false);
  const [hasNavigationReady, setHasNavigationReady] = useState(false);
  const [hasQueuedAuthHydration, setHasQueuedAuthHydration] = useState(false);
  const { colors, typography } = useAppTheme();
  const currentUserId = authSession.user?.id ?? null;
  const isAuthenticated = authSession.status === 'authenticated';
  const styles = useMemo(() => createStyles(colors), [colors]);

  const navigationTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: colors.background,
      border: colors.border,
      card: colors.surface,
      notification: colors.primary,
      primary: colors.primary,
      text: colors.text,
    },
  };

  const syncCurrentRoute = useCallback(() => {
    setCurrentRouteName(rootNavigationRef.getCurrentRoute()?.name ?? null);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const unsubscribe = subscribeAuthSession((nextSession) => {
      setAuthSessionState(nextSession);
    });

    if (initialBootstrapSnapshot && getAuthSession().status === 'loading') {
      setAuthSession(initialBootstrapSnapshot.authSession);
    }

    if (getAuthSession().status === 'loading') {
      void loadAppBootstrapSnapshot()
        .then((snapshot) => {
          if (!isMounted || getAuthSession().status !== 'loading') {
            return;
          }

          setAuthSession(snapshot.authSession);
        })
        .catch(() => {
          if (isMounted && getAuthSession().status === 'loading') {
            setAuthSession({ status: 'guest', user: null });
          }
        });
    }

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [initialBootstrapSnapshot]);

  useEffect(() => {
    if (!hasNavigationReady || hasQueuedAuthHydration) {
      return;
    }

    setHasQueuedAuthHydration(true);
    const interactionHandle = InteractionManager.runAfterInteractions(() => {
      void hydrateAuthSession().catch(() => null);
    });

    return () => {
      interactionHandle.cancel();
    };
  }, [hasNavigationReady, hasQueuedAuthHydration]);

  useEffect(() => {
    clearSessionResourceCache();

    if (authSession.status === 'authenticated' && currentUserId && hasNavigationReady) {
      const interactionHandle = InteractionManager.runAfterInteractions(() => {
        void refreshCurrentPremiumEntitlement();
      });

      return () => {
        interactionHandle.cancel();
      };
    }

    if (authSession.status !== 'loading') {
      clearPremiumSession();
    }
  }, [authSession.status, currentUserId, hasNavigationReady]);

  useEffect(() => {
    flushPendingHistoryNavigation(isAuthenticated);
  }, [isAuthenticated]);

  useEffect(() => {
    let isMounted = true;

    const handleIncomingUrl = async (url: string | null) => {
      if (!url || !canHandleEmailLink(url)) {
        return;
      }

      if (isMounted) {
        setIsHandlingEmailLink(true);
      }

      try {
        await completeEmailLinkSignIn(url);
      } catch (error) {
        Alert.alert(
          'Email sign-in failed',
          error instanceof AuthServiceError
            ? error.message
            : 'We could not finish that email sign-in link.'
        );
      } finally {
        if (isMounted) {
          setIsHandlingEmailLink(false);
        }
      }
    };

    void Linking.getInitialURL().then((url) => {
      void handleIncomingUrl(url);
    });

    const subscription = Linking.addEventListener('url', ({ url }) => {
      void handleIncomingUrl(url);
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  const handleOpenPremium = useCallback(() => {
    if (!rootNavigationRef.isReady() || currentRouteName === 'Premium') {
      return;
    }

    rootNavigationRef.navigate('Premium');
  }, [currentRouteName]);

  const handleOpenProfile = useCallback(() => {
    if (!rootNavigationRef.isReady() || currentRouteName === 'ProfileDetails') {
      return;
    }

    rootNavigationRef.navigate('ProfileDetails');
  }, [currentRouteName]);

  const handleOpenSettings = useCallback(() => {
    if (!rootNavigationRef.isReady() || currentRouteName === 'Settings') {
      return;
    }

    rootNavigationRef.navigate('Settings');
  }, [currentRouteName]);

  const handleBottomRoutePress = useCallback(
    async (route: MainNavigationRoute | 'Scanner') => {
      if (route === 'Scanner') {
        if (!rootNavigationRef.isReady() || currentRouteName === 'Scanner') {
          return;
        }

        const effectiveProfile = await loadEffectiveShoppingProfile();
        rootNavigationRef.navigate('Scanner', {
          profileId: effectiveProfile.dietProfileId,
        });
        return;
      }

      openMainRoute(route);
    },
    [currentRouteName]
  );

  const activeBottomRoute =
    currentRouteName === 'Home' ||
    currentRouteName === 'FeaturedProducts' ||
    currentRouteName === 'Search' ||
    currentRouteName === 'History' ||
    currentRouteName === 'Scanner'
      ? currentRouteName
      : undefined;
  const shouldShowBottomBar =
    isAuthenticated &&
    currentRouteName !== null &&
    BOTTOM_BAR_ROUTES.has(currentRouteName);
  const overlayFeatureId =
    currentRouteName === 'Premium'
      ? (rootNavigationRef.getCurrentRoute()?.params as RootStackParamList['Premium'])?.featureId
      : undefined;

  return (
    <Suspense fallback={<AuthBootstrapScreen />}>
      <NavigationContainer
        onReady={() => {
          setHasNavigationReady(true);
          syncCurrentRoute();
          flushPendingHistoryNavigation(isAuthenticated);
          measurePerformanceTrace('app-start', 'route-ready');
        }}
        onStateChange={() => {
          syncCurrentRoute();
          const nextRouteName = rootNavigationRef.getCurrentRoute()?.name;

          if (nextRouteName === 'Scanner') {
            markPerformanceTrace('scanner-open');
          }
        }}
        ref={rootNavigationRef}
        theme={navigationTheme}
      >
        <View style={styles.root}>
          <Stack.Navigator
            screenOptions={({ route }) => ({
              animation: 'slide_from_right',
              contentStyle: { backgroundColor: colors.background },
              headerBackVisible: !HIDE_BACK_ARROW_ROUTES.has(route.name),
              headerLeft: HIDE_BACK_ARROW_ROUTES.has(route.name) ? () => null : undefined,
              headerRight: HEADER_ACTION_ROUTES.has(route.name)
                ? () => (
                    <View style={styles.headerActions}>
                      <Pressable
                        accessibilityLabel="Open profile"
                        accessibilityRole="button"
                        onPress={handleOpenProfile}
                        style={({ pressed }) => [
                          styles.headerButton,
                          pressed && styles.headerButtonPressed,
                        ]}
                      >
                        <Ionicons color={colors.text} name="person-circle-outline" size={20} />
                      </Pressable>
                      <Pressable
                        accessibilityLabel="Open settings"
                        accessibilityRole="button"
                        onPress={handleOpenSettings}
                        style={({ pressed }) => [
                          styles.headerButton,
                          pressed && styles.headerButtonPressed,
                        ]}
                      >
                        <Ionicons color={colors.text} name="settings-outline" size={20} />
                      </Pressable>
                      <Pressable
                        accessibilityLabel="Open premium"
                        accessibilityRole="button"
                        onPress={handleOpenPremium}
                        style={({ pressed }) => [
                          styles.headerButton,
                          pressed && styles.headerButtonPressed,
                        ]}
                      >
                        <Ionicons color={colors.primary} name="sparkles-outline" size={20} />
                      </Pressable>
                    </View>
                  )
                : undefined,
              headerShadowVisible: false,
              headerStyle: { backgroundColor: colors.surface },
              headerTintColor: colors.text,
              headerTitleStyle: {
                color: colors.text,
                fontFamily: typography.headingFontFamily,
                fontWeight: '700',
              },
            })}
          >
            {authSession.status === 'loading' || isHandlingEmailLink ? (
              <Stack.Screen
                name="Login"
                component={AuthBootstrapScreen}
                options={{ headerShown: false }}
              />
            ) : isAuthenticated ? (
              <>
                <Stack.Screen
                  name="Home"
                  component={HomeScreen}
                  options={{ title: APP_NAME }}
                />
                <Stack.Screen
                  name="FeaturedProducts"
                  component={FeaturedProductsScreen}
                  options={{ title: 'Featured' }}
                />
                <Stack.Screen
                  name="Settings"
                  component={SettingsScreen}
                  options={{
                    animation: 'slide_from_bottom',
                    contentStyle: { backgroundColor: 'transparent' },
                    headerShown: false,
                    presentation: 'containedTransparentModal',
                  }}
                />
                <Stack.Screen
                  name="Alerts"
                  component={AlertsScreen}
                  options={{ title: 'Alerts' }}
                />
                <Stack.Screen
                  name="Trips"
                  component={TripsScreen}
                  options={{ title: 'Trips' }}
                />
                <Stack.Screen
                  name="Premium"
                  component={PremiumScreen}
                  options={{
                    animation: 'slide_from_bottom',
                    contentStyle: { backgroundColor: 'transparent' },
                    headerShown: false,
                    presentation: 'containedTransparentModal',
                  }}
                />
                <Stack.Screen
                  name="AccountSettings"
                  component={AccountSettingsScreen}
                  options={{ title: 'Account' }}
                />
                <Stack.Screen
                  name="NotificationSettings"
                  component={NotificationSettingsScreen}
                  options={{ title: 'Notifications' }}
                />
                <Stack.Screen
                  name="AppearanceSettings"
                  component={AppearanceSettingsScreen}
                  options={{ title: 'Appearance' }}
                />
                <Stack.Screen
                  name="HouseholdSettings"
                  component={HouseholdSettingsScreen}
                  options={{ title: 'Household' }}
                />
                <Stack.Screen
                  name="SupportSettings"
                  component={SupportSettingsScreen}
                  options={{ title: 'Support' }}
                />
                <Stack.Screen
                  name="ProfileDetails"
                  component={ProfileDetailsScreen}
                  options={{ title: 'Profile' }}
                />
                <Stack.Screen
                  name="Progress"
                  component={ProgressScreen}
                  options={{ title: 'Achievements' }}
                />
                <Stack.Screen
                  name="History"
                  component={HistoryScreen}
                  options={{ title: 'History' }}
                />
                <Stack.Screen
                  name="Search"
                  component={SearchScreen}
                  options={{ title: 'Search' }}
                />
                <Stack.Screen
                  name="ShelfMode"
                  component={ShelfModeScreen}
                  options={{ title: 'Shelf Mode' }}
                />
                <Stack.Screen
                  name="Scanner"
                  component={ScannerScreen}
                  options={{ title: 'Scan Barcode' }}
                />
                <Stack.Screen
                  name="IngredientOcr"
                  component={IngredientOcrScreen}
                  options={{ title: 'Scan Ingredients' }}
                />
                <Stack.Screen
                  name="Result"
                  component={ResultScreen}
                  options={{ title: 'Product Details' }}
                />
                <Stack.Screen
                  name="Help"
                  component={HelpScreen}
                  options={{ title: 'Help' }}
                />
                <Stack.Screen
                  name="PrivacyPolicy"
                  component={PrivacyPolicyScreen}
                  options={{ title: 'Privacy Policy' }}
                />
                <Stack.Screen
                  name="About"
                  component={AboutScreen}
                  options={{ title: 'About' }}
                />
                <Stack.Screen
                  name="Feedback"
                  component={FeedbackScreen}
                  options={{ title: 'Send Feedback' }}
                />
              </>
            ) : (
              <>
                <Stack.Screen
                  name="Login"
                  component={LoginScreen}
                  options={{ title: 'Log In' }}
                />
                <Stack.Screen
                  name="SignUp"
                  component={SignUpScreen}
                  options={{ title: 'Create Account' }}
                />
                <Stack.Screen
                  name="ResetPassword"
                  component={ResetPasswordScreen}
                  options={{ title: 'Reset Password' }}
                />
              </>
            )}
          </Stack.Navigator>

          {shouldShowBottomBar ? (
            <View pointerEvents="box-none" style={styles.bottomBarOverlay}>
              <BottomMenuBar
                activeRoute={activeBottomRoute}
                onSelectRoute={(route) => {
                  void handleBottomRoutePress(route);
                }}
              />
            </View>
          ) : null}

          {currentRouteName === 'Settings' ? (
            <View pointerEvents="box-none" style={styles.modalOverlay}>
              <SettingsSheet
                onClose={() => rootNavigationRef.goBack()}
                onNavigate={(route) => rootNavigationRef.navigate(route)}
              />
            </View>
          ) : null}

          {currentRouteName === 'Premium' ? (
            <View pointerEvents="box-none" style={styles.modalOverlay}>
              <PremiumSheet
                featureId={overlayFeatureId}
                onClose={() => rootNavigationRef.goBack()}
              />
            </View>
          ) : null}
        </View>
      </NavigationContainer>
    </Suspense>
  );
}

function AuthBootstrapScreen() {
  return (
    <ScreenLoadingView
      subtitle="Restoring your account and shopping tools..."
      title={`Loading ${APP_NAME}`}
    />
  );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>['colors']) =>
  StyleSheet.create({
    bottomBarOverlay: {
      bottom: 0,
      left: 0,
      position: 'absolute',
      right: 0,
    },
    headerActions: {
      flexDirection: 'row',
      gap: 8,
    },
    headerButton: {
      alignItems: 'center',
      backgroundColor: colors.primaryMuted,
      borderRadius: 999,
      height: 36,
      justifyContent: 'center',
      width: 36,
    },
    headerButtonPressed: {
      opacity: 0.82,
    },
    modalOverlay: {
      ...StyleSheet.absoluteFillObject,
      elevation: 30,
      zIndex: 20,
    },
    root: {
      backgroundColor: colors.background,
      flex: 1,
    },
  });
