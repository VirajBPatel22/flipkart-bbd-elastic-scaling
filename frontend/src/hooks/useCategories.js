import { useEffect, useState } from 'react';
import { getProducts } from '../services/apiClient';

/**
 * Fetches the full (unfiltered) active product list once, to derive the
 * list of distinct categories for the category filter pills. This is
 * intentionally a separate, best-effort request: if it fails, the category
 * pills simply won't appear beyond "All" — the main product grid request
 * (useProducts) is what surfaces real connectivity errors to the user.
 */
export function useCategories() {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    getProducts({ limit: 100, signal: controller.signal })
      .then(({ data }) => {
        if (!isMounted) return;
        const unique = Array.from(
          new Set(data.map((product) => product.category).filter(Boolean)),
        ).sort((a, b) => a.localeCompare(b));
        setCategories(unique);
      })
      .catch(() => {
        // Non-fatal — see function comment above.
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  return categories;
}
