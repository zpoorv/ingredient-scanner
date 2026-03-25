import {
  DEFAULT_DIET_PROFILE_ID,
  type DietProfileId,
} from '../constants/dietProfiles';
import type { ResolvedProduct } from '../types/product';
import { explainIngredient } from './ingredientExplanations';
import { highlightIngredients } from './ingredientHighlighting';
import { formatProductName } from './productDisplay';
import { analyzeProduct, type ProductInsights } from './productInsights';
import { isLikelyFoodProduct } from './productType';

export type ShareableResultData = {
  companyName: string | null;
  gradeLabel: string;
  imageUrl: string | null;
  productName: string;
  score: number;
  topRiskyIngredients: string[];
  verdict: string;
};

function uniqueValues(values: (string | null | undefined)[]) {
  return Array.from(new Set(values.filter(Boolean))) as string[];
}

export function buildShareableResultData(
  product: ResolvedProduct,
  profileId: DietProfileId = DEFAULT_DIET_PROFILE_ID,
  insights: ProductInsights = analyzeProduct(product, profileId)
): ShareableResultData | null {
  if (!isLikelyFoodProduct(product)) {
    return null;
  }
  const riskyIngredients = highlightIngredients(product.ingredientsText)
    .filter((ingredient) => ingredient.risk !== 'safe')
    .sort((left, right) => {
      if (left.risk === right.risk) {
        return 0;
      }

      return left.risk === 'high-risk' ? -1 : 1;
    })
    .map((ingredient) => {
      const explanation = explainIngredient(ingredient.ingredient);

      return explanation.explanation?.name || ingredient.match?.label || ingredient.ingredient;
    });

  const topRiskyIngredients = uniqueValues(riskyIngredients).slice(0, 3);

  if (topRiskyIngredients.length === 0 && product.additiveTags.length > 0) {
    topRiskyIngredients.push(...product.additiveTags.slice(0, 3));
  }

  return {
    companyName: product.brand?.trim() || null,
    gradeLabel: insights.gradeLabel || 'N/A',
    imageUrl: product.imageUrl || null,
    productName: formatProductName(product.name),
    score: insights.smartScore ?? 0,
    topRiskyIngredients,
    verdict: insights.summary,
  };
}

export function buildShareableResultCaption(data: ShareableResultData) {
  const ingredientsLine =
    data.topRiskyIngredients.length > 0
      ? `Top watch-outs: ${data.topRiskyIngredients.join(', ')}.`
      : 'No major ingredient flags were highlighted in this quick scan.';
  const companyLine = data.companyName ? `Brand: ${data.companyName}\n` : '';

  return `${data.productName}\n${companyLine}Score: ${data.score}/100 • Grade ${data.gradeLabel}\n${ingredientsLine}\nVerdict: ${data.verdict}`;
}
