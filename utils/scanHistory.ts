import type { HealthScoreGrade } from '../constants/productHealthScore';
import type { ResolvedProduct } from '../services/productLookup';
import { highlightIngredients } from './ingredientHighlighting';
import { analyzeProduct } from './productInsights';

export type ScanHistoryRiskLevel = 'safe' | 'caution' | 'high-risk';

export type ScanHistorySnapshot = {
  gradeLabel: HealthScoreGrade;
  name: string;
  riskLevel: ScanHistoryRiskLevel;
  riskSummary: string;
  score: number;
};

export function buildScanHistorySnapshot(
  product: ResolvedProduct
): ScanHistorySnapshot {
  const insights = analyzeProduct(product);
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
      name: product.name,
      riskLevel: 'high-risk',
      riskSummary: `${highRiskCount} high-risk ingredient flag${highRiskCount > 1 ? 's' : ''}`,
      score: insights.smartScore,
    };
  }

  if (cautionCount > 0) {
    return {
      gradeLabel: insights.gradeLabel,
      name: product.name,
      riskLevel: 'caution',
      riskSummary: `${cautionCount} caution ingredient flag${cautionCount > 1 ? 's' : ''}`,
      score: insights.smartScore,
    };
  }

  if (insights.cautions.length > 0) {
    return {
      gradeLabel: insights.gradeLabel,
      name: product.name,
      riskLevel: 'caution',
      riskSummary: insights.cautions[0],
      score: insights.smartScore,
    };
  }

  return {
    gradeLabel: insights.gradeLabel,
    name: product.name,
    riskLevel: 'safe',
    riskSummary: 'No major ingredient flags detected',
    score: insights.smartScore,
  };
}
