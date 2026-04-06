import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { useAppTheme } from './AppThemeProvider';
import type { SearchProductHit } from '../models/search';

type ProductSearchResultRowProps = {
  onPress: (result: SearchProductHit) => void;
  result: SearchProductHit;
};

export default function ProductSearchResultRow({
  onPress,
  result,
}: ProductSearchResultRowProps) {
  const { colors, typography } = useAppTheme();
  const styles = createStyles(colors, typography);

  return (
    <Pressable onPress={() => onPress(result)} style={styles.card}>
      <View style={styles.contentRow}>
        {result.product.imageUrl ? (
          <Image contentFit="cover" source={{ uri: result.product.imageUrl }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>
              {result.product.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.copy}>
          <View style={styles.header}>
            <Text numberOfLines={2} style={styles.title}>
              {result.product.name}
            </Text>
            <Text style={styles.badge}>
              {result.sourceLabel === 'saved' ? 'Saved' : 'Catalog'}
            </Text>
          </View>
          {result.product.brand ? <Text style={styles.meta}>{result.product.brand}</Text> : null}
          <Text numberOfLines={2} style={styles.summary}>
            {result.product.quantity
              ? `${result.product.quantity} • ${
                  result.product.categories.slice(0, 2).join(' • ') || result.product.barcode
                }`
              : result.product.categories.slice(0, 2).join(' • ') || result.product.barcode}
          </Text>
          {result.householdFit ? (
            <Text style={styles.householdFit}>
              {result.householdFit.verdict === 'works-for-everyone'
                ? 'Works for everyone'
                : result.householdFit.verdict === 'one-household-caution'
                  ? 'One household caution'
                  : result.householdFit.verdict === 'works-for-you-only'
                    ? 'Works for you only'
                    : "Doesn't fit this household"}
            </Text>
          ) : null}
          {result.isFavorite ? <Text style={styles.favorite}>Favorite</Text> : null}
        </View>
      </View>
    </Pressable>
  );
}

const createStyles = (
  colors: ReturnType<typeof useAppTheme>['colors'],
  typography: ReturnType<typeof useAppTheme>['typography']
) =>
  StyleSheet.create({
    badge: {
      color: colors.primary,
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '800',
    },
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 20,
      borderWidth: 1,
      padding: 16,
    },
    contentRow: {
      flexDirection: 'row',
      gap: 14,
    },
    copy: {
      flex: 1,
      gap: 5,
    },
    favorite: {
      color: colors.warning,
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    header: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      gap: 12,
      justifyContent: 'space-between',
    },
    householdFit: {
      color: colors.primary,
      fontFamily: typography.bodyFontFamily,
      fontSize: 13,
      fontWeight: '700',
    },
    image: {
      backgroundColor: colors.background,
      borderRadius: 18,
      height: 72,
      width: 72,
    },
    imagePlaceholder: {
      alignItems: 'center',
      backgroundColor: colors.primaryMuted,
      borderRadius: 18,
      height: 72,
      justifyContent: 'center',
      width: 72,
    },
    imagePlaceholderText: {
      color: colors.primary,
      fontFamily: typography.headingFontFamily,
      fontSize: 24,
      fontWeight: '800',
    },
    meta: {
      color: colors.text,
      fontFamily: typography.bodyFontFamily,
      fontSize: 14,
    },
    summary: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 13,
      lineHeight: 19,
    },
    title: {
      color: colors.text,
      flex: 1,
      fontFamily: typography.headingFontFamily,
      fontSize: 15,
      fontWeight: '700',
    },
  });
