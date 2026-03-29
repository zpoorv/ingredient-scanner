import { useEffect, useState } from 'react';

export function useDelayedVisibility(isActive: boolean, delayMs = 140) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isActive) {
      setIsVisible(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      setIsVisible(true);
    }, delayMs);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [delayMs, isActive]);

  return isVisible;
}
