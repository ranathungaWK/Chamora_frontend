/**
 * apiCache.ts
 *
 * A lightweight, zero-dependency in-memory cache for API responses.
 *
 * The cache lives at module scope — outside any React component — so it
 * persists across route changes. When the user navigates back to a page
 * the data is returned instantly from cache instead of re-fetching.
 *
 * Rules:
 *  - Only GET requests are cached.
 *  - Mutation responses (POST/PATCH/DELETE) should call invalidateCache()
 *    afterwards to ensure the next read gets fresh data.
 *  - Call clearAllCache() on logout to prevent stale data leaking between
 *    user sessions.
 */

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

const DEFAULT_TTL_MS = 60_000; // 60 seconds

/**
 * Drop-in replacement for fetch() for GET requests.
 * Returns cached data if available and not expired; otherwise performs a
 * real fetch, stores the JSON result, and returns it.
 *
 * For non-GET requests, falls back to a plain fetch (no caching).
 */
export async function cachedFetch(
  url: string,
  options?: RequestInit,
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<Response> {
  const method = (options?.method ?? 'GET').toUpperCase();

  // Only cache GET requests
  if (method !== 'GET') {
    return fetch(url, options);
  }

  const cacheKey = url;
  const now = Date.now();
  const entry = cache.get(cacheKey);

  if (entry && entry.expiresAt > now) {
    // Return a synthetic Response wrapping the cached data
    return new Response(JSON.stringify(entry.data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Cache miss — perform real fetch
  const response = await fetch(url, options);

  if (response.ok) {
    const cloned = response.clone();
    const data = await cloned.json();
    cache.set(cacheKey, { data, expiresAt: now + ttlMs });
  }

  return response;
}

/**
 * Invalidates all cache entries whose key contains the given pattern string.
 * Use after mutations to ensure the next read returns fresh data.
 *
 * @example
 *   invalidateCache('/api/v1/anomaly-configs');
 *   // Clears all cached endpoints that contain that substring
 */
export function invalidateCache(urlPattern: string): void {
  for (const key of cache.keys()) {
    if (key.includes(urlPattern)) {
      cache.delete(key);
    }
  }
}

/**
 * Clears the entire cache. Call this on user logout.
 */
export function clearAllCache(): void {
  cache.clear();
}
