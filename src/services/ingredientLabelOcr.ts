import Constants from 'expo-constants';
import {
  SaveFormat,
  manipulateAsync,
} from 'expo-image-manipulator';
import type { Block } from '@infinitered/react-native-mlkit-text-recognition';

import { harmfulIngredientRules } from '../constants/harmfulIngredients';
import { mockIngredientExplanations } from '../constants/ingredientExplanations';

export class IngredientLabelOcrError extends Error {
  kind: 'no-ingredients' | 'no-text' | 'unsupported';

  constructor(kind: 'no-ingredients' | 'no-text' | 'unsupported', message: string) {
    super(message);
    this.kind = kind;
    this.name = 'IngredientLabelOcrError';
  }
}

export type IngredientLabelImageInput = {
  height?: number | null;
  uri: string;
  width?: number | null;
};

export type IngredientLabelOcrResult = {
  ingredientsText: string;
  qualityNotes: string[];
  rawText: string;
  sourceImageUri: string;
};

type IngredientCandidate = {
  score: number;
  source: 'heading' | 'paragraph' | 'region' | 'window';
  text: string;
};

type ImageVariant = {
  height: number | null;
  note: string | null;
  source: 'full' | 'overlay-crop' | 'tight-crop';
  uri: string;
  width: number | null;
};

type OrderedLine = {
  height: number;
  left: number;
  text: string;
  top: number;
  width: number;
};

type RecognitionPassResult = {
  candidate: IngredientCandidate | null;
  qualityNotes: string[];
  rawText: string;
  variant: ImageVariant;
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
const STRONG_INGREDIENT_CANDIDATE_SCORE = 34;

const ingredientDictionary = [...new Set([
  ...OCR_INGREDIENT_SIGNAL_KEYWORDS,
  ...harmfulIngredientRules.flatMap((rule) => [rule.label, ...rule.keywords]),
  ...mockIngredientExplanations.flatMap((entry) => [entry.name, ...entry.aliases]),
  'palm oil',
  'vegetable oil',
  'sunflower oil',
  'milk solids',
  'flavouring',
  'flavourings',
  'flavoring',
  'flavorings',
  'iodised salt',
  'iodized salt',
  'acidity regulator',
  'acidity regulators',
  'stabilizers',
  'stabilisers',
  'permitted class ii preservative',
  'white pepper powder',
])].map((entry) => ({
  canonical: cleanupOcrText(entry.toLowerCase()),
  normalized: normalizeDictionaryEntry(entry),
  wordCount: entry.trim().split(/\s+/).length,
}));

function cleanupOcrText(value: string) {
  return value
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/-\s*\n\s*/g, '')
    .replace(/[•·]/g, ', ')
    .replace(/\s*\|\s*/g, ' ')
    .replace(/[|]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .replace(/\s*;\s*/g, ', ')
    .trim()
    .replace(/^[,.:;\s]+|[,.:;\s]+$/g, '');
}

function normalizeDictionaryEntry(value: string) {
  return cleanupOcrText(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeOcrSpacing(value: string) {
  return cleanupOcrText(value)
    .replace(/\be\s*[-.]?\s*(\d{3,4}[a-z]?)\b/gi, (_match, code) => `E${String(code).toUpperCase()}`)
    .replace(/\bins\s*[-.]?\s*(\d{3,4}[a-z]?)\b/gi, (_match, code) => `INS ${String(code).toUpperCase()}`)
    .replace(/\bso dium\b/gi, 'sodium')
    .replace(/\bsoy a bean\b/gi, 'soyabean')
    .replace(/\bsoy bean\b/gi, 'soybean')
    .replace(/\bpal rn\b/gi, 'palm')
    .replace(/\bpalm oi l\b/gi, 'palm oil')
    .replace(/\bflavo ur\b/gi, 'flavour')
    .replace(/\bflavo uring\b/gi, 'flavouring')
    .replace(/\bflavo ring\b/gi, 'flavoring')
    .replace(/\bemul sifier\b/gi, 'emulsifier')
    .replace(/\bsta bilizer\b/gi, 'stabilizer')
    .replace(/\bsta biliser\b/gi, 'stabiliser')
    .replace(/\baci dity\b/gi, 'acidity')
    .replace(/\bingredie nts\b/gi, 'ingredients')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitIngredientChunks(value: string) {
  return value
    .split(/,(?![^()]*\))/)
    .map((chunk) => cleanupOcrText(chunk))
    .filter(Boolean);
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

function levenshteinDistance(left: string, right: string) {
  if (left === right) {
    return 0;
  }

  const leftLength = left.length;
  const rightLength = right.length;

  if (leftLength === 0) {
    return rightLength;
  }

  if (rightLength === 0) {
    return leftLength;
  }

  const previousRow = Array.from({ length: rightLength + 1 }, (_, index) => index);
  const currentRow = new Array<number>(rightLength + 1).fill(0);

  for (let leftIndex = 1; leftIndex <= leftLength; leftIndex += 1) {
    currentRow[0] = leftIndex;

    for (let rightIndex = 1; rightIndex <= rightLength; rightIndex += 1) {
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;

      currentRow[rightIndex] = Math.min(
        currentRow[rightIndex - 1] + 1,
        previousRow[rightIndex] + 1,
        previousRow[rightIndex - 1] + substitutionCost
      );
    }

    for (let index = 0; index < currentRow.length; index += 1) {
      previousRow[index] = currentRow[index];
    }
  }

  return previousRow[rightLength];
}

function correctIngredientChunk(chunk: string) {
  const normalizedChunk = normalizeDictionaryEntry(normalizeOcrSpacing(chunk));

  if (!normalizedChunk) {
    return cleanupOcrText(chunk);
  }

  if (
    /\d/.test(normalizedChunk) ||
    normalizedChunk.includes('(') ||
    normalizedChunk.split(' ').length > 4
  ) {
    return normalizeOcrSpacing(chunk);
  }

  let bestMatch: { canonical: string; distance: number } | null = null;
  const wordCount = normalizedChunk.split(' ').length;

  for (const entry of ingredientDictionary) {
    if (Math.abs(entry.wordCount - wordCount) > 1) {
      continue;
    }

    if (Math.abs(entry.normalized.length - normalizedChunk.length) > 6) {
      continue;
    }

    const distance = levenshteinDistance(normalizedChunk, entry.normalized);

    if (!bestMatch || distance < bestMatch.distance) {
      bestMatch = {
        canonical: entry.canonical,
        distance,
      };
    }
  }

  const maxAllowedDistance = Math.max(2, Math.floor(normalizedChunk.length * 0.18));

  if (bestMatch && bestMatch.distance <= maxAllowedDistance) {
    return bestMatch.canonical;
  }

  return normalizeOcrSpacing(chunk);
}

function correctIngredientList(value: string) {
  const correctedChunks = splitIngredientChunks(value).map(correctIngredientChunk);
  return cleanupOcrText(correctedChunks.join(', '));
}

function toOrderedLines(blocks: Block[]) {
  return blocks
    .flatMap((block) =>
      block.lines.map((line) => ({
        height: line.frame.bottom - line.frame.top,
        left: line.frame.left,
        text: line.text.trim(),
        top: line.frame.top,
        width: line.frame.right - line.frame.left,
      }))
    )
    .sort((left, right) => {
      const topDelta = left.top - right.top;
      return Math.abs(topDelta) > 8 ? topDelta : left.left - right.left;
    })
    .filter((line) => Boolean(line.text));
}

function findIngredientStartIndex(lines: OrderedLine[]) {
  return lines.findIndex((line) =>
    /ingred/i.test(line.text.replace(/\s+/g, '').toLowerCase())
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
        /^[a-z0-9)%]/i.test(normalizedLine);

      return `${combinedText}${shouldUseSpace ? ' ' : ', '}${normalizedLine}`;
    }, '')
  );
}

function scoreIngredientCandidate(value: string) {
  const cleanedCandidate = stripIngredientHeading(value);
  const correctedCandidate = correctIngredientList(cleanedCandidate);

  if (correctedCandidate.length < 18) {
    return {
      score: -100,
      source: 'window' as const,
      text: correctedCandidate,
    };
  }

  const ingredientSignalCount = countKeywordSignals(
    correctedCandidate,
    OCR_INGREDIENT_SIGNAL_KEYWORDS
  );
  const noiseSignalCount = countKeywordSignals(correctedCandidate, OCR_NOISE_KEYWORDS);
  const suspiciousTokenRatio = getSuspiciousTokenRatio(correctedCandidate);
  const alphabeticRatio = getAlphabeticRatio(correctedCandidate);
  const commaCount = (correctedCandidate.match(/,/g) || []).length;
  const tokens = correctedCandidate.split(/[\s,]+/).filter(Boolean);
  let score = 0;

  if (/ingred/i.test(value)) {
    score += 20;
  }

  score += Math.min(commaCount * 4, 16);
  score += Math.min(ingredientSignalCount * 3, 18);

  if (/%/.test(correctedCandidate)) {
    score += 6;
  }

  if (/\b(?:e|ins)\s?\d{3,4}[a-z]?\b/i.test(correctedCandidate)) {
    score += 8;
  }

  if (tokens.length >= 3 && tokens.length <= 40) {
    score += 6;
  }

  if (correctedCandidate.length >= 45) {
    score += 4;
  }

  if (correctedCandidate !== cleanedCandidate) {
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
    source: 'window' as const,
    text: correctedCandidate,
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

function collectHeadingCandidate(lines: OrderedLine[]) {
  const startIndex = findIngredientStartIndex(lines);

  if (startIndex < 0) {
    return [];
  }

  const collectedLines: string[] = [];

  for (let index = startIndex; index < lines.length; index += 1) {
    const currentLine = lines[index].text;

    if (
      index > startIndex &&
      collectedLines.length >= 2 &&
      looksLikeNonIngredientLine(currentLine)
    ) {
      break;
    }

    collectedLines.push(currentLine);
  }

  return collectedLines.length > 0 ? [joinIngredientLines(collectedLines)] : [];
}

function collectRegionCandidates(lines: OrderedLine[]) {
  const startIndex = findIngredientStartIndex(lines);

  if (startIndex < 0) {
    return [];
  }

  const headingLine = lines[startIndex];
  const collectedLines: string[] = [headingLine.text];

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const currentLine = lines[index];
    const previousLine = lines[index - 1];
    const verticalGap = currentLine.top - previousLine.top;

    if (currentLine.top - headingLine.top > headingLine.height * 14) {
      break;
    }

    if (
      collectedLines.length >= 2 &&
      (looksLikeNonIngredientLine(currentLine.text) ||
        verticalGap > Math.max(headingLine.height * 2.8, 48))
    ) {
      break;
    }

    if (currentLine.left < headingLine.left - Math.max(headingLine.width * 0.4, 40)) {
      continue;
    }

    collectedLines.push(currentLine.text);
  }

  return collectedLines.length > 0 ? [joinIngredientLines(collectedLines)] : [];
}

function collectWindowCandidates(lines: OrderedLine[]) {
  const candidates: string[] = [];

  for (let startIndex = 0; startIndex < lines.length; startIndex += 1) {
    if (STOP_SECTION_PATTERN.test(lines[startIndex].text)) {
      continue;
    }

    const collected: string[] = [];

    for (
      let index = startIndex;
      index < Math.min(startIndex + 4, lines.length);
      index += 1
    ) {
      const currentLine = lines[index].text;

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
  lines: OrderedLine[],
  rawText: string
): IngredientCandidate | null {
  const headingCandidates = collectHeadingCandidate(lines).map((candidate) => {
    const scored = scoreIngredientCandidate(candidate);
    return {
      ...scored,
      score: scored.score + 14,
      source: 'heading' as const,
    };
  });
  const regionCandidates = collectRegionCandidates(lines).map((candidate) => {
    const scored = scoreIngredientCandidate(candidate);
    return {
      ...scored,
      score: scored.score + 10,
      source: 'region' as const,
    };
  });
  const windowCandidates = collectWindowCandidates(lines).map((candidate) => ({
    ...scoreIngredientCandidate(candidate),
    source: 'window' as const,
  }));
  const paragraphCandidates = collectParagraphCandidates(rawText).map((candidate) => {
    const scored = scoreIngredientCandidate(candidate);
    return {
      ...scored,
      score: scored.score - 4,
      source: 'paragraph' as const,
    };
  });
  const uniqueCandidates = new Map<string, IngredientCandidate>();

  for (const candidate of [
    ...headingCandidates,
    ...regionCandidates,
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
  candidateScore: number,
  variantNote: string | null
) {
  const qualityNotes: string[] = [];

  if (variantNote) {
    qualityNotes.push(variantNote);
  }

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
      'Try keeping the ingredient lines larger inside the capture box and reduce glare.'
    );
  }

  return qualityNotes;
}

async function buildCropVariants(input: IngredientLabelImageInput) {
  const variants: ImageVariant[] = [];

  if (!input.width || !input.height) {
    return variants;
  }

  const cropSpecs = [
    {
      heightRatio: 0.58,
      note: 'We retried OCR on a center crop around the ingredient area.',
      source: 'overlay-crop' as const,
      widthRatio: 0.84,
      xRatio: 0.08,
      yRatio: 0.18,
    },
    {
      heightRatio: 0.48,
      note: 'We retried OCR on a tighter crop because the first pass looked noisy.',
      source: 'tight-crop' as const,
      widthRatio: 0.76,
      xRatio: 0.12,
      yRatio: 0.22,
    },
  ];

  for (const spec of cropSpecs) {
    const cropWidth = Math.max(200, Math.round(input.width * spec.widthRatio));
    const cropHeight = Math.max(200, Math.round(input.height * spec.heightRatio));
    const cropX = Math.max(0, Math.round(input.width * spec.xRatio));
    const cropY = Math.max(0, Math.round(input.height * spec.yRatio));

    const result = await manipulateAsync(
      input.uri,
      [
        {
          crop: {
            height: Math.min(cropHeight, input.height - cropY),
            originX: cropX,
            originY: cropY,
            width: Math.min(cropWidth, input.width - cropX),
          },
        },
      ],
      {
        compress: 1,
        format: SaveFormat.JPEG,
      }
    );

    variants.push({
      height: result.height,
      note: spec.note,
      source: spec.source,
      uri: result.uri,
      width: result.width,
    });
  }

  return variants;
}

async function runRecognitionPass(
  variant: ImageVariant,
  recognizeText: typeof import('@infinitered/react-native-mlkit-text-recognition')['recognizeText']
): Promise<RecognitionPassResult | null> {
  const recognizedText = await recognizeText(variant.uri);
  const rawText = normalizeOcrSpacing(recognizedText.text?.trim() || '');

  if (!rawText) {
    return null;
  }

  const orderedLines = toOrderedLines(recognizedText.blocks || []);
  const ingredientCandidate = parseIngredientSection(orderedLines, rawText);

  return {
    candidate: ingredientCandidate,
    qualityNotes: ingredientCandidate
      ? buildQualityNotes(rawText, ingredientCandidate.text, ingredientCandidate.score, variant.note)
      : [],
    rawText,
    variant,
  };
}

function isRunningInExpoGo() {
  const executionEnvironment = Constants.executionEnvironment;
  const appOwnership = (Constants as typeof Constants & {
    appOwnership?: string;
  }).appOwnership;

  return executionEnvironment === 'storeClient' || appOwnership === 'expo';
}

export async function recognizeIngredientLabelImage(
  input: IngredientLabelImageInput
): Promise<IngredientLabelOcrResult> {
  try {
    if (isRunningInExpoGo()) {
      throw new IngredientLabelOcrError(
        'unsupported',
        'OCR is not available in Expo Go. Use a development build with native OCR support to scan ingredient labels.'
      );
    }

    const { recognizeText } = await import(
      '@infinitered/react-native-mlkit-text-recognition'
    );
    const passResults: RecognitionPassResult[] = [];
    const fullImageResult = await runRecognitionPass(
      {
        height: input.height ?? null,
        note: null,
        source: 'full',
        uri: input.uri,
        width: input.width ?? null,
      },
      recognizeText
    );

    if (fullImageResult) {
      passResults.push(fullImageResult);
    }

    const shouldRetryOnCrops =
      !fullImageResult?.candidate ||
      fullImageResult.candidate.score < STRONG_INGREDIENT_CANDIDATE_SCORE;

    if (shouldRetryOnCrops) {
      const cropVariants = await buildCropVariants(input);

      for (const variant of cropVariants) {
        const result = await runRecognitionPass(variant, recognizeText);

        if (!result) {
          continue;
        }

        passResults.push(result);

        if (result.candidate && result.candidate.score >= STRONG_INGREDIENT_CANDIDATE_SCORE) {
          break;
        }
      }
    }

    if (passResults.length === 0) {
      throw new IngredientLabelOcrError(
        'no-text',
        'No text was detected. Move closer, avoid glare, and keep the ingredient block filling most of the capture box.'
      );
    }

    const bestResult = passResults
      .filter((result) => result.candidate)
      .sort((left, right) => {
        const leftScore = left.candidate?.score ?? -1000;
        const rightScore = right.candidate?.score ?? -1000;

        if (rightScore !== leftScore) {
          return rightScore - leftScore;
        }

        return (right.candidate?.text.length ?? 0) - (left.candidate?.text.length ?? 0);
      })[0];

    if (!bestResult?.candidate) {
      throw new IngredientLabelOcrError(
        'no-ingredients',
        'We found text, but it still does not look enough like an ingredient list. Keep only the ingredient lines inside the capture box and try again.'
      );
    }

    return {
      ingredientsText: bestResult.candidate.text,
      qualityNotes: bestResult.qualityNotes,
      rawText: bestResult.rawText,
      sourceImageUri: input.uri,
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
