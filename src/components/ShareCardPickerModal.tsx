import { useMemo } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { ShareCardStyleDefinition } from '../constants/shareCardStyles';
import type { ShareCardStyleId } from '../models/shareCardStyle';
import type { ShareableResultData } from '../utils/shareableResult';
import { useAppTheme } from './AppThemeProvider';
import PrimaryButton from './PrimaryButton';
import ShareResultCard from './ShareResultCard';

type ShareCardPickerModalProps = {
  dailyLimitText: string;
  footerText?: string | null;
  isPremium: boolean;
  isSharing: boolean;
  onClose: () => void;
  onShare: () => void;
  onUpgrade: () => void;
  selectedStyleId: ShareCardStyleId;
  shareData: ShareableResultData;
  styleDefinitions: ShareCardStyleDefinition[];
  visible: boolean;
  onSelectStyle: (styleId: ShareCardStyleId) => void;
};

export default function ShareCardPickerModal({
  dailyLimitText,
  footerText,
  isPremium,
  isSharing,
  onClose,
  onShare,
  onSelectStyle,
  onUpgrade,
  selectedStyleId,
  shareData,
  styleDefinitions,
  visible,
}: ShareCardPickerModalProps) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.overlay}>
        <Pressable onPress={onClose} style={styles.backdrop} />
        <View style={styles.sheet}>
          <Text style={styles.title}>Choose a share card</Text>
          <Text style={styles.subtitle}>{dailyLimitText}</Text>

          <View style={styles.previewCard}>
            <View style={styles.previewFrame}>
              <View style={styles.previewScaleWrap}>
                <View style={styles.previewScaleContent}>
                  <ShareResultCard
                    data={shareData}
                    footerText={footerText}
                    variantId={selectedStyleId}
                  />
                </View>
              </View>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={styles.carouselContent}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {styleDefinitions.map((definition) => {
              const isLocked = definition.isPremiumOnly && !isPremium;
              const isSelected = definition.id === selectedStyleId;

              return (
                <Pressable
                  key={definition.id}
                  onPress={() => {
                    if (!isLocked) {
                      onSelectStyle(definition.id);
                    }
                  }}
                  style={[
                    styles.carouselCard,
                    isSelected && styles.carouselCardSelected,
                    isLocked && styles.carouselCardLocked,
                  ]}
                >
                  <View style={styles.carouselTopRow}>
                    <Text
                      style={[
                        styles.carouselTitle,
                        isSelected && styles.carouselTitleSelected,
                      ]}
                    >
                      {definition.label}
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        isLocked ? styles.lockedBadge : styles.availableBadge,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          isLocked
                            ? styles.lockedBadgeText
                            : styles.availableBadgeText,
                        ]}
                      >
                        {isLocked ? 'Premium' : isSelected ? 'Selected' : 'Included'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.carouselDescription}>{definition.description}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.footerActions}>
            <PrimaryButton
              label={isSharing ? 'Preparing Share...' : 'Share This Card'}
              disabled={isSharing}
              onPress={onShare}
            />
            {!isPremium ? (
              <PrimaryButton label="Buy Premium" onPress={onUpgrade} />
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (
  colors: ReturnType<typeof useAppTheme>['colors']
) =>
  StyleSheet.create({
    availableBadge: {
      backgroundColor: colors.successMuted,
    },
    availableBadgeText: {
      color: colors.success,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.scanOverlay,
    },
    carouselCard: {
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: 18,
      borderWidth: 1,
      gap: 10,
      padding: 14,
      width: 220,
    },
    carouselCardLocked: {
      opacity: 0.76,
    },
    carouselCardSelected: {
      backgroundColor: colors.primaryMuted,
      borderColor: colors.primary,
    },
    carouselContent: {
      gap: 12,
      paddingBottom: 4,
    },
    carouselDescription: {
      color: colors.textMuted,
      fontSize: 13,
      lineHeight: 19,
    },
    carouselTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
    },
    carouselTitleSelected: {
      color: colors.primary,
    },
    carouselTopRow: {
      gap: 10,
    },
    footerActions: {
      gap: 10,
    },
    lockedBadge: {
      backgroundColor: colors.warningMuted,
    },
    lockedBadgeText: {
      color: colors.warning,
    },
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    previewCard: {
      alignItems: 'center',
      backgroundColor: colors.background,
      borderColor: colors.border,
      borderRadius: 22,
      borderWidth: 1,
      overflow: 'hidden',
      paddingVertical: 10,
    },
    previewFrame: {
      alignItems: 'center',
      height: 280,
      justifyContent: 'center',
      width: '100%',
    },
    previewScaleContent: {
      width: 360,
    },
    previewScaleWrap: {
      transform: [{ scale: 0.62 }],
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      gap: 16,
      paddingBottom: 32,
      paddingHorizontal: 20,
      paddingTop: 22,
    },
    statusBadge: {
      alignSelf: 'flex-start',
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    statusBadgeText: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.2,
      textTransform: 'uppercase',
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: 14,
      lineHeight: 21,
    },
    title: {
      color: colors.text,
      fontSize: 24,
      fontWeight: '800',
      lineHeight: 30,
    },
  });
