"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { getStore, type GleamStore } from "@/lib/store";

export function useStore(): GleamStore {
  return getStore();
}

/** Re-renders when the store mutates. Returns the raw persisted snapshot. */
export function useStoreSnapshot() {
  const store = getStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}

/** True only after the component has mounted on the client. */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}

/**
 * Run an async store query, re-running whenever the store mutates or `deps`
 * change. Shaped like a tiny data-fetching hook.
 */
export function useStoreQuery<T>(
  fn: (store: GleamStore) => Promise<T> | T,
  deps: unknown[] = [],
): { data: T | undefined; loading: boolean; refetch: () => void } {
  const store = getStore();
  const snapshot = useStoreSnapshot();
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.resolve(fn(store)).then((res) => {
      if (alive) {
        setData(res);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, snapshot, nonce, ...deps]);

  return { data, loading, refetch };
}
