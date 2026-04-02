import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from './AppThemeProvider';
import type { DietProfileId } from '../constants/dietProfiles';
import type { RootStackParamList } from '../navigation/types';

type MainRouteName = 'History' | 'Home' | 'Scanner' | 'Search' | 'Settings';

type BottomMenuBarProps = {
  activeRoute?: MainRouteName;
  scannerProfileId?: DietProfileId;
};

type BottomMenuItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: MainRouteName;
};

const ITEMS: BottomMenuItem[] = [
  { icon: 'home-outline', label: 'Home', route: 'Home' },
  { icon: 'search-outline', label: 'Search', route: 'Search' },
  { icon: 'scan-outline', label: 'Scan', route: 'Scanner' },
  { icon: 'time-outline', label: 'History', route: 'History' },
  { icon: 'settings-outline', label: 'Settings', route: 'Settings' },
];

export default function BottomMenuBar({
  activeRoute,
  scannerProfileId,
}: BottomMenuBarProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { colors, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);

  const handlePress = (route: MainRouteName) => {
    if (route === activeRoute) {
      return;
    }

    if (route === 'Scanner') {
      navigation.navigate('Scanner', scannerProfileId ? { profileId: scannerProfileId } : undefined);
      return;
    }

    navigation.navigate(route);
  };

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        {
          paddingBottom: Math.max(insets.bottom, 10),
        },
      ]}
    >
      <View style={styles.bar}>
        {ITEMS.map((item) => {
          const isActive = item.route === activeRoute;
          const isCenter = item.route === 'Scanner';

          return (
            <Pressable
              key={item.route}
              accessibilityLabel={item.label}
              accessibilityRole="button"
              onPress={() => handlePress(item.route)}
              style={({ pressed }) => [
                styles.item,
                isCenter && styles.centerItem,
                pressed && styles.itemPressed,
              ]}
            >
              <View
                style={[
                  styles.iconWrap,
                  isActive && styles.iconWrapActive,
                  isCenter && styles.iconWrapCenter,
                  isActive && isCenter && styles.iconWrapCenterActive,
                ]}
              >
                <Ionicons
                  color={
                    isActive
                      ? isCenter
                        ? colors.surface
                        : colors.primary
                      : colors.textMuted
                  }
                  name={item.icon}
                  size={isCenter ? 24 : 22}
                />
              </View>
              <Text
                style={[
                  styles.label,
                  isActive && styles.labelActive,
                  isCenter && styles.labelCenter,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (
  colors: ReturnType<typeof useAppTheme>['colors'],
  typography: ReturnType<typeof useAppTheme>['typography']
) =>
  StyleSheet.create({
    bar: {
      alignItems: 'flex-end',
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 28,
      borderWidth: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingTop: 12,
      shadowColor: '#000',
      shadowOffset: { height: 10, width: 0 },
      shadowOpacity: 0.1,
      shadowRadius: 24,
    },
    centerItem: {
      marginTop: -16,
    },
    iconWrap: {
      alignItems: 'center',
      borderRadius: 18,
      height: 40,
      justifyContent: 'center',
      width: 40,
    },
    iconWrapActive: {
      backgroundColor: colors.primaryMuted,
    },
    iconWrapCenter: {
      backgroundColor: colors.primary,
      borderRadius: 999,
      height: 56,
      width: 56,
    },
    iconWrapCenterActive: {
      backgroundColor: colors.primary,
    },
    item: {
      alignItems: 'center',
      flex: 1,
      gap: 6,
      minHeight: 76,
      paddingBottom: 12,
    },
    itemPressed: {
      opacity: 0.88,
    },
    label: {
      color: colors.textMuted,
      fontFamily: typography.accentFontFamily,
      fontSize: 11,
      fontWeight: '800',
    },
    labelActive: {
      color: colors.primary,
    },
    labelCenter: {
      marginTop: 2,
    },
    wrap: {
      backgroundColor: 'transparent',
      paddingHorizontal: 16,
      paddingTop: 10,
    },
  });
