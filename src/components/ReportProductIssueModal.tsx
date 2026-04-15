import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useI18n } from './AppLanguageProvider';
import { useAppTheme } from './AppThemeProvider';
import type { CorrectionReportReason } from '../models/correctionReport';

type ReportProductIssueModalProps = {
  onClose: () => void;
  onSelectReason: (reason: CorrectionReportReason) => void;
  visible: boolean;
};

const REASONS: { label: string; reason: CorrectionReportReason }[] = [
  { label: 'Score or verdict looks wrong', reason: 'wrong-score' },
  { label: 'Product details look wrong', reason: 'wrong-product-details' },
  { label: 'Ingredient read looks wrong', reason: 'bad-ingredient-read' },
  { label: 'Alternatives do not fit', reason: 'wrong-alternatives' },
  { label: 'Something else needs review', reason: 'other' },
];

export default function ReportProductIssueModal({
  onClose,
  onSelectReason,
  visible,
}: ReportProductIssueModalProps) {
  const { t } = useI18n();
  const { colors, typography } = useAppTheme();
  const styles = createStyles(colors, typography);

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.label}>{t('Review request')}</Text>
          <Text style={styles.title}>{t('What looks off?')}</Text>
          {REASONS.map((item) => (
            <Pressable
              key={item.reason}
              onPress={() => onSelectReason(item.reason)}
              style={styles.option}
            >
              <Text style={styles.optionText}>{t(item.label)}</Text>
            </Pressable>
          ))}
          <Pressable onPress={onClose} style={styles.cancel}>
            <Text style={styles.cancelText}>{t('Cancel')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (
  colors: ReturnType<typeof useAppTheme>['colors'],
  typography: ReturnType<typeof useAppTheme>['typography']
) =>
  StyleSheet.create({
    backdrop: {
      alignItems: 'center',
      backgroundColor: 'rgba(12, 17, 24, 0.42)',
      flex: 1,
      justifyContent: 'center',
      padding: 24,
    },
    cancel: {
      alignItems: 'center',
      marginTop: 8,
      paddingVertical: 12,
    },
    cancelText: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 15,
      fontWeight: '700',
    },
    label: {
      color: colors.primary,
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.3,
      textTransform: 'uppercase',
    },
    option: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: 18,
      borderWidth: 1,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    optionText: {
      color: colors.text,
      fontFamily: typography.bodyFontFamily,
      fontSize: 15,
      fontWeight: '700',
      lineHeight: 22,
    },
    sheet: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 24,
      borderWidth: 1,
      gap: 10,
      padding: 20,
      width: '100%',
    },
    title: {
      color: colors.text,
      fontFamily: typography.headingFontFamily,
      fontSize: 22,
      fontWeight: '800',
      marginBottom: 4,
    },
  });
