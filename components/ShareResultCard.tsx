import { ImageBackground, StyleSheet, Text, View } from 'react-native';

import { colors } from '../constants/colors';
import { getGradeTone } from '../utils/gradeTone';
import type { ShareableResultData } from '../utils/shareableResult';

type ShareResultCardProps = {
  data: ShareableResultData;
  onImageLoadEnd?: () => void;
};

function getShareTheme(gradeLabel: string) {
  const gradeTone = getGradeTone(gradeLabel);

  switch (gradeLabel) {
    case 'A':
      return {
        accent: gradeTone.color,
        background: gradeTone.backgroundColor,
        label: 'Strong pick',
        panel: '#F4FBF6',
      };
    case 'B':
      return {
        accent: gradeTone.color,
        background: gradeTone.backgroundColor,
        label: 'Pretty solid',
        panel: '#F7FBF1',
      };
    case 'C':
      return {
        accent: gradeTone.color,
        background: gradeTone.backgroundColor,
        label: 'Mixed call',
        panel: '#FFF9EC',
      };
    case 'D':
      return {
        accent: gradeTone.color,
        background: gradeTone.backgroundColor,
        label: 'Use caution',
        panel: '#FFF5EE',
      };
    default:
      return {
        accent: gradeTone.color,
        background: gradeTone.backgroundColor,
        label: 'High concern',
        panel: '#FFF5F4',
      };
  }
}

export default function ShareResultCard({
  data,
  onImageLoadEnd,
}: ShareResultCardProps) {
  const scoreTheme = getShareTheme(data.gradeLabel);

  return (
    <View style={[styles.card, { backgroundColor: scoreTheme.panel }]}>
      <View
        style={[
          styles.accentGlowLarge,
          { backgroundColor: `${scoreTheme.accent}22` },
        ]}
      />
      <View
        style={[
          styles.accentGlowSmall,
          { backgroundColor: `${scoreTheme.accent}18` },
        ]}
      />

      <View style={styles.header}>
        <View style={[styles.pill, { backgroundColor: colors.surface }]}>
          <Text style={[styles.pillText, { color: scoreTheme.accent }]}>
            Ingredient Scanner
          </Text>
        </View>
        <View style={[styles.pill, { backgroundColor: scoreTheme.background }]}>
          <Text style={[styles.gradeText, { color: scoreTheme.accent }]}>
            Grade {data.gradeLabel}
          </Text>
        </View>
      </View>

      <View style={styles.heroRow}>
        <View style={styles.heroTextBlock}>
          <Text numberOfLines={3} style={styles.productName}>
            {data.productName}
          </Text>
          {data.companyName ? (
            <Text numberOfLines={1} style={styles.companyName}>
              {data.companyName}
            </Text>
          ) : null}
          <Text style={[styles.verdictLabel, { color: scoreTheme.accent }]}>
            {scoreTheme.label}
          </Text>
          <Text numberOfLines={3} style={styles.verdictText}>
            {data.verdict}
          </Text>
        </View>

        <View
          style={[
            styles.scoreOrb,
            {
              backgroundColor: scoreTheme.accent,
            },
          ]}
        >
          {data.imageUrl ? (
            <>
              <ImageBackground
                imageStyle={styles.scoreOrbImage}
                onLoadEnd={onImageLoadEnd}
                source={{ uri: data.imageUrl }}
                style={styles.scoreOrbMedia}
              />
              <View style={styles.scoreOrbOverlay} />
            </>
          ) : (
            <View style={styles.scoreOrbFallback} />
          )}
          <View style={styles.scoreOrbContent}>
            <Text style={styles.scoreValue}>{data.score}</Text>
            <Text style={styles.scoreSuffix}>/100</Text>
          </View>
        </View>
      </View>

      <View style={styles.footerPanel}>
        <Text style={styles.sectionLabel}>Top risky ingredients</Text>
        {data.topRiskyIngredients.length > 0 ? (
          <View style={styles.tagWrap}>
            {data.topRiskyIngredients.map((ingredient) => (
              <View key={ingredient} style={styles.tag}>
                <Text numberOfLines={1} style={styles.tagText}>
                  {ingredient}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>
            No major ingredient flags were highlighted in this quick scan.
          </Text>
        )}

        <Text style={styles.footnote}>
          Quick scan summary for social sharing. Review the full product page for
          context.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  accentGlowLarge: {
    borderRadius: 999,
    height: 220,
    position: 'absolute',
    right: -70,
    top: -60,
    width: 220,
  },
  accentGlowSmall: {
    borderRadius: 999,
    bottom: 80,
    height: 140,
    left: -40,
    position: 'absolute',
    width: 140,
  },
  card: {
    borderRadius: 28,
    overflow: 'hidden',
    padding: 20,
    width: '100%',
  },
  companyName: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  emptyText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  footerPanel: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    gap: 12,
    padding: 16,
  },
  footnote: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  gradeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  heroRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 16,
    marginBottom: 18,
  },
  heroTextBlock: {
    flex: 1,
    gap: 8,
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  productName: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 32,
  },
  scoreOrb: {
    alignItems: 'center',
    borderRadius: 999,
    height: 110,
    justifyContent: 'center',
    position: 'relative',
    width: 110,
    overflow: 'hidden',
  },
  scoreOrbContent: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 1,
  },
  scoreOrbFallback: {
    ...StyleSheet.absoluteFillObject,
  },
  scoreOrbImage: {
    borderRadius: 999,
  },
  scoreOrbMedia: {
    ...StyleSheet.absoluteFillObject,
  },
  scoreOrbOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(23, 33, 31, 0.28)',
  },
  scoreSuffix: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '700',
  },
  scoreValue: {
    color: colors.surface,
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 32,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  tag: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: '100%',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  tagText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  verdictLabel: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  verdictText: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
  },
});
