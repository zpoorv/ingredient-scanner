import { useEffect, useState } from 'react';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { APP_NAME } from '../constants/branding';
import { colors } from '../constants/colors';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import { hydrateAuthSession } from '../services/authService';
import { getAuthSession, subscribeAuthSession } from '../store';
import ResultScreen from '../screens/ResultScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import ScannerScreen from '../screens/ScannerScreen';
import SignUpScreen from '../screens/SignUpScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

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

export default function RootNavigator() {
  const [authSession, setAuthSession] = useState(getAuthSession());

  useEffect(() => {
    const unsubscribe = subscribeAuthSession(setAuthSession);
    void hydrateAuthSession();

    return unsubscribe;
  }, []);

  const isAuthenticated = authSession.status === 'authenticated';

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      >
        {authSession.status === 'loading' ? (
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
              name="History"
              getComponent={() => require('../screens/HistoryScreen').default}
              options={{ title: 'Scan History' }}
            />
            <Stack.Screen
              name="Scanner"
              component={ScannerScreen}
              options={{ title: 'Scan Barcode' }}
            />
            <Stack.Screen
              name="IngredientOcr"
              getComponent={() => require('../screens/IngredientOcrScreen').default}
              options={{ title: 'Scan Ingredients' }}
            />
            <Stack.Screen
              name="Result"
              component={ResultScreen}
              options={{ title: 'Product Details' }}
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
  );
}

function AuthBootstrapScreen() {
  return (
    <View style={styles.bootstrapScreen}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={styles.bootstrapText}>Loading your account...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bootstrapScreen: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    gap: 14,
    justifyContent: 'center',
  },
  bootstrapText: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: '600',
  },
});
