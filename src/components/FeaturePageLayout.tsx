import type { PropsWithChildren, ReactNode } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useI18n } from './AppLanguageProvider';
import { useAppTheme } from './AppThemeProvider';
import ScreenReveal from './ScreenReveal';
import TutorialTarget from './TutorialTarget';
import type { GuidedTutorialTargetId } from '../services/guidedTutorialService';

type FeaturePageLayoutProps = PropsWithChildren<{
  eyebrow?: string;
  footerInset?: number;
  header?: ReactNode;
  subtitle: string;
  tutorialTargetId?: GuidedTutorialTargetId;
  title: string;
}>;

export default function FeaturePageLayout({
  children,
  eyebrow,
  footerInset = 132,
  header,
  subtitle,
  tutorialTargetId,
  title,
}: FeaturePageLayoutProps) {
  const { t } = useI18n();
  const { colors, typography } = useAppTheme();
  const styles = createStyles(colors, typography);

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: footerInset }]}
        showsVerticalScrollIndicator={false}
      >
        <TutorialTarget targetId={tutorialTargetId}>
          <ScreenReveal style={styles.hero}>
            {eyebrow ? <Text style={styles.eyebrow}>{t(eyebrow)}</Text> : null}
            <Text style={styles.title}>{t(title)}</Text>
            <Text style={styles.subtitle}>{t(subtitle)}</Text>
          </ScreenReveal>
        </TutorialTarget>
        {header}
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (
  colors: ReturnType<typeof useAppTheme>['colors'],
  typography: ReturnType<typeof useAppTheme>['typography']
) =>
  StyleSheet.create({
    content: {
      gap: 18,
      padding: 24,
    },
    eyebrow: {
      color: colors.primary,
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    hero: {
      gap: 6,
    },
    safeArea: {
      backgroundColor: colors.background,
      flex: 1,
    },
    subtitle: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 15,
      lineHeight: 22,
    },
    title: {
      color: colors.text,
      fontFamily: typography.displayFontFamily,
      fontSize: 30,
      fontWeight: '800',
      lineHeight: 36,
    },
  });
