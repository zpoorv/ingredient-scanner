import { InteractionManager } from 'react-native';
import {
  Dimensions,
  type LayoutChangeEvent,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import {
  useCallback,
  useEffect,
  useRef,
  type PropsWithChildren,
} from 'react';

import type { GuidedTutorialTargetId } from '../services/guidedTutorialService';
import {
  registerGuidedTutorialTarget,
  unregisterGuidedTutorialTarget,
} from '../store/guidedTutorialStore';

type TutorialTargetProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  targetId?: GuidedTutorialTargetId;
}>;

export default function TutorialTarget({
  children,
  style,
  targetId,
}: TutorialTargetProps) {
  const viewRef = useRef<View>(null);

  const measureTarget = useCallback(() => {
    if (!targetId) {
      return;
    }

    viewRef.current?.measureInWindow((x, y, width, height) => {
      if (width <= 0 || height <= 0) {
        return;
      }

      registerGuidedTutorialTarget(targetId, {
        height,
        width,
        x,
        y,
      });
    });
  }, [targetId]);

  const handleLayout = useCallback(
    (_event: LayoutChangeEvent) => {
      measureTarget();
    },
    [measureTarget]
  );

  useEffect(() => {
    if (!targetId) {
      return;
    }

    const interactionHandle = InteractionManager.runAfterInteractions(() => {
      measureTarget();
    });
    const timeoutId = setTimeout(() => {
      measureTarget();
    }, 120);
    const subscription = Dimensions.addEventListener('change', () => {
      measureTarget();
    });

    return () => {
      interactionHandle.cancel();
      clearTimeout(timeoutId);
      subscription.remove();
      unregisterGuidedTutorialTarget(targetId);
    };
  }, [measureTarget, targetId]);

  return (
    <View
      collapsable={false}
      onLayout={handleLayout}
      ref={viewRef}
      style={[styles.wrap, style]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'stretch',
  },
});
