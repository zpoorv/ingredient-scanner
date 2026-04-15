import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useAppTheme } from './AppThemeProvider';

type TutorialProgressDotsProps = {
  count: number;
  currentIndex: number;
  onSelect?: (index: number) => void;
};

export default function TutorialProgressDots({
  count,
  currentIndex,
  onSelect,
}: TutorialProgressDotsProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.row}>
      {Array.from({ length: count }).map((_, index) => (
        <Pressable
          accessibilityLabel={`Go to tutorial step ${index + 1}`}
          accessibilityRole="button"
          disabled={!onSelect}
          key={index}
          onPress={() => onSelect?.(index)}
          style={[
            styles.dot,
            index === currentIndex ? styles.dotActive : styles.dotIdle,
          ]}
        />
      ))}
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>['colors']) =>
  StyleSheet.create({
    dot: {
      borderRadius: 999,
      height: 8,
    },
    dotActive: {
      backgroundColor: colors.primary,
      width: 24,
    },
    dotIdle: {
      backgroundColor: colors.border,
      width: 8,
    },
    row: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 8,
      justifyContent: 'center',
    },
  });
