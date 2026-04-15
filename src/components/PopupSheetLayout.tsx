import { Ionicons } from '@expo/vector-icons';
import type { PropsWithChildren } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useI18n } from './AppLanguageProvider';
import { useAppTheme } from './AppThemeProvider';
import TutorialTarget from './TutorialTarget';
import type { GuidedTutorialTargetId } from '../services/guidedTutorialService';

type PopupSheetLayoutProps = PropsWithChildren<{
  onClose: () => void;
  subtitle: string;
  tutorialTargetId?: GuidedTutorialTargetId;
  title: string;
}>;

export default function PopupSheetLayout({
  children,
  onClose,
  subtitle,
  tutorialTargetId,
  title,
}: PopupSheetLayoutProps) {
  const { t } = useI18n();
  const { colors, typography } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors, typography);

  return (
    <View style={styles.safeArea}>
      <Pressable onPress={onClose} style={styles.backdrop} />
      <View style={styles.sheetWrap}>
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TutorialTarget targetId={tutorialTargetId}>
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <Text style={styles.title}>{t(title)}</Text>
                <Text style={styles.subtitle}>{t(subtitle)}</Text>
              </View>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <Ionicons color={colors.text} name="close" size={22} />
              </Pressable>
            </View>
          </TutorialTarget>
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

const createStyles = (
  colors: ReturnType<typeof useAppTheme>['colors'],
  typography: ReturnType<typeof useAppTheme>['typography']
) =>
  StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(14, 20, 16, 0.48)',
    },
    closeButton: {
      alignItems: 'center',
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: 18,
      borderWidth: 1,
      height: 40,
      justifyContent: 'center',
      width: 40,
    },
    content: {
      gap: 14,
      paddingBottom: 8,
    },
    header: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      gap: 12,
      justifyContent: 'space-between',
    },
    headerCopy: {
      flex: 1,
      gap: 4,
    },
    safeArea: {
      ...StyleSheet.absoluteFillObject,
      elevation: 30,
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      gap: 18,
      maxHeight: '88%',
      paddingHorizontal: 20,
      paddingTop: 18,
    },
    sheetWrap: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'flex-end',
      overflow: 'hidden',
    },
    subtitle: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 14,
      lineHeight: 21,
    },
    title: {
      color: colors.text,
      fontFamily: typography.displayFontFamily,
      fontSize: 28,
      fontWeight: '800',
      lineHeight: 33,
    },
  });
