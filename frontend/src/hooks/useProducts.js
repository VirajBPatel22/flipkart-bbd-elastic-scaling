import { useCallback, useEffect, useRef, useState } from 'react';
import { getProducts } from '../services/apiClient';









export function useProducts({ category } = {}) {
  const [state, setState] = useState({
    status: 'loading',
    products: [],
    error: null,
  });
  const [reloadToken, setReloadToken] = useState(0);

  const latestRequestId = useRef(0);






  useEffect(() => {
    const requestId = latestRequestId.current + 1;
    latestRequestId.current = requestId;
    const controller = new AbortController();


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
