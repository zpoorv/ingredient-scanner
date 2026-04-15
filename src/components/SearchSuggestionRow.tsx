import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useI18n } from './AppLanguageProvider';
import { useAppTheme } from './AppThemeProvider';
import type { SearchSuggestion } from '../models/search';

type SearchSuggestionRowProps = {
  onPress: (suggestion: SearchSuggestion) => void;
  suggestion: SearchSuggestion;
};

export default function SearchSuggestionRow({
  onPress,
  suggestion,
}: SearchSuggestionRowProps) {
  const { t } = useI18n();
  const { colors, typography } = useAppTheme();
  const styles = createStyles(colors, typography);

  return (
    <Pressable onPress={() => onPress(suggestion)} style={styles.card}>
      <View style={styles.iconWrap}>
        <Ionicons
          color={suggestion.sourceLabel === 'recent' ? colors.warning : colors.primary}
          name={suggestion.sourceLabel === 'recent' ? 'time-outline' : 'sparkles-outline'}
          size={18}
        />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{suggestion.query}</Text>
        <Text style={styles.meta}>
          {suggestion.sourceLabel === 'recent'
            ? t('Recent search')
            : t('Suggested match')}
        </Text>
      </View>
      <Ionicons color={colors.textMuted} name="arrow-up-outline" size={18} />
    </Pressable>
  );
}

const createStyles = (
  colors: ReturnType<typeof useAppTheme>['colors'],
  typography: ReturnType<typeof useAppTheme>['typography']
) =>
  StyleSheet.create({
    card: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 18,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
    copy: {
      flex: 1,
      gap: 2,
    },
    iconWrap: {
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: 14,
      height: 32,
      justifyContent: 'center',
      width: 32,
    },
    meta: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 12,
      fontWeight: '700',
    },
    title: {
      color: colors.text,
      fontFamily: typography.bodyFontFamily,
      fontSize: 15,
      fontWeight: '700',
    },
  });
