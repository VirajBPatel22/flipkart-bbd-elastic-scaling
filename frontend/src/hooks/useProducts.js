import { useCallback, useEffect, useRef, useState } from 'react';
import { getProducts } from '../services/apiClient';

/**
 * Fetches active products from the backend for a given category, and
 * exposes a loading/success/error status plus a retry() function.
 *
 * Guards against race conditions: if `category` changes again (or retry()
 * is called) before a previous request finishes, the previous request's
 * result is discarded instead of overwriting newer state.
 */
export function useProducts({ category } = {}) {
  const [state, setState] = useState({
    status: 'loading',
    products: [],
    error: null,
  });
  const [reloadToken, setReloadToken] = useState(0);

  const latestRequestId = useRef(0);

  // Fetching is synchronized with the `category`/`reloadToken` external
  // inputs, which is exactly what effects are for. Resetting to the
  // "loading" state here (rather than only after the async call resolves)
  // is intentional: it is what lets the UI show a spinner immediately when
  // the category changes or retry() is pressed.
  useEffect(() => {
    const requestId = latestRequestId.current + 1;
    latestRequestId.current = requestId;
    const controller = new AbortController();

    // oxlint-disable-next-line react/set-state-in-effect
    setState((prev) => ({ ...prev, status: 'loading', error: null }));

    getProducts({ category: category || undefined, signal: controller.signal })
      .then(({ data }) => {
        if (latestRequestId.current !== requestId) return;
        setState({ status: 'success', products: data, error: null });
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;
        if (latestRequestId.current !== requestId) return;
        setState({ status: 'error', products: [], error });
      });

    return () => controller.abort();
  }, [category, reloadToken]);

  const retry = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  return { ...state, retry };
}
