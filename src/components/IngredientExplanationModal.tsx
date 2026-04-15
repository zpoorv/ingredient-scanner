import { useMemo } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useI18n } from './AppLanguageProvider';
import { useAppTheme } from './AppThemeProvider';
import type { DietProfileId } from '../constants/dietProfiles';
import type { RestrictionId } from '../models/restrictions';
import type { IngredientExplanationLookup } from '../utils/ingredientExplanations';
import { buildIngredientEducation } from '../utils/ingredientEducation';

type IngredientExplanationModalProps = {
  dietProfileId: DietProfileId;
  lookup: IngredientExplanationLookup | null;
  onClose: () => void;
  restrictionIds: RestrictionId[];
  visible: boolean;
};

type DetailRowProps = {
  label: string;
  styles: any;
  value: string;
};

function DetailRow(props: DetailRowProps) {
  const { label, styles, value } = props;
  const { t } = useI18n();

  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{t(label)}</Text>
      <Text style={styles.detailValue}>{t(value)}</Text>
    </View>
  );
}

export default function IngredientExplanationModal({
  dietProfileId,
  lookup,
  onClose,
  restrictionIds,
  visible,
}: IngredientExplanationModalProps) {
  const { t } = useI18n();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const education = useMemo(
    () => buildIngredientEducation(lookup, dietProfileId, restrictionIds),
    [dietProfileId, lookup, restrictionIds]
  );

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
            <Text style={styles.eyebrow}>{t('Ingredient')}</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeLabel}>{t('Close')}</Text>
            </Pressable>
          </View>

          <Text style={styles.ingredientName}>
            {lookup?.explanation?.name || lookup?.ingredientName || t('Ingredient')}
          </Text>

          {lookup?.explanation ? (
            <View style={styles.content}>
              <DetailRow
                label="What it is used for"
                styles={styles}
                value={lookup.explanation.usedFor}
              />
              <DetailRow
                label="Why shoppers notice it"
                styles={styles}
                value={lookup.explanation.whyItMatters}
              />
              <DetailRow
                label="Plain-English take"
                styles={styles}
                value={lookup.explanation.plainEnglish}
              />
              {education.profileNotes.length > 0 ? (
                <DetailRow
                  label="For your profile"
                  styles={styles}
                  value={education.profileNotes.join(' ')}
                />
              ) : null}
              {education.betterChoiceTip ? (
                <DetailRow
                  label="What to look for next time"
                  styles={styles}
                  value={education.betterChoiceTip}
                />
              ) : null}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>{t('No quick note yet')}</Text>
              <Text style={styles.emptyBody}>
                {t('We do not have a short note for this ingredient yet.')}
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
