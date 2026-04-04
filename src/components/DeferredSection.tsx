import { useEffect, useState, type PropsWithChildren, type ReactNode } from 'react';
import { InteractionManager } from 'react-native';

type DeferredSectionProps = PropsWithChildren<{
  enabled?: boolean;
  fallback?: ReactNode;
}>;

export default function DeferredSection({
  children,
  enabled = true,
  fallback = null,
}: DeferredSectionProps) {
  const [isReady, setIsReady] = useState(!enabled);

  useEffect(() => {
    if (!enabled) {
      setIsReady(true);
      return;
    }

    setIsReady(false);

    let isMounted = true;
    const interactionHandle = InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => {
        if (isMounted) {
          setIsReady(true);
        }
      });
    });

    return () => {
      isMounted = false;
      interactionHandle.cancel();
    };
  }, [enabled]);

  if (!isReady) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
