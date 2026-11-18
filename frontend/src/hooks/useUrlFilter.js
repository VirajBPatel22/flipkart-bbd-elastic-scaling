import { useCallback, useEffect, useRef, useState } from 'react';





export function parseSearchParams(search = '') {
  const params = new URLSearchParams(search);
  const rawCat = params.get('category');
  const rawQ = params.get('q') || params.get('search');

  return {
    category: rawCat && rawCat.trim() ? rawCat.trim() : null,
    searchTerm: rawQ ? rawQ.trim() : '',
  };
}





export function buildSearchString({ category, searchTerm } = {}) {
  const params = new URLSearchParams();
  if (category && typeof category === 'string' && category.trim()) {
    params.set('category', category.trim());
  }
  if (searchTerm && typeof searchTerm === 'string' && searchTerm.trim()) {
    params.set('q', searchTerm.trim());
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}





export function useUrlFilter() {
  const [filters, setFilters] = useState(() => {
    if (typeof window === 'undefined') {
      return { category: null, searchTerm: '' };
    }
    return parseSearchParams(window.location.search);
  });

  const isNavigatingHistoryRef = useRef(false);


  useEffect(() => {
    if (typeof window === 'undefined') return;

    function handlePopState() {
      isNavigatingHistoryRef.current = true;
      const parsed = parseSearchParams(window.location.search);
      setFilters(parsed);
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);


  const setCategory = useCallback((nextCategory) => {
    setFilters((prev) => {
      const normalized = nextCategory && String(nextCategory).trim() ? String(nextCategory).trim() : null;
      if (prev.category === normalized) return prev;

      const next = { ...prev, category: normalized };
      if (typeof window !== 'undefined' && !isNavigatingHistoryRef.current) {
        const query = buildSearchString(next);
        const nextUrl = `${window.location.pathname}${query}${window.location.hash}`;
        window.history.pushState(next, '', nextUrl);
      }
      isNavigatingHistoryRef.current = false;
      return next;
    });
  }, []);

  const setSearchTerm = useCallback((nextSearch) => {
    setFilters((prev) => {
      const nextTerm = typeof nextSearch === 'string' ? nextSearch : '';
      if (prev.searchTerm === nextTerm) return prev;

      const next = { ...prev, searchTerm: nextTerm };
      if (typeof window !== 'undefined' && !isNavigatingHistoryRef.current) {
        const query = buildSearchString(next);
        const nextUrl = `${window.location.pathname}${query}${window.location.hash}`;

        window.history.replaceState(next, '', nextUrl);
      }
      isNavigatingHistoryRef.current = false;
      return next;
    });
  }, []);

  return {
    category: filters.category,
    searchTerm: filters.searchTerm,
    setCategory,
    setSearchTerm,
  };
}
