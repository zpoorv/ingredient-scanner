import AsyncStorage from '@react-native-async-storage/async-storage/lib/commonjs/index';

import { SEARCH_RECENT_QUERIES_LIMIT } from '../constants/search';
import { getAuthSession } from '../store';

const RECENT_SEARCH_STORAGE_KEY_PREFIX = 'inqoura/recent-searches/v1';

function getScopeId() {
  const sessionUser = getAuthSession().user;
  return sessionUser ? `user:${sessionUser.id}` : 'guest';
}

function getStorageKey() {
  return `${RECENT_SEARCH_STORAGE_KEY_PREFIX}/${getScopeId()}`;
}

function normalizeQuery(query: string) {
  return query.trim().replace(/\s+/g, ' ');
}

export async function loadRecentSearchQueries() {
  const rawValue = await AsyncStorage.getItem(getStorageKey());

  if (!rawValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(rawValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.filter((value): value is string => typeof value === 'string');
  } catch {
    return [];
  }
}

export async function saveRecentSearchQuery(query: string) {
  const normalizedQuery = normalizeQuery(query);

  if (!normalizedQuery) {
    return [];
  }

  const existingQueries = await loadRecentSearchQueries();
  const nextQueries = [
    normalizedQuery,
    ...existingQueries.filter(
      (value) => value.toLowerCase() !== normalizedQuery.toLowerCase()
    ),
  ].slice(0, SEARCH_RECENT_QUERIES_LIMIT);

  await AsyncStorage.setItem(getStorageKey(), JSON.stringify(nextQueries));
  return nextQueries;
}
