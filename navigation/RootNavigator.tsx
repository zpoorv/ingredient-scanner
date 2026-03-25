import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { colors } from '../constants/colors';
import HistoryScreen from '../screens/HistoryScreen';
import HomeScreen from '../screens/HomeScreen';
import ResultScreen from '../screens/ResultScreen';
import ScannerScreen from '../screens/ScannerScreen';
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
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'Ingredient Scanner' }}
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
          name="Result"
          component={ResultScreen}
          options={{ title: 'Product Details' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
