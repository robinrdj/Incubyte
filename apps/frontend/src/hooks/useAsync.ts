import { useCallback, useEffect, useRef, useState } from "react";

export interface AsyncState<T> {
  data: T | undefined;
  error: unknown;
  loading: boolean;
  reload: () => void;
}

/** Loads when the arguments change; a stale response never overwrites a newer one. */
export function useAsync<T, Args extends readonly unknown[]>(
  loader: (...args: Args) => Promise<T>,
  args: Args,
): AsyncState<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const latestLoader = useRef(loader);
  latestLoader.current = loader;

  // Compared by value, so callers can pass fresh arrays and objects.
  const key = JSON.stringify(args);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const parsedArgs = JSON.parse(key) as Args;
    latestLoader
      .current(...parsedArgs)
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(caught);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [key, version]);

  const reload = useCallback(() => {
    setVersion((v) => v + 1);
  }, []);

  return { data, error, loading, reload };
}
