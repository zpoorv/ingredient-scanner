import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  InteractionManager,
  Platform,
  StyleProp,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';

import { useAppTheme } from './AppThemeProvider';
import {
  buildNativeAdRequestOptions,
  describeAdMobError,
  getNativeAdUnitId,
  type NativeAdSurface,
} from '../services/adMobService';

import type { NativeAd as NativeAdHandle } from 'react-native-google-mobile-ads';

type NativeAdsUiModule = Pick<
  typeof import('react-native-google-mobile-ads'),
  'NativeAdView' | 'NativeAsset' | 'NativeAssetType' | 'NativeMediaView'
>;

type NativeSponsoredCardProps = {
  compact?: boolean;
  onLoaded?: () => void;
  style?: StyleProp<ViewStyle>;
  surface: NativeAdSurface;
};

export default function NativeSponsoredCard({
  compact = false,
  onLoaded,
  style,
  surface,
}: NativeSponsoredCardProps) {
  const { colors, typography } = useAppTheme();
  const styles = useMemo(
    () => createStyles(colors, typography, compact),
    [colors, typography, compact]
  );
  const [nativeAd, setNativeAd] = useState<NativeAdHandle | null>(null);
  const [nativeAdsUi, setNativeAdsUi] = useState<NativeAdsUiModule | null>(null);
  const nativeAdRef = useRef<NativeAdHandle | null>(null);
  const hasNotifiedLoadedRef = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
      return;
    }

    let isMounted = true;
    const interactionHandle = InteractionManager.runAfterInteractions(() => {
      void (async () => {
        try {
          const [mobileAdsModule, requestOptions] = await Promise.all([
            import('react-native-google-mobile-ads'),
            buildNativeAdRequestOptions(surface),
          ]);

          if (!isMounted) {
            return;
          }

          if (!requestOptions) {
            if (__DEV__) {
              console.warn(`[AdMob] ${surface} native ad blocked before request creation.`);
            }
            return;
          }

          setNativeAdsUi({
            NativeAdView: mobileAdsModule.NativeAdView,
            NativeAsset: mobileAdsModule.NativeAsset,
            NativeAssetType: mobileAdsModule.NativeAssetType,
            NativeMediaView: mobileAdsModule.NativeMediaView,
          });

          const nextNativeAd = await mobileAdsModule.NativeAd.createForAdRequest(
            getNativeAdUnitId(surface),
            requestOptions
          );

          if (!isMounted) {
            nextNativeAd.destroy();
            return;
          }

          nativeAdRef.current = nextNativeAd;
          setNativeAd(nextNativeAd);

          if (!hasNotifiedLoadedRef.current) {
            hasNotifiedLoadedRef.current = true;
            onLoaded?.();
          }
        } catch (error) {
          if (__DEV__) {
            console.warn(
              `[AdMob] ${surface} native ad failed: ${describeAdMobError(error)}`
            );
          }

          if (isMounted) {
            setNativeAd(null);
          }
        }
      })();
    });

    return () => {
      isMounted = false;
      interactionHandle.cancel();
      nativeAdRef.current?.destroy();
      nativeAdRef.current = null;
    };
  }, [onLoaded, surface]);

  if (!nativeAd || !nativeAdsUi) {
    return null;
  }

  const { NativeAdView, NativeAsset, NativeAssetType, NativeMediaView } = nativeAdsUi;

  return (
    <NativeAdView nativeAd={nativeAd} style={[styles.card, style]}>
      <View style={styles.topRow}>
        <Text style={styles.sponsoredLabel}>Sponsored</Text>
        {nativeAd.advertiser ? (
          <Text numberOfLines={1} style={styles.advertiser}>
            {nativeAd.advertiser}
          </Text>
        ) : null}
      </View>

      <View style={styles.contentRow}>
        {nativeAd.icon?.url ? (
          <NativeAsset assetType={NativeAssetType.ICON}>
            <Image source={{ uri: nativeAd.icon.url }} style={styles.icon} />
          </NativeAsset>
        ) : null}

        <View style={styles.copy}>
          <NativeAsset assetType={NativeAssetType.HEADLINE}>
            <Text numberOfLines={2} style={styles.headline}>
              {nativeAd.headline}
            </Text>
          </NativeAsset>

          {nativeAd.body ? (
            <NativeAsset assetType={NativeAssetType.BODY}>
              <Text numberOfLines={3} style={styles.body}>
                {nativeAd.body}
              </Text>
            </NativeAsset>
          ) : null}
        </View>
      </View>

      {nativeAd.mediaContent ? <NativeMediaView style={styles.media} /> : null}

      {nativeAd.callToAction ? (
        <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
          <View style={styles.ctaChip}>
            <Text numberOfLines={1} style={styles.ctaText}>
              {nativeAd.callToAction}
            </Text>
          </View>
        </NativeAsset>
      ) : null}
    </NativeAdView>
  );
}

const createStyles = (
  colors: ReturnType<typeof useAppTheme>['colors'],
  typography: ReturnType<typeof useAppTheme>['typography'],
  compact: boolean
) =>
  StyleSheet.create({
    advertiser: {
      color: colors.textMuted,
      flex: 1,
      fontFamily: typography.bodyFontFamily,
      fontSize: 12,
      textAlign: 'right',
    },
    body: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: compact ? 13 : 14,
      lineHeight: compact ? 18 : 20,
    },
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 22,
      borderWidth: 1,
      gap: 12,
      overflow: 'hidden',
      padding: compact ? 14 : 16,
    },
    contentRow: {
      flexDirection: 'row',
      gap: 12,
    },
    copy: {
      flex: 1,
      gap: 6,
    },
    ctaChip: {
      alignSelf: 'flex-start',
      backgroundColor: colors.primaryMuted,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    ctaText: {
      color: colors.primary,
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '800',
    },
    headline: {
      color: colors.text,
      fontFamily: typography.headingFontFamily,
      fontSize: compact ? 15 : 16,
      fontWeight: '700',
      lineHeight: compact ? 20 : 22,
    },
    icon: {
      backgroundColor: colors.background,
      borderRadius: 16,
      height: compact ? 52 : 56,
      width: compact ? 52 : 56,
    },
    media: {
      backgroundColor: colors.background,
      borderRadius: 18,
      minHeight: compact ? 132 : 152,
      overflow: 'hidden',
      width: '100%',
    },
    sponsoredLabel: {
      color: colors.primary,
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.3,
      textTransform: 'uppercase',
    },
    topRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 12,
    },
  });
