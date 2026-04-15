import { useMemo } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { useI18n } from './AppLanguageProvider';
import { useAppTheme } from './AppThemeProvider';
import type { ProductSuggestion } from '../utils/productSuggestions';

type ProductSuggestionsCardProps = {
  suggestions: ProductSuggestion[];
};

export default function ProductSuggestionsCard({
  suggestions,
}: ProductSuggestionsCardProps) {
  const { t } = useI18n();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (suggestions.length === 0) {
    return null;
  }

  const hasAdminSuggestions = suggestions.some(
    (suggestion) => suggestion.issue === 'admin pick'
  );

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{t('Better Alternatives')}</Text>
      <Text style={styles.title}>
        {hasAdminSuggestions
          ? t('Admin-picked alternatives')
          : t('What to look for next time')}
      </Text>
      <Text style={styles.subtitle}>
        {hasAdminSuggestions
          ? t('These were added to help you compare better picks for this product.')
          : t('These are simpler directions to look for the next time you shop.')}
      </Text>

      <View style={styles.list}>
        {suggestions.map((suggestion) => (
          <View key={suggestion.id} style={styles.item}>
            <View style={styles.issueChip}>
              <Text style={styles.issueChipText}>{t(suggestion.issue)}</Text>
            </View>
            <Text style={styles.itemTitle}>{t(suggestion.title)}</Text>
            <Text style={styles.itemDescription}>{t(suggestion.description)}</Text>
            {suggestion.url ? (
              <Pressable onPress={() => void Linking.openURL(suggestion.url || '')}>
                <Text style={styles.link}>{t('Open Link')}</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const createStyles = (
  colors: ReturnType<typeof useAppTheme>['colors']
) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 20,
      borderWidth: 1,
      gap: 12,
      padding: 20,
    },
    issueChip: {
      alignSelf: 'flex-start',
      backgroundColor: colors.primaryMuted,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    issueChipText: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.3,
      textTransform: 'uppercase',
    },
    item: {
      backgroundColor: colors.background,
      borderRadius: 16,
      gap: 8,
      padding: 16,
    },
    itemDescription: {
      color: colors.textMuted,
      fontSize: 14,
      lineHeight: 21,
    },
    itemTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: '700',
      lineHeight: 22,
    },
    link: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '700',
    },
    label: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 0.3,
      textTransform: 'uppercase',
    },
    list: {
      gap: 12,
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: 14,
      lineHeight: 21,
    },
    title: {
      color: colors.text,
      fontSize: 23,
      fontWeight: '800',
      lineHeight: 28,
    },
  });
