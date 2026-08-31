"use client";

import { useState, useEffect } from "react";

/**
 * Factory for hooks that fetch a JSON endpoint once per page load and share
 * the result across all consumers via a module-level cache.
 *
 * - `pick` extracts the value from the response JSON; returning null means
 *   "invalid/empty" — the hook then yields null (callers apply their own
 *   fallback) WITHOUT caching it, so the next mount retries the fetch.
 * - Concurrent mounts share one in-flight request.
 */
export function createCachedFetchHook<T>(
  url: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pick: (json: any) => T | null
) {
  let cached: T | null = null;
  let inFlight: Promise<T | null> | null = null;

  function load(): Promise<T | null> {
    if (cached !== null) return Promise.resolve(cached);
    if (inFlight) return inFlight;

    inFlight = fetch(url, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        inFlight = null;
        const data = json === null ? null : pick(json);
        // Failures/empty results are not cached — retried on next mount
        if (data !== null) cached = data;
        return data;
      })
      .catch(() => {
        inFlight = null;
        return null;
      });

    return inFlight;
  }

  return function useCachedFetch(): { data: T | null; loaded: boolean } {
    const [data, setData] = useState<T | null>(cached);
    const [loaded, setLoaded] = useState(cached !== null);

    useEffect(() => {
      load().then((d) => {
        setData(d);
        setLoaded(true);
      });
    }, []);

    return { data, loaded };
  };
}
