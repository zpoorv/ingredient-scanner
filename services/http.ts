import { PRODUCT_API_TIMEOUT_MS } from '../constants/api';

export async function fetchJsonWithTimeout<T>(
  url: string,
  init?: RequestInit
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PRODUCT_API_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}.`);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new TypeError('Request timed out.');
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
