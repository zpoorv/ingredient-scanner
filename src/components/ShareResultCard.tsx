import { ImageBackground, StyleSheet, Text, View } from 'react-native';

import { useI18n } from './AppLanguageProvider';
import { APP_NAME } from '../constants/branding';
import { colors } from '../constants/colors';
import type { ShareCardStyleId } from '../models/shareCardStyle';
import { getGradeTone } from '../utils/gradeTone';
import type { ShareableResultData } from '../utils/shareableResult';

type ShareResultCardProps = {
  data: ShareableResultData;
  footerText?: string | null;
  onImageLoadEnd?: () => void;
  variantId?: ShareCardStyleId;
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

function ScoreOrb({
  accent,
  data,
  onImageLoadEnd,
  size = 110,
}: {
  accent: string;
  data: ShareableResultData;
  onImageLoadEnd?: () => void;
  size?: number;
}) {
  return (
    <View
      style={[
        styles.scoreOrb,
        {
          backgroundColor: accent,
          height: size,
          width: size,
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
        <Text style={[styles.scoreValue, size <= 84 && styles.scoreValueCompact]}>
          {data.score}
        </Text>
        <Text style={styles.scoreSuffix}>/100</Text>
      </View>
    </View>
  );
}

function RiskTags({ accent, items }: { accent: string; items: string[] }) {
  const { t } = useI18n();

  if (items.length === 0) {
    return (
      <Text style={styles.emptyText}>
        {t('No major ingredient flags were highlighted in this quick scan.')}
      </Text>
    );
  }

  return (
    <View style={styles.tagWrap}>
      {items.map((ingredient) => (
        <View key={ingredient} style={[styles.tag, { borderColor: `${accent}28` }]}>
          <Text numberOfLines={1} style={styles.tagText}>
            {ingredient}
          </Text>
        </View>
      ))}
    </View>
  );
}

function FooterNote({ footerText }: { footerText?: string | null }) {
  const { t } = useI18n();

  return (
    <Text style={styles.footnote}>
      {t(
        footerText ||
          'Quick scan summary for social sharing. Review the full product page for context.'
      )}
    </Text>
  );
}

function ClassicCard({
  data,
  footerText,
  onImageLoadEnd,
}: ShareResultCardProps) {
  const { t } = useI18n();
  const scoreTheme = getShareTheme(data.gradeLabel);

  return (
    <View style={[styles.card, { backgroundColor: scoreTheme.panel }]}>
      <View style={[styles.accentGlowLarge, { backgroundColor: `${scoreTheme.accent}22` }]} />
      <View style={[styles.accentGlowSmall, { backgroundColor: `${scoreTheme.accent}18` }]} />

      <View style={styles.header}>
        <View style={[styles.pill, { backgroundColor: colors.surface }]}>
          <Text style={[styles.pillText, { color: scoreTheme.accent }]}>{APP_NAME}</Text>
        </View>
        <View style={[styles.pill, { backgroundColor: scoreTheme.background }]}>
          <Text style={[styles.gradeText, { color: scoreTheme.accent }]}>
            {t('Grade {grade}', { grade: data.gradeLabel })}
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
            {t(scoreTheme.label)}
          </Text>
          <Text numberOfLines={3} style={styles.verdictText}>
            {data.verdict}
          </Text>
        </View>
        <ScoreOrb accent={scoreTheme.accent} data={data} onImageLoadEnd={onImageLoadEnd} />
      </View>

      <View style={styles.footerPanel}>
        <Text style={styles.sectionLabel}>{t('Top risky ingredients')}</Text>
        <RiskTags accent={scoreTheme.accent} items={data.topRiskyIngredients} />
        <FooterNote footerText={footerText} />
      </View>
    </View>
  );
}

function SpotlightCard({
  data,
  footerText,
  onImageLoadEnd,
}: ShareResultCardProps) {
  const { t } = useI18n();
  const scoreTheme = getShareTheme(data.gradeLabel);

  return (
    <View style={[styles.card, styles.spotlightCard, { backgroundColor: scoreTheme.accent }]}>
      <View style={styles.spotlightHeader}>
        <Text style={styles.spotlightBrand}>{APP_NAME}</Text>
        <Text style={styles.spotlightGrade}>{t('Grade {grade}', { grade: data.gradeLabel })}</Text>
      </View>
      <View style={styles.spotlightOrbWrap}>
        <ScoreOrb
          accent={scoreTheme.accent}
          data={data}
          onImageLoadEnd={onImageLoadEnd}
          size={124}
        />
      </View>
      <Text style={styles.spotlightName}>{data.productName}</Text>
      {data.companyName ? (
        <Text style={styles.spotlightCompany}>{data.companyName}</Text>
      ) : null}
      <Text style={styles.spotlightVerdict}>{data.verdict}</Text>
      <View style={styles.spotlightPanel}>
        <Text style={[styles.sectionLabel, { color: scoreTheme.accent }]}>
          {t('Watch-outs')}
        </Text>
        <RiskTags accent={scoreTheme.accent} items={data.topRiskyIngredients} />
        <FooterNote footerText={footerText} />
      </View>
    </View>
  );
}

function GlassCard({
  data,
  footerText,
  onImageLoadEnd,
}: ShareResultCardProps) {
  const { t } = useI18n();
  const scoreTheme = getShareTheme(data.gradeLabel);

  return (
    <View style={[styles.card, styles.glassCard]}>
      <View style={[styles.glassGlow, { backgroundColor: `${scoreTheme.accent}44` }]} />
      <View style={styles.glassPanel}>
        <View style={styles.header}>
          <Text style={[styles.pillText, { color: scoreTheme.accent }]}>{APP_NAME}</Text>
          <Text style={[styles.gradeText, { color: scoreTheme.accent }]}>
            {t('Grade {grade}', { grade: data.gradeLabel })}
          </Text>
        </View>
        <View style={styles.heroRow}>
          <View style={styles.heroTextBlock}>
            <Text numberOfLines={3} style={styles.productName}>
              {data.productName}
            </Text>
            {data.companyName ? (
              <Text style={styles.companyName}>{data.companyName}</Text>
            ) : null}
            <Text style={styles.verdictText}>{data.verdict}</Text>
          </View>
          <ScoreOrb accent={scoreTheme.accent} data={data} onImageLoadEnd={onImageLoadEnd} />
        </View>
      </View>
      <View style={[styles.glassPanel, styles.glassBottomPanel]}>
        <Text style={[styles.sectionLabel, { color: scoreTheme.accent }]}>
          {t('Top risky ingredients')}
        </Text>
        <RiskTags accent={scoreTheme.accent} items={data.topRiskyIngredients} />
        <FooterNote footerText={footerText} />
      </View>
    </View>
  );
}

function PosterCard({
  data,
  footerText,
  onImageLoadEnd,
}: ShareResultCardProps) {
  const { t } = useI18n();
  const scoreTheme = getShareTheme(data.gradeLabel);

  return (
    <View style={[styles.card, styles.posterCard, { backgroundColor: scoreTheme.panel }]}>
      <View style={[styles.posterBand, { backgroundColor: scoreTheme.accent }]}>
        <Text style={styles.posterBandText}>{APP_NAME}</Text>
        <Text style={styles.posterBandText}>{t('Grade {grade}', { grade: data.gradeLabel })}</Text>
      </View>
      <View style={styles.posterBody}>
        <View style={styles.posterOrbColumn}>
          <ScoreOrb
            accent={scoreTheme.accent}
            data={data}
            onImageLoadEnd={onImageLoadEnd}
            size={118}
          />
        </View>
        <View style={styles.posterTextColumn}>
          <Text numberOfLines={3} style={styles.productName}>
            {data.productName}
          </Text>
          {data.companyName ? (
            <Text style={styles.companyName}>{data.companyName}</Text>
          ) : null}
          <Text style={[styles.verdictLabel, { color: scoreTheme.accent }]}>
            {t(scoreTheme.label)}
          </Text>
          <Text style={styles.verdictText}>{data.verdict}</Text>
        </View>
      </View>
      <View style={styles.posterFooter}>
        <RiskTags accent={scoreTheme.accent} items={data.topRiskyIngredients} />
        <FooterNote footerText={footerText} />
      </View>
    </View>
  );
}

function ReceiptCard({
  data,
  footerText,
  onImageLoadEnd,
}: ShareResultCardProps) {
  const { t } = useI18n();
  const scoreTheme = getShareTheme(data.gradeLabel);

  return (
    <View style={[styles.card, styles.receiptCard]}>
      <Text style={styles.receiptBrand}>{t('{appName} quick receipt', { appName: APP_NAME })}</Text>
      <Text numberOfLines={2} style={styles.receiptName}>
        {data.productName}
      </Text>
      {data.companyName ? <Text style={styles.receiptCompany}>{data.companyName}</Text> : null}
      <View style={styles.receiptDivider} />
      <View style={styles.receiptRow}>
        <Text style={styles.receiptLabel}>{t('Score')}</Text>
        <Text style={[styles.receiptValue, { color: scoreTheme.accent }]}>
          {data.score}/100
        </Text>
      </View>
      <View style={styles.receiptRow}>
        <Text style={styles.receiptLabel}>{t('Grade')}</Text>
        <Text style={[styles.receiptValue, { color: scoreTheme.accent }]}>
          {data.gradeLabel}
        </Text>
      </View>
      <View style={styles.receiptRowTop}>
        <ScoreOrb
          accent={scoreTheme.accent}
          data={data}
          onImageLoadEnd={onImageLoadEnd}
          size={84}
        />
        <View style={styles.receiptVerdictBlock}>
          <Text style={styles.receiptVerdict}>{data.verdict}</Text>
        </View>
      </View>
      <View style={styles.receiptDivider} />
      <Text style={styles.sectionLabel}>{t('Risk ingredients')}</Text>
      <RiskTags accent={scoreTheme.accent} items={data.topRiskyIngredients} />
      <FooterNote footerText={footerText} />
    </View>
  );
}

function RadarCard({
  data,
  footerText,
  onImageLoadEnd,
}: ShareResultCardProps) {
  const { t } = useI18n();
  const scoreTheme = getShareTheme(data.gradeLabel);

  return (
    <View style={[styles.card, styles.radarCard, { backgroundColor: '#12202A' }]}>
      <View style={styles.radarHeader}>
        <View>
          <Text style={styles.radarLabel}>{APP_NAME}</Text>
          <Text numberOfLines={2} style={styles.radarName}>
            {data.productName}
          </Text>
          {data.companyName ? (
            <Text style={styles.radarCompany}>{data.companyName}</Text>
          ) : null}
        </View>
        <ScoreOrb
          accent={scoreTheme.accent}
          data={data}
          onImageLoadEnd={onImageLoadEnd}
          size={96}
        />
      </View>
      <View style={styles.radarMetricGrid}>
        <View style={styles.radarMetricCard}>
          <Text style={styles.radarMetricLabel}>{t('Grade')}</Text>
          <Text style={[styles.radarMetricValue, { color: scoreTheme.accent }]}>
            {data.gradeLabel}
          </Text>
        </View>
        <View style={styles.radarMetricCard}>
          <Text style={styles.radarMetricLabel}>{t('Verdict')}</Text>
          <Text numberOfLines={2} style={styles.radarMetricValueSmall}>
            {data.verdict}
          </Text>
        </View>
      </View>
      <View style={styles.radarList}>
        <Text style={[styles.sectionLabel, { color: '#BDE5EF' }]}>
          {t('Priority watch-outs')}
        </Text>
        <RiskTags accent={scoreTheme.accent} items={data.topRiskyIngredients} />
        <FooterNote footerText={footerText} />
      </View>
    </View>
  );
}

export default function ShareResultCard({
  data,
  footerText,
  onImageLoadEnd,
  variantId = 'classic',
}: ShareResultCardProps) {
  const props = {
    data,
    footerText,
    onImageLoadEnd,
  };

  switch (variantId) {
    case 'spotlight':
      return <SpotlightCard {...props} />;
    case 'glass':
      return <GlassCard {...props} />;
    case 'poster':
      return <PosterCard {...props} />;
    case 'receipt':
      return <ReceiptCard {...props} />;
    case 'radar':
      return <RadarCard {...props} />;
    default:
      return <ClassicCard {...props} />;
  }
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
  footnote: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  footerPanel: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    gap: 12,
    padding: 16,
  },
  glassBottomPanel: {
    marginTop: 14,
  },
  glassCard: {
    backgroundColor: '#E8F6F2',
    gap: 14,
  },
  glassGlow: {
    borderRadius: 999,
    height: 220,
    position: 'absolute',
    right: -40,
    top: -80,
    width: 220,
  },
  glassPanel: {
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
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
  posterBand: {
    borderRadius: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  posterBandText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  posterBody: {
    flexDirection: 'row',
    gap: 16,
  },
  posterCard: {
    gap: 18,
  },
  posterFooter: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    gap: 12,
    padding: 16,
  },
  posterOrbColumn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterTextColumn: {
    flex: 1,
    gap: 8,
  },
  productName: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 32,
  },
  radarCard: {
    gap: 18,
  },
  radarCompany: {
    color: '#C6D4DB',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 6,
  },
  radarHeader: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'space-between',
  },
  radarLabel: {
    color: '#7DB9CA',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  radarList: {
    backgroundColor: '#1B2A35',
    borderRadius: 22,
    gap: 12,
    padding: 16,
  },
  radarMetricCard: {
    backgroundColor: '#1B2A35',
    borderRadius: 18,
    flex: 1,
    gap: 8,
    padding: 14,
  },
  radarMetricGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  radarMetricLabel: {
    color: '#A6BBC4',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  radarMetricValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  radarMetricValueSmall: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  radarName: {
    color: colors.surface,
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 32,
    marginTop: 8,
  },
  receiptBrand: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  receiptCard: {
    backgroundColor: '#FFFDF8',
    gap: 12,
  },
  receiptCompany: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
  receiptDivider: {
    backgroundColor: '#E2D6C1',
    height: 1,
    marginVertical: 6,
  },
  receiptLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  receiptName: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 34,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  receiptRowTop: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
  },
  receiptValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  receiptVerdict: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  receiptVerdictBlock: {
    flex: 1,
  },
  scoreOrb: {
    alignItems: 'center',
    borderRadius: 999,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  scoreOrbContent: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 1,
  },
  scoreOrbFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  scoreOrbImage: {
    borderRadius: 999,
  },
  scoreOrbMedia: {
    ...StyleSheet.absoluteFillObject,
  },
  scoreOrbOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7, 13, 12, 0.26)',
  },
  scoreSuffix: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '700',
    marginTop: -4,
  },
  scoreValue: {
    color: colors.surface,
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 38,
  },
  scoreValueCompact: {
    fontSize: 28,
    lineHeight: 32,
  },
  sectionLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  spotlightBrand: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  spotlightCard: {
    gap: 16,
  },
  spotlightCompany: {
    color: 'rgba(255,255,255,0.76)',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  spotlightGrade: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '800',
  },
  spotlightHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  spotlightName: {
    color: colors.surface,
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 38,
    textAlign: 'center',
  },
  spotlightOrbWrap: {
    alignItems: 'center',
  },
  spotlightPanel: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 22,
    gap: 12,
    padding: 16,
  },
  spotlightVerdict: {
    color: colors.surface,
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
  },
  tag: {
    backgroundColor: colors.surface,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: '100%',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tagText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  verdictLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  verdictText: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 23,
  },
});
