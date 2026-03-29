import { Suspense, lazy, useEffect, useState } from 'react';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Alert, InteractionManager, Linking } from 'react-native';

import { useAppTheme } from '../components/AppThemeProvider';
import ScreenLoadingView from '../components/ScreenLoadingView';
import { APP_NAME } from '../constants/branding';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import { hydrateAuthSession } from '../services/authService';
import {
  canHandleEmailLink,
  completeEmailLinkSignIn,
} from '../services/emailLinkAuthService';
import {
  refreshCurrentPremiumEntitlement,
} from '../services/premiumEntitlementService';
import { AuthServiceError } from '../services/authHelpers';
import { clearPremiumSession, getAuthSession, subscribeAuthSession } from '../store';
import ResultScreen from '../screens/ResultScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import ScannerScreen from '../screens/ScannerScreen';
import SignUpScreen from '../screens/SignUpScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const loadSettingsScreen = () => import('../screens/SettingsScreen');
const loadPremiumScreen = () => import('../screens/PremiumScreen');
const loadProfileDetailsScreen = () => import('../screens/ProfileDetailsScreen');
const loadHistoryScreen = () => import('../screens/HistoryScreen');
const loadIngredientOcrScreen = () => import('../screens/IngredientOcrScreen');
const loadHelpScreen = () => import('../screens/HelpScreen');
const loadPrivacyPolicyScreen = () => import('../screens/PrivacyPolicyScreen');
const loadAboutScreen = () => import('../screens/AboutScreen');
const loadFeedbackScreen = () => import('../screens/FeedbackScreen');

const SettingsScreen = lazy(loadSettingsScreen);
const PremiumScreen = lazy(loadPremiumScreen);
const ProfileDetailsScreen = lazy(loadProfileDetailsScreen);
const HistoryScreen = lazy(loadHistoryScreen);
const IngredientOcrScreen = lazy(loadIngredientOcrScreen);
const HelpScreen = lazy(loadHelpScreen);
const PrivacyPolicyScreen = lazy(loadPrivacyPolicyScreen);
const AboutScreen = lazy(loadAboutScreen);
const FeedbackScreen = lazy(loadFeedbackScreen);

const AUTHENTICATED_SCREEN_LOADERS = [
  loadSettingsScreen,
  loadPremiumScreen,
  loadProfileDetailsScreen,
  loadHistoryScreen,
  loadIngredientOcrScreen,
  loadHelpScreen,
  loadPrivacyPolicyScreen,
  loadAboutScreen,
  loadFeedbackScreen,
];

export default function RootNavigator() {
  const [authSession, setAuthSession] = useState(getAuthSession());
  const [isHandlingEmailLink, setIsHandlingEmailLink] = useState(false);
  const { colors, typography } = useAppTheme();
  const currentUserId = authSession.user?.id ?? null;
  const isAuthenticated = authSession.status === 'authenticated';

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

  useEffect(() => {
    const unsubscribe = subscribeAuthSession(setAuthSession);
    void hydrateAuthSession();

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (authSession.status === 'authenticated' && currentUserId) {
      void refreshCurrentPremiumEntitlement();
      return;
    }

    clearPremiumSession();
  }, [authSession.status, currentUserId]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    // Warm the lazy screens after the first paint so navigation does not pause
    // the first time a user opens Settings, History, OCR, or support pages.
    const interactionHandle = InteractionManager.runAfterInteractions(() => {
      void Promise.allSettled(
        AUTHENTICATED_SCREEN_LOADERS.map((loadScreen) => loadScreen())
      );
    });

    return () => {
      interactionHandle.cancel();
    };
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

  return (
    <Suspense fallback={<AuthBootstrapScreen />}>
      <NavigationContainer theme={navigationTheme}>
        <Stack.Navigator
          screenOptions={{
            animation: 'slide_from_right',
            contentStyle: { backgroundColor: colors.background },
            headerShadowVisible: false,
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
            headerTitleStyle: {
              color: colors.text,
              fontFamily: typography.headingFontFamily,
              fontWeight: '700',
            },
          }}
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
                name="Settings"
                component={SettingsScreen}
                options={{ title: 'Settings' }}
              />
              <Stack.Screen
                name="Premium"
                component={PremiumScreen}
                options={{ title: 'Premium' }}
              />
              <Stack.Screen
                name="ProfileDetails"
                component={ProfileDetailsScreen}
                options={{ title: 'Profile' }}
              />
              <Stack.Screen
                name="History"
                component={HistoryScreen}
                options={{ title: 'Scan History' }}
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
      </NavigationContainer>
    </Suspense>
  );
}

function AuthBootstrapScreen() {
  return (
    <ScreenLoadingView
      subtitle="Restoring your account and premium access..."
      title="Loading your account"
    />
  );
}
