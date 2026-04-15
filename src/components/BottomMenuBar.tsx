import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useI18n } from './AppLanguageProvider';
import { useAppTheme } from './AppThemeProvider';
import TutorialTarget from './TutorialTarget';
import type { MainNavigationRoute } from '../navigation/navigationRef';
import {
  advanceGuidedTutorialFromTarget,
  type GuidedTutorialTargetId,
} from '../services/guidedTutorialService';

type MainRouteName = MainNavigationRoute | 'Scanner';

type BottomMenuBarProps = {
  activeRoute?: MainRouteName;
  onSelectRoute: (route: MainRouteName) => void;
};

type BottomMenuItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: MainRouteName;
  tutorialTargetId?: GuidedTutorialTargetId;
};

const ITEMS: BottomMenuItem[] = [
  { icon: 'home-outline', label: 'Home', route: 'Home' },
  {
    icon: 'search-outline',
    label: 'Search',
    route: 'Search',
    tutorialTargetId: 'bottom-search-tab',
  },
  { icon: 'scan-outline', label: 'Scan', route: 'Scanner' },
  {
    icon: 'time-outline',
    label: 'History',
    route: 'History',
    tutorialTargetId: 'bottom-history-tab',
  },
  {
    icon: 'star-outline',
    label: 'Featured',
    route: 'FeaturedProducts',
    tutorialTargetId: 'bottom-featured-tab',
  },
];

export default function BottomMenuBar({
  activeRoute,
  onSelectRoute,
}: BottomMenuBarProps) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { colors, typography } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);

  const handlePress = (
    route: MainRouteName,
    tutorialTargetId?: GuidedTutorialTargetId
  ) => {
    if (route === activeRoute) {
      return;
    }

    if (tutorialTargetId) {
      advanceGuidedTutorialFromTarget(tutorialTargetId);
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
            <TutorialTarget
              key={item.route}
              style={styles.itemWrap}
              targetId={item.tutorialTargetId}
            >
              <Pressable
                accessibilityLabel={t(item.label)}
                accessibilityRole="button"
                onPress={() => handlePress(item.route, item.tutorialTargetId)}
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
                  {t(item.label)}
                </Text>
              </Pressable>
            </TutorialTarget>
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
    itemWrap: {
      flex: 1,
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
