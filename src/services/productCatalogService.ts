import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  query,
  setDoc,
  where,
} from 'firebase/firestore';

import type { ProductOverrideRecord } from '../models/productOverride';
import type { ResolvedProduct } from '../types/product';
import { getFirebaseAppInstance } from './firebaseApp';

const MAX_SEARCH_KEYWORDS = 80;

function getDb() {
  return getFirestore(getFirebaseAppInstance());
}

function getProductsCollectionRef() {
  return collection(getDb(), 'products');
}

function getProductDocRef(barcode: string) {
  return doc(getDb(), 'products', barcode);
}

export function normalizeProductSearchValue(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function addKeywordVariants(keywords: Set<string>, value: string) {
  const normalizedValue = normalizeProductSearchValue(value);

  if (!normalizedValue) {
    return;
  }

  keywords.add(normalizedValue);

  for (let index = 2; index <= Math.min(normalizedValue.length, 32); index += 1) {
    keywords.add(normalizedValue.slice(0, index));
  }

  normalizedValue
    .split(' ')
    .filter(Boolean)
    .forEach((part) => {
      for (let index = 2; index <= Math.min(part.length, 20); index += 1) {
        keywords.add(part.slice(0, index));
      }
    });
}

export function buildProductSearchKeywords(value: string, extraValues: string[] = []) {
  const keywords = new Set<string>();

  addKeywordVariants(keywords, value);
  extraValues.forEach((item) => addKeywordVariants(keywords, item));

  return [...keywords].slice(0, MAX_SEARCH_KEYWORDS);
}

function rankStoredProductRecord(
  queryText: string,
  product: ProductOverrideRecord
) {
  const name =
    normalizeProductSearchValue(product.productNameSearch || product.product_name || product.name || '');
  const brand = normalizeProductSearchValue(product.brand || '');
  const barcode = normalizeProductSearchValue(product.code || product.barcode || '');
  let score = 0;

  if (barcode === queryText) {
    score += 120;
  } else if (barcode.startsWith(queryText)) {
    score += 90;
  }

  if (name === queryText) {
    score += 100;
  } else if (name.startsWith(queryText)) {
    score += 80;
  } else if (name.includes(queryText)) {
    score += 45;
  }

  if (brand === queryText) {
    score += 65;
  } else if (brand.startsWith(queryText)) {
    score += 50;
  } else if (brand.includes(queryText)) {
    score += 30;
  }

  return score;
}

export async function loadStoredProductRecord(barcode: string) {
  try {
    const snapshot = await getDoc(getProductDocRef(barcode));

    if (!snapshot.exists()) {
      return null;
    }

    return {
      barcode,
      ...snapshot.data(),
    } as ProductOverrideRecord;
  } catch {
    return null;
  }
}

export async function searchStoredProductRecords(queryText: string, resultLimit = 16) {
  const normalizedQuery = normalizeProductSearchValue(queryText);

  if (normalizedQuery.length < 2) {
    return [];
  }

  try {
    const snapshot = await getDocs(
      query(
        getProductsCollectionRef(),
        where('searchKeywords', 'array-contains', normalizedQuery),
        limit(resultLimit)
      )
    );

    return snapshot.docs
      .map(
        (item) =>
          ({
            barcode: item.id,
            ...item.data(),
          }) as ProductOverrideRecord
      )
      .sort(
        (left, right) =>
          rankStoredProductRecord(normalizedQuery, right) -
          rankStoredProductRecord(normalizedQuery, left)
      );
  } catch {
    return [];
  }
}

export async function loadFeaturedProductRecords(resultLimit = 24) {
  try {
    const snapshot = await getDocs(
      query(
        getProductsCollectionRef(),
        where('isFeatured', '==', true),
        limit(resultLimit)
      )
    );

    return snapshot.docs
      .map(
        (item) =>
          ({
            barcode: item.id,
            ...item.data(),
          }) as ProductOverrideRecord
      )
      .filter(hasStoredCoreProductFields)
      .sort((left, right) => {
        const leftRank = left.featuredRank ?? Number.MAX_SAFE_INTEGER;
        const rightRank = right.featuredRank ?? Number.MAX_SAFE_INTEGER;

        if (leftRank !== rightRank) {
          return leftRank - rightRank;
        }

        return (right.updatedAt || '').localeCompare(left.updatedAt || '');
      });
  } catch {
    return [];
  }
}

function buildScannedProductPayload(
  barcode: string,
  product: ResolvedProduct
): ProductOverrideRecord {
  const productName = product.name?.trim() || `Catalog entry ${barcode}`;
  const createdAt = new Date().toISOString();

  return {
    additiveTags: product.additiveTags,
    allergens: product.allergens,
    barcode,
    brand: product.brand,
    categories: product.categories,
    code: product.code || barcode,
    createdAt,
    ecoScore: product.ecoScore,
    imageUrl: product.imageUrl,
    ingredientsText: product.ingredientsText,
    labels: product.labels,
    name: productName,
    novaGroup: product.novaGroup,
    nutrition: product.nutrition,
    nutriScore: product.nutriScore,
    product_name: productName,
    productNameSearch: normalizeProductSearchValue(productName),
    quantity: product.quantity,
    searchKeywords: buildProductSearchKeywords(productName, [
      product.brand || '',
      barcode,
      product.code || barcode,
    ]),
    sourceType: 'scan',
    updatedAt: createdAt,
  };
}

export function hasStoredCoreProductFields(product: Partial<ProductOverrideRecord>) {
  return Boolean(
    product.barcode?.trim() &&
      (product.name?.trim() || product.product_name?.trim()) &&
      (product.productNameSearch?.trim() || product.searchKeywords?.length)
  );
}

export async function saveScannedProductRecord(
  barcode: string,
  product: ResolvedProduct
) {
  try {
    const productDocRef = getProductDocRef(barcode);
    const payload = buildScannedProductPayload(barcode, product);
    const existingSnapshot = await getDoc(productDocRef);

    if (!existingSnapshot.exists()) {
      await setDoc(productDocRef, payload, {
        merge: false,
      });
      return;
    }

    const existingProduct = existingSnapshot.data() as Partial<ProductOverrideRecord>;

    if (existingProduct.sourceType === 'admin' || hasStoredCoreProductFields(existingProduct)) {
      return;
    }

    const nextPayload: ProductOverrideRecord = {
      ...payload,
      ...existingProduct,
      barcode: existingProduct.barcode?.trim() || payload.barcode,
      code: existingProduct.code?.trim() || payload.code,
      createdAt: existingProduct.createdAt?.trim() || payload.createdAt,
      name: payload.name,
      product_name: payload.product_name,
      productNameSearch: payload.productNameSearch,
      searchKeywords: payload.searchKeywords,
      sourceType: 'scan',
      updatedAt: payload.updatedAt,
    };

    await setDoc(
      productDocRef,
      nextPayload,
      { merge: false }
    );
  } catch (error) {
    if (__DEV__) {
      console.warn('[productCatalogService] Failed to save scanned product record', error);
    }
  }
}
