import { getAuthSession } from '../store';
import {
  SEARCH_CATALOG_RESULTS_LIMIT,
  SEARCH_REMOTE_QUERY_LENGTH,
  SEARCH_SUGGESTIONS_LIMIT,
  SEARCH_V2_ENABLED,
} from '../constants/search';
import type { SearchProductDocument, SearchSuggestion } from '../models/search';

type AlgoliaProductHit = SearchProductDocument & {
  objectID?: string;
  __position?: number;
};

type AlgoliaSuggestionHit = {
  objectID?: string;
  popularity?: number;
  query?: string;
};

type AlgoliaSearchResult<T> = {
  hits?: T[];
  queryID?: string;
};

type AlgoliaMultiSearchResponse = {
  results?: [AlgoliaSearchResult<AlgoliaProductHit>, AlgoliaSearchResult<AlgoliaSuggestionHit>];
};

const ALGOLIA_APP_ID = process.env.EXPO_PUBLIC_ALGOLIA_APP_ID ?? '';
const ALGOLIA_SEARCH_API_KEY = process.env.EXPO_PUBLIC_ALGOLIA_SEARCH_API_KEY ?? '';
const ALGOLIA_PRODUCTS_INDEX_NAME =
  process.env.EXPO_PUBLIC_ALGOLIA_PRODUCTS_INDEX_NAME ?? '';
const ALGOLIA_SUGGESTIONS_INDEX_NAME =
  process.env.EXPO_PUBLIC_ALGOLIA_SUGGESTIONS_INDEX_NAME ?? '';

function getAlgoliaBaseUrl() {
  return `https://${ALGOLIA_APP_ID}-dsn.algolia.net`;
}

function getAlgoliaHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-algolia-api-key': ALGOLIA_SEARCH_API_KEY,
    'x-algolia-application-id': ALGOLIA_APP_ID,
  };
}

function normalizeArray(value: string[] | undefined | null) {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
}

function normalizeDocument(hit: AlgoliaProductHit): SearchProductDocument | null {
  const barcode = hit.barcode?.trim() || hit.code?.trim();
  const name = hit.name?.trim();

  if (!barcode || !name) {
    return null;
  }

  return {
    adminMetadata: hit.adminMetadata ?? null,
    allergens: normalizeArray(hit.allergens),
    barcode,
    brand: hit.brand?.trim() || null,
    categories: normalizeArray(hit.categories),
    code: hit.code?.trim() || barcode,
    ecoScore: hit.ecoScore?.trim() || null,
    id: hit.objectID?.trim() || hit.id || barcode,
    imageUrl: hit.imageUrl?.trim() || null,
    ingredientsText: hit.ingredientsText?.trim() || null,
    labels: normalizeArray(hit.labels),
    name,
    novaGroup: typeof hit.novaGroup === 'number' ? hit.novaGroup : null,
    nutrition: hit.nutrition ?? {},
    nutriScore: hit.nutriScore?.trim() || null,
    popularity: typeof hit.popularity === 'number' ? hit.popularity : 0,
    quantity: hit.quantity?.trim() || null,
    searchableAliases: normalizeArray(hit.searchableAliases),
  };
}

export function isAlgoliaSearchReady() {
  return (
    SEARCH_V2_ENABLED &&
    Boolean(
      ALGOLIA_APP_ID &&
        ALGOLIA_SEARCH_API_KEY &&
        ALGOLIA_PRODUCTS_INDEX_NAME &&
        ALGOLIA_SUGGESTIONS_INDEX_NAME
    )
  );
}

export async function searchAlgolia(query: string) {
  const normalizedQuery = query.trim();

  if (!isAlgoliaSearchReady() || normalizedQuery.length < SEARCH_REMOTE_QUERY_LENGTH) {
    return {
      products: [] as {
        document: SearchProductDocument;
        objectID: string | null;
        position: number | null;
      }[],
      queryId: null,
      suggestions: [] as SearchSuggestion[],
    };
  }

  const response = await fetch(`${getAlgoliaBaseUrl()}/1/indexes/*/queries`, {
    body: JSON.stringify({
      requests: [
        {
          attributesToHighlight: [],
          attributesToRetrieve: [
            'adminMetadata',
            'allergens',
            'barcode',
            'brand',
            'categories',
            'code',
            'ecoScore',
            'imageUrl',
            'ingredientsText',
            'labels',
            'name',
            'novaGroup',
            'nutrition',
            'nutriScore',
            'popularity',
            'quantity',
            'searchableAliases',
          ],
          clickAnalytics: true,
          hitsPerPage: SEARCH_CATALOG_RESULTS_LIMIT,
          indexName: ALGOLIA_PRODUCTS_INDEX_NAME,
          query: normalizedQuery,
        },
        {
          attributesToHighlight: [],
          attributesToRetrieve: ['query', 'popularity'],
          hitsPerPage: SEARCH_SUGGESTIONS_LIMIT,
          indexName: ALGOLIA_SUGGESTIONS_INDEX_NAME,
          query: normalizedQuery,
        },
      ],
    }),
    headers: getAlgoliaHeaders(),
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(`Algolia search failed with status ${response.status}`);
  }

  const payload = (await response.json()) as AlgoliaMultiSearchResponse;
  const productResult = payload.results?.[0];
  const suggestionResult = payload.results?.[1];

  return {
    products:
      productResult?.hits
        ?.flatMap((hit) => {
          const document = normalizeDocument(hit);

          if (!document) {
            return [];
          }

          return [
            {
              document,
              objectID: hit.objectID?.trim() || document.id,
              position: typeof hit.__position === 'number' ? hit.__position : null,
            },
          ] satisfies {
            document: SearchProductDocument;
            objectID: string | null;
            position: number | null;
          }[];
        }) ?? [],
    queryId: productResult?.queryID ?? null,
    suggestions:
      suggestionResult?.hits
        ?.map((hit, index) => {
          const queryValue = hit.query?.trim();

          if (!queryValue) {
            return null;
          }

          return {
            id: hit.objectID?.trim() || `algolia-suggestion:${queryValue}:${index}`,
            popularity: typeof hit.popularity === 'number' ? hit.popularity : 0,
            query: queryValue,
            sourceLabel: 'algolia',
            type: 'suggestion' as const,
          };
        })
        .filter((value): value is SearchSuggestion => Boolean(value)) ?? [],
  };
}

export async function recordAlgoliaProductClick(input: {
  objectID?: string | null;
  position?: number | null;
  queryId?: string | null;
}) {
  if (!isAlgoliaSearchReady() || !input.objectID || !input.queryId) {
    return;
  }

  const authSession = getAuthSession();
  const userToken = authSession.user?.id || 'guest';

  try {
    await fetch('https://insights.algolia.io/1/events', {
      body: JSON.stringify({
        events: [
          {
            eventName: 'Search Result Opened',
            eventType: 'click',
            index: ALGOLIA_PRODUCTS_INDEX_NAME,
            objectIDs: [input.objectID],
            positions:
              typeof input.position === 'number' ? [input.position] : undefined,
            queryID: input.queryId,
            userToken,
          },
        ],
      }),
      headers: getAlgoliaHeaders(),
      method: 'POST',
    });
  } catch {
    // Search analytics are best-effort only.
  }
}
