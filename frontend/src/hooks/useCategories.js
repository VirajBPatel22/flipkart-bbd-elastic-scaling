import { useEffect, useState } from 'react';
import { getProducts } from '../services/apiClient';








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

      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  return categories;
}
