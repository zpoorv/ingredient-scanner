import type { NativeAdSurface } from './adMobService';

const shownNativeAdSurfaces = new Set<NativeAdSurface>();

export function hasShownNativeAdThisSession(surface: NativeAdSurface) {
  return shownNativeAdSurfaces.has(surface);
}

export function markNativeAdShownThisSession(surface: NativeAdSurface) {
  shownNativeAdSurfaces.add(surface);
}
