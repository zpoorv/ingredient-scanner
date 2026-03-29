import { useMemo } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAppTheme } from './AppThemeProvider';
import type { IngredientExplanationLookup } from '../utils/ingredientExplanations';

type IngredientExplanationModalProps = {
  lookup: IngredientExplanationLookup | null;
  onClose: () => void;
  visible: boolean;
};

type DetailRowProps = {
  label: string;
  styles: any;
  value: string;
};

function DetailRow(props: DetailRowProps) {
  const { label, styles, value } = props;

  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

export default function IngredientExplanationModal({
  lookup,
  onClose,
  visible,
}: IngredientExplanationModalProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.container}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <Text style={styles.eyebrow}>Ingredient</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeLabel}>Close</Text>
            </Pressable>
          </View>

          <Text style={styles.ingredientName}>
            {lookup?.explanation?.name || lookup?.ingredientName || 'Ingredient'}
          </Text>

          {lookup?.explanation ? (
            <View style={styles.content}>
              <DetailRow
                label="What it is used for"
                styles={styles}
                value={lookup.explanation.usedFor}
              />
              <DetailRow
                label="Why it may matter"
                styles={styles}
                value={lookup.explanation.whyItMatters}
              />
              <DetailRow
                label="Plain-English take"
                styles={styles}
                value={lookup.explanation.plainEnglish}
              />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No quick note yet</Text>
              <Text style={styles.emptyBody}>
                We do not have a short note for this ingredient yet.
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (
  colors: ReturnType<typeof useAppTheme>['colors']
) =>
  StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.scanOverlay,
    },
    closeButton: {
      paddingVertical: 4,
    },
    closeLabel: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '700',
    },
    container: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    content: {
      gap: 16,
    },
    detailLabel: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.6,
      marginBottom: 6,
      textTransform: 'uppercase',
    },
    detailRow: {
      gap: 2,
    },
    detailValue: {
      color: colors.text,
      fontSize: 15,
      lineHeight: 22,
    },
    emptyBody: {
      color: colors.textMuted,
      fontSize: 15,
      lineHeight: 22,
    },
    emptyState: {
      gap: 10,
    },
    emptyTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '700',
    },
    eyebrow: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.7,
      textTransform: 'uppercase',
    },
    headerRow: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    ingredientName: {
      color: colors.text,
      fontSize: 24,
      fontWeight: '700',
      lineHeight: 30,
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      gap: 18,
      paddingBottom: 32,
      paddingHorizontal: 24,
      paddingTop: 22,
    },
  });
