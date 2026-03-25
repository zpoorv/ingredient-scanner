import Constants from 'expo-constants';
import type { Block } from '@infinitered/react-native-mlkit-text-recognition';

export class IngredientLabelOcrError extends Error {
  kind: 'no-ingredients' | 'no-text' | 'unsupported';

  constructor(kind: 'no-ingredients' | 'no-text' | 'unsupported', message: string) {
    super(message);
    this.kind = kind;
    this.name = 'IngredientLabelOcrError';
  }
}

export type IngredientLabelOcrResult = {
  ingredientsText: string;
  qualityNotes: string[];
  rawText: string;
  sourceImageUri: string;
};

const STOP_SECTION_PATTERN =
  /^(nutrition|nutritional|contains|may contain|allergen|storage|direction|instruction|serving|manufactured|marketed|mktd|packed|distributed|customer care|address|batch|lot|lic|best before|expiry|net weight|net quantity|fssai|keep refrigerated|shake well|how to use|usage)/i;
const OCR_INGREDIENT_SIGNAL_KEYWORDS = [
  'water',
  'salt',
  'sugar',
  'oil',
  'soy',
  'soybean',
  'soyabean',
  'flour',
  'starch',
  'powder',
  'spice',
  'pepper',
  'garlic',
  'onion',
  'tomato',
  'milk',
  'wheat',
  'corn',
  'gum',
  'acid',
  'extract',
  'stabilizer',
  'stabiliser',
  'emulsifier',
  'emulsifiers',
  'preservative',
  'preservatives',
  'regulator',
];
const OCR_NOISE_KEYWORDS = [
  'mktd',
  'marketed',
  'manufactured',
  'customer care',
  'batch',
  'lic',
  'license',
  'fssai',
  'mrp',
  'expiry',
  'best before',
  'net weight',
  'net quantity',
  'keep refrigerated',
];
const MINIMUM_INGREDIENT_CANDIDATE_SCORE = 16;

type IngredientCandidate = {
  score: number;
  source: 'heading' | 'paragraph' | 'window';
  text: string;
};

function cleanupOcrText(value: string) {
  return value
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/-\s*\n\s*/g, '')
    .replace(/[•·]/g, ', ')
    .replace(/\s*\|\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .replace(/\s*;\s*/g, ', ')
    .trim()
    .replace(/^[,.:;\s]+|[,.:;\s]+$/g, '');
}

function toOrderedLines(blocks: Block[]) {
  return blocks
    .flatMap((block) => block.lines)
    .sort((left, right) => {
      const topDelta = left.frame.top - right.frame.top;

      return Math.abs(topDelta) > 8 ? topDelta : left.frame.left - right.frame.left;
    })
    .map((line) => line.text.trim())
    .filter(Boolean);
}

function findIngredientStartIndex(lines: string[]) {
  return lines.findIndex((line) =>
    /ingred/i.test(line.replace(/\s+/g, '').toLowerCase())
  );
}

function stripIngredientHeading(value: string) {
  return cleanupOcrText(value.replace(/^.*?ingred[^:]*[:.\-]?\s*/i, ''));
}

function joinIngredientLines(lines: string[]) {
  return cleanupOcrText(
    lines.reduce((combinedText, line) => {
      if (!combinedText) {
        return line;
      }

      const previousCharacter = combinedText.trim().slice(-1);
      const normalizedLine = line.trim();
      const shouldUseSpace =
        previousCharacter === ',' ||
        previousCharacter === '-' ||
        previousCharacter === '(' ||
        previousCharacter === '/' ||
        /^[a-z0-9)%]/.test(normalizedLine);

      return `${combinedText}${shouldUseSpace ? ' ' : ', '}${normalizedLine}`;
    }, '')
  );
}

function countKeywordSignals(value: string, keywords: string[]) {
  const normalizedValue = value.toLowerCase();

  return keywords.filter((keyword) => normalizedValue.includes(keyword)).length;
}

function getSuspiciousTokenRatio(value: string) {
  const tokens = value
    .split(/[\s,]+/)
    .map((token) => token.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    return 1;
  }

  const suspiciousTokens = tokens.filter((token) => {
    const normalizedToken = token.toLowerCase();

    if (
      normalizedToken.length <= 2 ||
      /\d/.test(normalizedToken) ||
      /\b(?:e|ins)\s?\d{3,4}[a-z]?\b/i.test(normalizedToken)
    ) {
      return false;
    }

    const lettersOnly = normalizedToken.replace(/[^a-z]/g, '');

    if (lettersOnly.length < 3) {
      return true;
    }

    return !/[aeiouy]/.test(lettersOnly);
  });

  return suspiciousTokens.length / tokens.length;
}

function getAlphabeticRatio(value: string) {
  const condensed = value.replace(/\s+/g, '');

  if (!condensed) {
    return 0;
  }

  const alphabeticCharacters = (condensed.match(/[a-z]/gi) || []).length;

  return alphabeticCharacters / condensed.length;
}

function scoreIngredientCandidate(value: string) {
  const candidate = stripIngredientHeading(value);

  if (candidate.length < 18) {
    return {
      score: -100,
      source: 'window',
      text: candidate,
    };
  }

  const ingredientSignalCount = countKeywordSignals(
    candidate,
    OCR_INGREDIENT_SIGNAL_KEYWORDS
  );
  const noiseSignalCount = countKeywordSignals(candidate, OCR_NOISE_KEYWORDS);
  const suspiciousTokenRatio = getSuspiciousTokenRatio(candidate);
  const alphabeticRatio = getAlphabeticRatio(candidate);
  const commaCount = (candidate.match(/,/g) || []).length;
  const tokens = candidate.split(/[\s,]+/).filter(Boolean);
  let score = 0;

  if (/ingred/i.test(value)) {
    score += 20;
  }

  score += Math.min(commaCount * 4, 16);
  score += Math.min(ingredientSignalCount * 3, 18);

  if (/%/.test(candidate)) {
    score += 6;
  }

  if (/\b(?:e|ins)\s?\d{3,4}[a-z]?\b/i.test(candidate)) {
    score += 8;
  }

  if (tokens.length >= 3 && tokens.length <= 40) {
    score += 6;
  }

  if (candidate.length >= 45) {
    score += 4;
  }

  score -= noiseSignalCount * 12;

  if (suspiciousTokenRatio > 0.45) {
    score -= 18;
  } else if (suspiciousTokenRatio > 0.25) {
    score -= 9;
  }

  if (alphabeticRatio < 0.6) {
    score -= 12;
  } else if (alphabeticRatio < 0.72) {
    score -= 6;
  }

  return {
    score,
    source: 'window',
    text: candidate,
  };
}

function looksLikeNonIngredientLine(value: string) {
  const normalizedValue = value.toLowerCase();
  const ingredientSignals = countKeywordSignals(
    normalizedValue,
    OCR_INGREDIENT_SIGNAL_KEYWORDS
  );
  const noiseSignals = countKeywordSignals(normalizedValue, OCR_NOISE_KEYWORDS);
  const commaCount = (normalizedValue.match(/,/g) || []).length;
  const digitCount = (normalizedValue.match(/\d/g) || []).length;

  if (STOP_SECTION_PATTERN.test(value)) {
    return true;
  }

  if (noiseSignals > 0 && ingredientSignals === 0) {
    return true;
  }

  return digitCount >= 4 && commaCount === 0 && ingredientSignals === 0;
}

function collectHeadingCandidate(lines: string[]) {
  const startIndex = findIngredientStartIndex(lines);

  if (startIndex < 0) {
    return [];
  }

  const collectedLines: string[] = [];

  for (let index = startIndex; index < lines.length; index += 1) {
    const currentLine = lines[index];

    if (
      index > startIndex &&
      collectedLines.length >= 2 &&
      looksLikeNonIngredientLine(currentLine)
    ) {
      break;
    }

    collectedLines.push(currentLine);
  }

  return collectedLines.length > 0
    ? [joinIngredientLines(collectedLines)]
    : [];
}

function collectWindowCandidates(lines: string[]) {
  const candidates: string[] = [];

  for (let startIndex = 0; startIndex < lines.length; startIndex += 1) {
    if (STOP_SECTION_PATTERN.test(lines[startIndex])) {
      continue;
    }

    const collected: string[] = [];

    for (
      let index = startIndex;
      index < Math.min(startIndex + 4, lines.length);
      index += 1
    ) {
      const currentLine = lines[index];

      if (index > startIndex && STOP_SECTION_PATTERN.test(currentLine)) {
        break;
      }

      collected.push(currentLine);
      const candidate = cleanupOcrText(collected.join(' '));

      if (candidate.length >= 18) {
        candidates.push(candidate);
      }
    }
  }

  return candidates;
}

function collectParagraphCandidates(rawText: string) {
  return rawText
    .split(/\n{2,}/)
    .map((segment) => cleanupOcrText(segment))
    .filter(Boolean)
    .filter((segment) => segment.length >= 18);
}

function parseIngredientSection(
  lines: string[],
  rawText: string
): IngredientCandidate | null {
  const headingCandidates = collectHeadingCandidate(lines).map((candidate) => ({
    ...scoreIngredientCandidate(candidate),
    score: scoreIngredientCandidate(candidate).score + 14,
    source: 'heading' as const,
  }));
  const windowCandidates = collectWindowCandidates(lines).map((candidate) => ({
    ...scoreIngredientCandidate(candidate),
    source: 'window' as const,
  }));
  const paragraphCandidates = collectParagraphCandidates(rawText).map((candidate) => ({
    ...scoreIngredientCandidate(candidate),
    score: scoreIngredientCandidate(candidate).score - 4,
    source: 'paragraph' as const,
  }));
  const uniqueCandidates = new Map<string, IngredientCandidate>();

  for (const candidate of [
    ...headingCandidates,
    ...windowCandidates,
    ...paragraphCandidates,
  ]) {
    const existingCandidate = uniqueCandidates.get(candidate.text);

    if (!existingCandidate || candidate.score > existingCandidate.score) {
      uniqueCandidates.set(candidate.text, candidate);
    }
  }

  const bestCandidate = [...uniqueCandidates.values()]
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return right.text.length - left.text.length;
    })[0];

  if (!bestCandidate || bestCandidate.score < MINIMUM_INGREDIENT_CANDIDATE_SCORE) {
    return null;
  }

  return bestCandidate;
}

function buildQualityNotes(
  rawText: string,
  ingredientsText: string,
  candidateScore: number
) {
  const qualityNotes: string[] = [];

  if (rawText.length < 80) {
    qualityNotes.push(
      'Only a small amount of text was detected. Brighter light and a steadier photo may help.'
    );
  }

  if (!/,/.test(ingredientsText) || ingredientsText.length < 40) {
    qualityNotes.push(
      'The ingredient list may be partial. Try a closer photo with the label flatter and sharper.'
    );
  }

  if (candidateScore < 28) {
    qualityNotes.push(
      'Crop tightly around the ingredient lines only for a cleaner OCR result.'
    );
  }

  return qualityNotes;
}

function isRunningInExpoGo() {
  const executionEnvironment = Constants.executionEnvironment;
  const appOwnership = (Constants as typeof Constants & {
    appOwnership?: string;
  }).appOwnership;

  return (
    executionEnvironment === 'storeClient' ||
    appOwnership === 'expo'
  );
}

export async function recognizeIngredientLabelImage(
  imageUri: string
): Promise<IngredientLabelOcrResult> {
  try {
    if (isRunningInExpoGo()) {
      throw new IngredientLabelOcrError(
        'unsupported',
        'OCR is not available in Expo Go. Use a development build with native OCR support to scan ingredient labels.'
      );
    }

    const { recognizeText } =
      require('@infinitered/react-native-mlkit-text-recognition') as typeof import('@infinitered/react-native-mlkit-text-recognition');
    const recognizedText = await recognizeText(imageUri);
    const rawText = recognizedText.text?.trim() || '';

    if (!rawText) {
      throw new IngredientLabelOcrError(
        'no-text',
        'No text was detected. Try a sharper photo with the ingredient list filling more of the frame.'
      );
    }

    const orderedLines = toOrderedLines(recognizedText.blocks || []);
    const ingredientCandidate = parseIngredientSection(orderedLines, rawText);

    if (!ingredientCandidate) {
      throw new IngredientLabelOcrError(
        'no-ingredients',
        'We found text, but it does not look enough like an ingredient list yet. Crop just the ingredients area and try again.'
      );
    }

    return {
      ingredientsText: ingredientCandidate.text,
      qualityNotes: buildQualityNotes(
        rawText,
        ingredientCandidate.text,
        ingredientCandidate.score
      ),
      rawText,
      sourceImageUri: imageUri,
    };
  } catch (error) {
    if (error instanceof IngredientLabelOcrError) {
      throw error;
    }

    throw new IngredientLabelOcrError(
      'unsupported',
      'OCR is not available in this build yet. Rebuild the app with native OCR support to use ingredient label scanning.'
    );
  }
}
