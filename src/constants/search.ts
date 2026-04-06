export const SEARCH_V2_ENABLED =
  (process.env.EXPO_PUBLIC_SEARCH_V2_ENABLED ?? 'true').toLowerCase() !== 'false';

export const SEARCH_QUERY_DEBOUNCE_MS = 90;
export const SEARCH_LOCAL_ONLY_QUERY_LENGTH = 1;
export const SEARCH_REMOTE_QUERY_LENGTH = 2;
export const SEARCH_RECENT_QUERIES_LIMIT = 8;
export const SEARCH_LOCAL_RESULTS_LIMIT = 6;
export const SEARCH_SUGGESTIONS_LIMIT = 4;
export const SEARCH_CATALOG_RESULTS_LIMIT = 12;
export const SEARCH_PREFIX_CACHE_LIMIT = 24;
export const SEARCH_PREFIX_CACHE_TTL_MS = 60_000;
export const SEARCH_NUMERIC_QUERY_PATTERN = /^\d{8,14}$/;
