import { useCallback, useEffect, useState } from "react";

interface AsyncState<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
}

interface AsyncResult<T> extends AsyncState<T> {
  /** Re-run the loader — lets an error state offer a retry that doesn't
   *  throw away the rest of the page. */
  reload: () => void;
}

/** Run an async loader on mount (and when `deps` change), with cancellation so
 *  a stale response can't overwrite a newer one. Used to pull catalog data from
 *  the Storefront API data layer into components. */
export function useAsyncData<T>(loader: () => Promise<T>, deps: unknown[] = []): AsyncResult<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: undefined,
    loading: true,
    error: null,
  });
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    let active = true;
    setState({ data: undefined, loading: true, error: null });
    loader()
      .then((data) => {
        if (active) setState({ data, loading: false, error: null });
      })
      .catch((err) => {
        if (active)
          setState({
            data: undefined,
            loading: false,
            error: err instanceof Error ? err : new Error(String(err)),
          });
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  return { ...state, reload };
}
