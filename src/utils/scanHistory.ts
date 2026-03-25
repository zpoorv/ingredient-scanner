import { DEFAULT_DIET_PROFILE_ID, type DietProfileId } from '../constants/dietProfiles';
import type { HealthScoreGrade } from '../constants/productHealthScore';
import type { ResolvedProduct } from '../types/product';
import { formatProductName } from './productDisplay';
import { highlightIngredients } from './ingredientHighlighting';
import { analyzeProduct } from './productInsights';
import { isLikelyFoodProduct } from './productType';

export type ScanHistoryRiskLevel = 'safe' | 'caution' | 'high-risk';

export type ScanHistorySnapshot = {
  gradeLabel: HealthScoreGrade | null;
  name: string;
  profileId: DietProfileId;
  riskLevel: ScanHistoryRiskLevel;
  riskSummary: string;
  score: number | null;
};

export function buildScanHistorySnapshot(
  product: ResolvedProduct,
  profileId: DietProfileId = DEFAULT_DIET_PROFILE_ID
): ScanHistorySnapshot {
  const displayName = formatProductName(product.name);

  if (!isLikelyFoodProduct(product)) {
    return {
      gradeLabel: null,
      name: displayName,
      profileId,
      riskLevel: 'safe',
      riskSummary: 'Not scored because this does not appear to be a food item',
      score: null,
    };
  }

  const insights = analyzeProduct(product, profileId);
  const ingredientFlags = highlightIngredients(product.ingredientsText);
  const highRiskCount = ingredientFlags.filter(
    (ingredient) => ingredient.risk === 'high-risk'
  ).length;
  const cautionCount = ingredientFlags.filter(
    (ingredient) => ingredient.risk === 'caution'
  ).length;

  if (highRiskCount > 0) {
    return {
      gradeLabel: insights.gradeLabel,
      name: displayName,
      profileId,
      riskLevel: 'high-risk',
      riskSummary: `${highRiskCount} high-risk ingredient flag${highRiskCount > 1 ? 's' : ''}`,
      score: insights.smartScore,
    };
  }

  if (cautionCount > 0) {
    return {
      gradeLabel: insights.gradeLabel,
      name: displayName,
      profileId,
      riskLevel: 'caution',
      riskSummary: `${cautionCount} caution ingredient flag${cautionCount > 1 ? 's' : ''}`,
      score: insights.smartScore,
    };
  }

  if (insights.cautions.length > 0) {
    return {
      gradeLabel: insights.gradeLabel,
      name: displayName,
      profileId,
      riskLevel: 'caution',
      riskSummary: insights.cautions[0],
      score: insights.smartScore,
    };
  }

  return {
    gradeLabel: insights.gradeLabel,
    name: displayName,
    profileId,
    riskLevel: 'safe',
    riskSummary: 'No major ingredient flags detected',
    score: insights.smartScore,
  };
}
