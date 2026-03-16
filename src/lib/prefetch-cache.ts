// src/lib/prefetch-cache.ts
//
// Module-level cache that eagerly fetches statistics data when the app loads.
// The statistics page can consume cached promises instead of starting fresh fetches.

import apiClient from "@/lib/api/client";

interface CacheEntry<T> {
  promise: Promise<T>;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

// Cache entries are valid for 5 minutes
const CACHE_TTL_MS = 5 * 60 * 1000;

function getCacheKey(endpoint: string, params?: URLSearchParams): string {
  const qs = params?.toString() || "";
  return `${endpoint}?${qs}`;
}

/**
 * Fetch with caching — returns a cached promise if one exists and is fresh,
 * otherwise starts a new fetch and caches the promise.
 */
export function cachedFetch<T>(endpoint: string, params?: URLSearchParams): Promise<T> {
  const key = getCacheKey(endpoint, params);
  const existing = cache.get(key);

  if (existing && Date.now() - existing.timestamp < CACHE_TTL_MS) {
    return existing.promise as Promise<T>;
  }

  // Convert URLSearchParams to a plain object so axios merges them into
  // config.params.  This avoids duplicating keys that the request interceptor
  // also sets (e.g. `limit`), which caused Payload CMS to receive an array
  // value it couldn't parse and fall back to its default limit of 10.
  const paramsObj: Record<string, string> = {};
  if (params) {
    params.forEach((value, key) => {
      paramsObj[key] = value;
    });
  }

  const promise = apiClient
    .get(endpoint, { params: paramsObj })
    .then((res) => res.data as T);

  cache.set(key, { promise, timestamp: Date.now() });

  // Clean up on failure so the next request retries
  promise.catch(() => {
    cache.delete(key);
  });

  return promise;
}

/**
 * Invalidate cache entries matching a prefix (e.g. "/trades/stats").
 */
export function invalidateCache(prefix?: string) {
  if (!prefix) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

/**
 * Prefetch only the most critical data:
 *   Phase 1: Current month stats (the default view on Statistics tab)
 *
 * Trades list is fetched on-demand by TradesTable via cachedFetch,
 * so we don't need to eagerly load all trades on boot.
 */
export function prefetchAll() {
  const today = new Date();
  const pad2 = (n: number) => String(n).padStart(2, "0");
  const year = today.getFullYear();
  const startDate = `${year}-${pad2(today.getMonth() + 1)}-01`;
  const endDate = `${year}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`;

  // Only prefetch current month stats — the most likely first view
  const monthParams = new URLSearchParams();
  monthParams.append("startDate", startDate);
  monthParams.append("endDate", endDate);
  cachedFetch("/trades/stats", monthParams);
}
