"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { readCache, writeCache, TTL } from "./readCache";

export type QuerySource = "none" | "cache" | "stale" | "network";

export type UseCachedQueryResult<T> = {
  data: T | null;
  loading: boolean;
  source: QuerySource;
  error: Error | null;
  refetch: () => Promise<void>;
};

export type UseCachedQueryOptions = {
  /** How long cache counts as fresh. Default: 1 hour. */
  ttlMs?: number;
  /** Scoping key to bind cache to the signed-in user. Required to avoid cross-account leak. */
  ownerId: string | null;
  /** Skip everything until this flag flips true (e.g. wait for ownerId resolution). */
  enabled?: boolean;
};

// Stale-While-Revalidate hook over our idb-based readCache.
// Flow:
//   1. Mount: read cache; if hit, return it immediately (source="cache" or "stale").
//   2. In parallel, if online and (miss | stale | fresh-but-wanted-refresh), call fetcher.
//   3. On fetcher success: store + swap to source="network".
//   4. On online event: refetch (handled by caller listening via useOfflineQueue, or by calling refetch()).
//
// Fetcher failures are surfaced via `error`, but cached data is still returned — offline-first.
export function useCachedQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  opts: UseCachedQueryOptions
): UseCachedQueryResult<T> {
  const { ttlMs = TTL.oneHour, ownerId, enabled = true } = opts;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [source, setSource] = useState<QuerySource>("none");
  const [error, setError] = useState<Error | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const run = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);

    const cached = await readCache<T>(key, ownerId);
    if (cached) {
      setData(cached.data);
      setSource(cached.fresh ? "cache" : "stale");
    }

    const online = typeof navigator === "undefined" || navigator.onLine;
    if (!online) {
      // Offline: rely on cache. Caller should call refetch() after 'online' fires.
      setLoading(false);
      return;
    }

    try {
      const fresh = await fetcherRef.current();
      setData(fresh);
      setSource("network");
      await writeCache(key, ownerId, fresh, ttlMs);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      // Keep any cached data we already set; do not clear.
    } finally {
      setLoading(false);
    }
  }, [enabled, key, ownerId, ttlMs]);

  useEffect(() => {
    void run();
  }, [run]);

  // Refetch on online event — pairs with useOfflineQueue's sync flow.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onOnline = () => {
      void run();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [run]);

  return { data, loading, source, error, refetch: run };
}
