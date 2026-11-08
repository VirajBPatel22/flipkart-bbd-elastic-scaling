import { useMemo, useState } from 'react';
import Header from '../components/Header';
import SaleBanner from '../components/SaleBanner';
import CategoryFilter from '../components/CategoryFilter';
import ProductGrid from '../components/ProductGrid';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import Footer from '../components/Footer';
import { useProducts } from '../hooks/useProducts';
import { useCategories } from '../hooks/useCategories';

/**
 * Storefront landing page. Fetches real product data from the backend's
 * GET /api/products — there is no hardcoded/fabricated product data here.
 * If the API is unreachable or returns an error, that is shown as-is with
 * a retry action rather than being masked by fake products.
 */
function HomePage() {
  const [category, setCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { status, products, error, retry } = useProducts({ category });
  const categories = useCategories();

  const visibleProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return products;
    }
    return products.filter((product) =>
      product.name?.toLowerCase().includes(term),
    );
  }, [products, searchTerm]);

  const isSearching = searchTerm.trim().length > 0;

  return (
    <div className="storefront">
      <Header searchTerm={searchTerm} onSearchChange={setSearchTerm} />

      <main className="storefront__main">
        <SaleBanner />

        <CategoryFilter
          categories={categories}
          activeCategory={category}
          onSelect={setCategory}
        />

        <section className="product-section" aria-live="polite">
          {status === 'loading' && <LoadingState />}

          {status === 'error' && (
            <ErrorState message={error?.message} onRetry={retry} />
          )}

          {status === 'success' && (
            <ProductGrid
              products={visibleProducts}
              emptyTitle={isSearching ? 'No matching products' : 'No products found'}
              emptyMessage={
                isSearching
                  ? 'Try a different search term, or clear the search box.'
                  : 'This category currently has no active products.'
              }
            />
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default HomePage;
