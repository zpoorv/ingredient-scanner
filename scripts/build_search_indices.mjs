import { createGunzip } from 'node:zlib';
import readline from 'node:readline';
import { Readable } from 'node:stream';

import admin from 'firebase-admin';
import { algoliasearch } from 'algoliasearch';

const DEFAULT_OFF_DATASET_URL =
  'https://static.openfoodfacts.org/data/openfoodfacts-products.jsonl.gz';
const SEARCH_INDEX_MAX_PRODUCTS = Number(process.env.SEARCH_INDEX_MAX_PRODUCTS || '250000');

function getRequiredEnv(name) {
  const value = process.env[name];

  if (!value?.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value.trim();
}

function normalizeList(value) {
  if (!value) {
    return [];
  }

  const rawList = Array.isArray(value) ? value : String(value).split(',');
  return rawList.map((item) => String(item).trim()).filter(Boolean);
}

function normalizeGrade(value) {
  if (!value) {
    return null;
  }

  const grade = String(value).trim();
  return grade ? grade.toUpperCase() : null;
}

function buildNutrition(product) {
  const nutriments = product.nutriments ?? {};

  return {
    calories100g: nutriments['energy-kcal_100g'] ?? null,
    carbohydrates100g: nutriments.carbohydrates_100g ?? null,
    fat100g: nutriments.fat_100g ?? null,
    fiber100g: nutriments.fiber_100g ?? null,
    potassium100g: nutriments.potassium_100g ?? null,
    protein100g: nutriments.proteins_100g ?? null,
    salt100g: nutriments.salt_100g ?? null,
    saturatedFat100g: nutriments['saturated-fat_100g'] ?? null,
    sodium100g: nutriments.sodium_100g ?? null,
    sugar100g: nutriments.sugars_100g ?? null,
  };
}

function buildBaseDocument(product) {
  const barcode = String(product.code || '').trim();
  const name =
    String(
      product.product_name ||
        product.product_name_en ||
        product.generic_name ||
        product.generic_name_en ||
        ''
    ).trim();

  if (!barcode || !name) {
    return null;
  }

  const brand = String(product.brands || '').trim() || null;
  const categories = normalizeList(product.categories || product.categories_tags);
  const labels = normalizeList(product.labels || product.labels_tags);

  return {
    adminMetadata: null,
    allergens: normalizeList(
      product.allergens_from_ingredients || product.allergens || product.allergens_tags
    ),
    barcode,
    brand,
    categories,
    code: barcode,
    ecoScore: normalizeGrade(product.ecoscore_grade),
    id: barcode,
    imageUrl:
      String(product.image_front_url || product.image_front_small_url || '').trim() || null,
    ingredientsText:
      String(product.ingredients_text || product.ingredients_text_en || '').trim() || null,
    labels,
    name,
    novaGroup: typeof product.nova_group === 'number' ? product.nova_group : null,
    nutrition: buildNutrition(product),
    nutriScore: normalizeGrade(product.nutriscore_grade || product.nutrition_grades),
    objectID: barcode,
    popularity: Number(product.unique_scans_n || 0),
    quantity: String(product.quantity || '').trim() || null,
    searchableAliases: [name, brand, ...categories, ...labels].filter(Boolean),
  };
}

function buildAdminMetadata(override) {
  return {
    adminPriorityScore: override.adminPriorityScore ?? null,
    customGradeLabel: override.adminGradeLabel ?? null,
    customScore: override.adminScore ?? null,
    customSummary: override.adminSummary?.trim() || null,
    customVerdict: override.adminVerdict?.trim() || null,
    hasCustomAlternatives: Array.isArray(override.healthierAlternatives),
    hasManagedData: true,
    healthierAlternatives: Array.isArray(override.healthierAlternatives)
      ? override.healthierAlternatives
      : [],
    notes: override.notes?.trim() || null,
    reviewBadgeCopy: override.reviewBadgeCopy?.trim() || null,
    reviewStatus: override.reviewStatus ?? null,
    sourceNote: override.sourceNote?.trim() || null,
    updatedAt: override.updatedAt?.trim() || null,
  };
}

function mergeOverrideDocument(baseDocument, override) {
  const barcode = String(override.barcode || baseDocument?.barcode || '').trim();

  if (!barcode) {
    return baseDocument;
  }

  const mergedDocument = {
    ...(baseDocument ?? {
      adminMetadata: null,
      allergens: [],
      barcode,
      brand: null,
      categories: [],
      code: barcode,
      ecoScore: null,
      id: barcode,
      imageUrl: null,
      ingredientsText: null,
      labels: [],
      name: `Catalog entry ${barcode}`,
      novaGroup: null,
      nutrition: {},
      nutriScore: null,
      objectID: barcode,
      popularity: 0,
      quantity: null,
      searchableAliases: [],
    }),
    adminMetadata: buildAdminMetadata(override),
    allergens: normalizeList(override.allergens).length
      ? normalizeList(override.allergens)
      : baseDocument?.allergens ?? [],
    barcode,
    brand: override.brand?.trim() || baseDocument?.brand || null,
    categories: normalizeList(override.categories).length
      ? normalizeList(override.categories)
      : baseDocument?.categories ?? [],
    code: barcode,
    id: barcode,
    imageUrl: override.imageUrl?.trim() || baseDocument?.imageUrl || null,
    ingredientsText:
      override.ingredientsText?.trim() || baseDocument?.ingredientsText || null,
    labels: normalizeList(override.labels).length
      ? normalizeList(override.labels)
      : baseDocument?.labels ?? [],
    name: override.name?.trim() || baseDocument?.name || `Catalog entry ${barcode}`,
    nutrition: override.nutrition ?? baseDocument?.nutrition ?? {},
    objectID: barcode,
    quantity: override.quantity?.trim() || baseDocument?.quantity || null,
  };

  mergedDocument.searchableAliases = [
    mergedDocument.name,
    mergedDocument.brand,
    ...mergedDocument.categories,
    ...mergedDocument.labels,
  ].filter(Boolean);

  return mergedDocument;
}

function pushTopDocument(heap, document) {
  heap.push(document);
  heap.sort((left, right) => left.popularity - right.popularity);

  if (heap.length > SEARCH_INDEX_MAX_PRODUCTS) {
    heap.shift();
  }
}

async function loadOffHeadDocuments() {
  const datasetUrl = process.env.OPEN_FOOD_FACTS_DATASET_URL || DEFAULT_OFF_DATASET_URL;
  const response = await fetch(datasetUrl);

  if (!response.ok || !response.body) {
    throw new Error(`Unable to download OFF dataset from ${datasetUrl}`);
  }

  const inputStream = datasetUrl.endsWith('.gz')
    ? Readable.fromWeb(response.body).pipe(createGunzip())
    : Readable.fromWeb(response.body);
  const lineReader = readline.createInterface({
    crlfDelay: Infinity,
    input: inputStream,
  });
  const heap = [];

  for await (const line of lineReader) {
    if (!line.trim()) {
      continue;
    }

    try {
      const document = buildBaseDocument(JSON.parse(line));

      if (document) {
        pushTopDocument(heap, document);
      }
    } catch {
      // Skip malformed rows from the public dataset.
    }
  }

  return heap.sort((left, right) => right.popularity - left.popularity);
}

async function loadOverrideDocuments() {
  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!rawServiceAccount?.trim()) {
    return [];
  }

  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(rawServiceAccount)),
    });
  }

  const snapshot = await admin.firestore().collection('products').get();
  return snapshot.docs.map((document) => ({
    barcode: document.id,
    ...document.data(),
  }));
}

function buildSuggestionDocuments(documents) {
  const suggestions = new Map();

  documents.forEach((document) => {
    [document.name, document.brand].filter(Boolean).forEach((value) => {
      const query = String(value).trim();

      if (!query) {
        return;
      }

      const key = query.toLowerCase();
      const currentScore = suggestions.get(key)?.popularity ?? 0;

      suggestions.set(key, {
        objectID: `suggestion:${key}`,
        popularity: currentScore + Math.max(document.popularity, 1),
        query,
      });
    });
  });

  return [...suggestions.values()]
    .sort((left, right) => right.popularity - left.popularity)
    .slice(0, 15000);
}

async function main() {
  const algoliaAppId = getRequiredEnv('ALGOLIA_APP_ID');
  const algoliaAdminApiKey = getRequiredEnv('ALGOLIA_ADMIN_API_KEY');
  const productsIndexName = getRequiredEnv('ALGOLIA_PRODUCTS_INDEX_NAME');
  const suggestionsIndexName = getRequiredEnv('ALGOLIA_SUGGESTIONS_INDEX_NAME');

  console.log('Loading Open Food Facts head catalog...');
  const headDocuments = await loadOffHeadDocuments();

  console.log('Loading Firestore product overrides...');
  const overrideDocuments = await loadOverrideDocuments();
  const mergedDocuments = new Map(headDocuments.map((document) => [document.barcode, document]));

  overrideDocuments.forEach((override) => {
    mergedDocuments.set(
      override.barcode,
      mergeOverrideDocument(mergedDocuments.get(override.barcode) ?? null, override)
    );
  });

  const productDocuments = [...mergedDocuments.values()];
  const suggestionDocuments = buildSuggestionDocuments(productDocuments);
  const client = algoliasearch(algoliaAppId, algoliaAdminApiKey);

  console.log(`Uploading ${productDocuments.length} product documents...`);
  await client.replaceAllObjects({
    indexName: productsIndexName,
    objects: productDocuments,
  });

  console.log(`Uploading ${suggestionDocuments.length} suggestion documents...`);
  await client.replaceAllObjects({
    indexName: suggestionsIndexName,
    objects: suggestionDocuments,
  });

  console.log('Search indices updated successfully.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
