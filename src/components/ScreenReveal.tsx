import { useEffect, useMemo, useRef, type PropsWithChildren } from 'react';
import { Animated, Easing, StyleSheet, ViewStyle } from 'react-native';

type ScreenRevealProps = PropsWithChildren<{
  delayMs?: number;
  style?: ViewStyle;
}>;

export default function ScreenReveal({
  children,
  delayMs = 0,
  style,
}: ScreenRevealProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(3)).current;

  useEffect(() => {
    const animation = Animated.parallel([
      Animated.timing(opacity, {
        delay: delayMs,
        duration: 90,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        delay: delayMs,
        duration: 110,
        easing: Easing.out(Easing.cubic),
        toValue: 0,
        useNativeDriver: true,
      }),
    ]);

    animation.start();

    return () => {
      animation.stop();
    };
  }, [delayMs, opacity, translateY]);

  const animatedStyle = useMemo(
    () => [
      styles.base,
      style,
      {
        opacity,
        transform: [{ translateY }],
      },
    ],
    [opacity, style, translateY]
  );

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
  },
});
