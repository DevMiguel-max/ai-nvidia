"use client";
import { useCallback, useEffect, useState } from "react";

/** Returns [value, setValue, hydrated]. `hydrated` flips true once the
 *  client has read from localStorage — use it to avoid rendering
 *  server/client-mismatched content before then. */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {
      // Corrupted or inaccessible storage — fall back to initialValue.
    } finally {
      setHydrated(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        try {
          window.localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          // Storage full or unavailable; in-memory state still updates.
        }
        return resolved;
      });
    },
    [key]
  );

  return [value, update, hydrated] as const;
}
