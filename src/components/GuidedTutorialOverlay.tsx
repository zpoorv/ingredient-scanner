import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useI18n } from './AppLanguageProvider';
import { useAppTheme } from './AppThemeProvider';
import type { RootStackParamList } from '../navigation/types';
import {
  GUIDED_TUTORIAL_STEPS,
  getGuidedTutorialStep,
  openGuidedTutorialStep,
} from '../services/guidedTutorialService';
import { markWelcomeTutorialCompleted } from '../services/tutorialProgressService';
import {
  getGuidedTutorialSession,
  getGuidedTutorialTargetLayouts,
  setGuidedTutorialStep,
  stopGuidedTutorial,
  subscribeGuidedTutorialSession,
  subscribeGuidedTutorialTargets,
  type GuidedTutorialSession,
  type GuidedTutorialTargetLayout,
} from '../store/guidedTutorialStore';

type GuidedTutorialOverlayProps = {
  currentRouteName: keyof RootStackParamList | null;
  userId?: string | null;
};

const SPOTLIGHT_PADDING = 12;
const BUBBLE_MAX_WIDTH = 320;

export default function GuidedTutorialOverlay({
  currentRouteName,
  userId,
}: GuidedTutorialOverlayProps) {
  const [session, setSession] = useState<GuidedTutorialSession>(getGuidedTutorialSession());
  const [targetLayouts, setTargetLayouts] = useState(getGuidedTutorialTargetLayouts());
  const [isBusy, setIsBusy] = useState(false);
  const { t } = useI18n();
  const { colors, typography } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const styles = useMemo(() => createStyles(colors, typography), [colors, typography]);

  useEffect(() => subscribeGuidedTutorialSession(setSession), []);
  useEffect(() => subscribeGuidedTutorialTargets(setTargetLayouts), []);

  const currentStep = getGuidedTutorialStep(session.stepIndex);

  const completeTutorial = async () => {
    setIsBusy(true);

    try {
      await markWelcomeTutorialCompleted(userId).catch(() => null);
      stopGuidedTutorial();
    } finally {
      setIsBusy(false);
    }
  };

  const skipTutorial = async () => {
    setIsBusy(true);

    try {
      await markWelcomeTutorialCompleted(userId).catch(() => null);
      stopGuidedTutorial();
    } finally {
      setIsBusy(false);
    }
  };

  const goToStep = async (stepIndex: number) => {
    if (stepIndex < 0) {
      return;
    }

    if (stepIndex >= GUIDED_TUTORIAL_STEPS.length) {
      await completeTutorial();
      return;
    }

    setIsBusy(true);

    try {
      setGuidedTutorialStep(stepIndex);
      await openGuidedTutorialStep(stepIndex);
    } finally {
      setIsBusy(false);
    }
  };

  if (session.status !== 'active' || !currentStep) {
    return null;
  }

  const isOnExpectedRoute = currentRouteName === currentStep.routeName;
  const targetLayout = targetLayouts[currentStep.targetId];
  const hasTarget =
    isOnExpectedRoute && Boolean(targetLayout && targetLayout.width > 0 && targetLayout.height > 0);
  const spotlight = hasTarget
    ? buildSpotlightRect(targetLayout as GuidedTutorialTargetLayout, windowWidth, windowHeight, insets.top)
    : null;
  const bubbleLayout = spotlight
    ? buildBubbleLayout(spotlight, windowWidth, windowHeight, insets.top, insets.bottom)
    : null;
  const isFirstStep = session.stepIndex === 0;
  const isLastStep = session.stepIndex === GUIDED_TUTORIAL_STEPS.length - 1;

  const renderActions = () => {
    if (!hasTarget || !spotlight || !bubbleLayout) {
      return (
        <View style={styles.actionRow}>
          {!isFirstStep ? (
            <Pressable
              disabled={isBusy}
              onPress={() => void goToStep(session.stepIndex - 1)}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>{t('Back')}</Text>
            </Pressable>
          ) : null}
          <Pressable
            disabled={isBusy}
            onPress={() => void openGuidedTutorialStep(session.stepIndex)}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>
              {t('Open {screenLabel}', { screenLabel: t(currentStep.screenLabel) })}
            </Text>
          </Pressable>
        </View>
      );
    }

    if (currentStep.kind === 'target') {
      return (
        <View style={styles.actionRow}>
          {!isFirstStep ? (
            <Pressable
              disabled={isBusy}
              onPress={() => void goToStep(session.stepIndex - 1)}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>{t('Back')}</Text>
            </Pressable>
          ) : null}
          <Pressable
            disabled={isBusy}
            onPress={() => void goToStep(session.stepIndex + 1)}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>{t('Skip step')}</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={styles.actionRow}>
        {!isFirstStep ? (
          <Pressable
            disabled={isBusy}
            onPress={() => void goToStep(session.stepIndex - 1)}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>{t('Back')}</Text>
          </Pressable>
        ) : null}
        <Pressable
          disabled={isBusy}
          onPress={() => void goToStep(session.stepIndex + 1)}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>
            {isLastStep ? t('Finish') : t(currentStep.nextLabel || 'Next')}
          </Text>
        </Pressable>
      </View>
    );
  };

  if (!hasTarget || !spotlight || !bubbleLayout) {
    return (
      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        <View style={styles.resumeWrap}>
          <View style={styles.resumeCard}>
            <View style={styles.resumeHeader}>
              <View style={styles.resumeBadge}>
                <Ionicons color={colors.primary} name={currentStep.icon} size={18} />
              </View>
              <View style={styles.resumeCopy}>
                <Text style={styles.stepLabel}>
                  {t('Step {current} of {total}', {
                    current: session.stepIndex + 1,
                    total: GUIDED_TUTORIAL_STEPS.length,
                  })}
                </Text>
                <Text style={styles.title}>{t(currentStep.title)}</Text>
              </View>
              <Pressable
                accessibilityLabel={t('Close tutorial')}
                disabled={isBusy}
                onPress={() => void skipTutorial()}
                style={styles.closeButton}
              >
                <Ionicons color={colors.textMuted} name="close" size={18} />
              </Pressable>
            </View>

            <Text style={styles.body}>
              {isOnExpectedRoute
                ? t(
                    'Preparing the spotlight on this feature. If it does not appear, tap below to reopen this step.'
                  )
                : t('The tutorial is moving to {screenLabel}. Tap below to continue the guided flow.', {
                    screenLabel: t(currentStep.screenLabel),
                  })}
            </Text>

            {renderActions()}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View style={[styles.mask, { height: spotlight.y, left: 0, right: 0, top: 0 }]} />
      <View
        style={[
          styles.mask,
          {
            height: spotlight.height,
            left: 0,
            top: spotlight.y,
            width: spotlight.x,
          },
        ]}
      />
      <View
        style={[
          styles.mask,
          {
            height: spotlight.height,
            left: spotlight.x + spotlight.width,
            right: 0,
            top: spotlight.y,
          },
        ]}
      />
      <View
        style={[
          styles.mask,
          {
            bottom: 0,
            left: 0,
            right: 0,
            top: spotlight.y + spotlight.height,
          },
        ]}
      />

      <View
        pointerEvents="none"
        style={[
          styles.spotlight,
          {
            height: spotlight.height,
            left: spotlight.x,
            top: spotlight.y,
            width: spotlight.width,
          },
        ]}
      >
        <View style={styles.spotlightGlow} />
      </View>

      <View
        style={[
          styles.bubble,
          {
            left: bubbleLayout.left,
            top: bubbleLayout.top,
            width: bubbleLayout.width,
          },
        ]}
      >
        <View style={styles.bubbleHeader}>
          <View style={styles.bubbleBadge}>
            <Ionicons color={colors.primary} name={currentStep.icon} size={18} />
          </View>
          <View style={styles.bubbleCopy}>
            <Text style={styles.stepLabel}>
              {t('Step {current} of {total}', {
                current: session.stepIndex + 1,
                total: GUIDED_TUTORIAL_STEPS.length,
              })}
            </Text>
            <Text style={styles.title}>{t(currentStep.title)}</Text>
          </View>
          <Pressable
            accessibilityLabel={t('Close tutorial')}
            disabled={isBusy}
            onPress={() => void skipTutorial()}
            style={styles.closeButton}
          >
            <Ionicons color={colors.textMuted} name="close" size={18} />
          </Pressable>
        </View>

        <Text style={styles.body}>{t(currentStep.body)}</Text>

        <View style={styles.calloutPill}>
          <Ionicons
            color={currentStep.kind === 'target' ? colors.primary : colors.textMuted}
            name={currentStep.kind === 'target' ? 'hand-left-outline' : 'eye-outline'}
            size={14}
          />
          <Text style={styles.calloutPillText}>
            {currentStep.kind === 'target'
              ? t('Tap the highlighted area to continue')
              : t('This highlighted area is the feature we are covering now')}
          </Text>
        </View>

        {renderActions()}
      </View>
    </View>
  );
}

function buildSpotlightRect(
  targetLayout: GuidedTutorialTargetLayout,
  windowWidth: number,
  windowHeight: number,
  topInset: number
) {
  const rawX = Math.max(8, targetLayout.x - SPOTLIGHT_PADDING);
  const rawY = Math.max(topInset + 8, targetLayout.y - SPOTLIGHT_PADDING);
  const width = Math.min(windowWidth - rawX - 8, targetLayout.width + SPOTLIGHT_PADDING * 2);
  const height = Math.min(windowHeight - rawY - 8, targetLayout.height + SPOTLIGHT_PADDING * 2);

  return {
    height,
    width,
    x: rawX,
    y: rawY,
  };
}

function buildBubbleLayout(
  spotlight: { height: number; width: number; x: number; y: number },
  windowWidth: number,
  windowHeight: number,
  topInset: number,
  bottomInset: number
) {
  const bubbleWidth = Math.min(BUBBLE_MAX_WIDTH, windowWidth - 32);
  const estimatedBubbleHeight = 210;
  const left = clamp(
    spotlight.x + spotlight.width / 2 - bubbleWidth / 2,
    16,
    windowWidth - bubbleWidth - 16
  );
  const showAbove = spotlight.y > windowHeight * 0.52;
  const top = showAbove
    ? clamp(
        spotlight.y - estimatedBubbleHeight - 18,
        topInset + 12,
        windowHeight - bottomInset - estimatedBubbleHeight - 16
      )
    : clamp(
        spotlight.y + spotlight.height + 18,
        topInset + 12,
        windowHeight - bottomInset - estimatedBubbleHeight - 16
      );

  return {
    left,
    top,
    width: bubbleWidth,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

const createStyles = (
  colors: ReturnType<typeof useAppTheme>['colors'],
  typography: ReturnType<typeof useAppTheme>['typography']
) =>
  StyleSheet.create({
    actionRow: {
      flexDirection: 'row',
      gap: 10,
      justifyContent: 'flex-end',
    },
    body: {
      color: colors.textMuted,
      fontFamily: typography.bodyFontFamily,
      fontSize: 14,
      lineHeight: 21,
    },
    bubble: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 24,
      borderWidth: 1,
      gap: 14,
      padding: 18,
      position: 'absolute',
      shadowColor: '#000',
      shadowOffset: { height: 10, width: 0 },
      shadowOpacity: 0.18,
      shadowRadius: 20,
    },
    bubbleBadge: {
      alignItems: 'center',
      backgroundColor: colors.primaryMuted,
      borderRadius: 16,
      height: 36,
      justifyContent: 'center',
      width: 36,
    },
    bubbleCopy: {
      flex: 1,
      gap: 2,
    },
    bubbleHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 12,
    },
    calloutPill: {
      alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: 999,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    calloutPillText: {
      color: colors.text,
      fontFamily: typography.accentFontFamily,
      fontSize: 12,
      fontWeight: '700',
    },
    closeButton: {
      alignItems: 'center',
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: 16,
      borderWidth: 1,
      height: 34,
      justifyContent: 'center',
      width: 34,
    },
    mask: {
      backgroundColor: 'rgba(10, 16, 13, 0.72)',
      position: 'absolute',
    },
    primaryButton: {
      alignItems: 'center',
      backgroundColor: colors.primary,
      borderRadius: 999,
      justifyContent: 'center',
      minHeight: 44,
      paddingHorizontal: 18,
    },
    primaryButtonText: {
      color: colors.surface,
      fontFamily: typography.accentFontFamily,
      fontSize: 14,
      fontWeight: '800',
    },
    resumeBadge: {
      alignItems: 'center',
      backgroundColor: colors.primaryMuted,
      borderRadius: 18,
      height: 40,
      justifyContent: 'center',
      width: 40,
    },
    resumeCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 24,
      borderWidth: 1,
      gap: 14,
      maxWidth: 360,
      padding: 18,
      width: '100%',
    },
    resumeCopy: {
      flex: 1,
      gap: 2,
    },
    resumeHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 12,
    },
    resumeWrap: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'flex-end',
      padding: 16,
    },
    secondaryButton: {
      alignItems: 'center',
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: 999,
      borderWidth: 1,
      justifyContent: 'center',
      minHeight: 44,
      paddingHorizontal: 18,
    },
    secondaryButtonText: {
      color: colors.text,
      fontFamily: typography.accentFontFamily,
      fontSize: 14,
      fontWeight: '800',
    },
    spotlight: {
      borderColor: colors.surface,
      borderRadius: 999,
      borderWidth: 2,
      position: 'absolute',
    },
    spotlightGlow: {
      ...StyleSheet.absoluteFillObject,
      borderColor: colors.primary,
      borderRadius: 999,
      borderWidth: 3,
      opacity: 0.95,
    },
    stepLabel: {
      color: colors.primary,
      fontFamily: typography.accentFontFamily,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    title: {
      color: colors.text,
      fontFamily: typography.headingFontFamily,
      fontSize: 18,
      fontWeight: '800',
      lineHeight: 23,
    },
  });
