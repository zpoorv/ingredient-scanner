import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from './AppThemeProvider';
import type { MainNavigationRoute } from '../navigation/navigationRef';

type MainRouteName = MainNavigationRoute | 'Scanner';

type BottomMenuBarProps = {
  activeRoute?: MainRouteName;
  onSelectRoute: (route: MainRouteName) => void;
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
  { icon: 'star-outline', label: 'Featured', route: 'FeaturedProducts' },
];

export default function BottomMenuBar({
  activeRoute,
  onSelectRoute,
}: BottomMenuBarProps) {
  const insets = useSafeAreaInsets();
  const { colors, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);

  const handlePress = (route: MainRouteName) => {
    if (route === activeRoute) {
      return;
    }

    onSelectRoute(route);
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
                      : isCenter
                        ? colors.surface
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
      borderBottomColor: colors.border,
      borderBottomWidth: 1,
      borderColor: colors.border,
      borderRadius: 30,
      borderWidth: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 14,
      shadowColor: '#000',
      shadowOffset: { height: 10, width: 0 },
      shadowOpacity: 0.08,
      shadowRadius: 18,
    },
    centerItem: {
      marginTop: -22,
    },
    iconWrap: {
      alignItems: 'center',
      borderRadius: 20,
      height: 44,
      justifyContent: 'center',
      width: 44,
    },
    iconWrapActive: {
      backgroundColor: colors.primaryMuted,
    },
    iconWrapCenter: {
      backgroundColor: colors.text,
      borderRadius: 999,
      borderWidth: 4,
      borderColor: colors.surface,
      height: 62,
      shadowColor: '#000',
      shadowOffset: { height: 8, width: 0 },
      shadowOpacity: 0.18,
      shadowRadius: 12,
      width: 62,
    },
    iconWrapCenterActive: {
      backgroundColor: colors.primary,
    },
    item: {
      alignItems: 'center',
      flex: 1,
      gap: 6,
      minHeight: 82,
      paddingBottom: 14,
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
      paddingHorizontal: 18,
      paddingTop: 10,
    },
  });
