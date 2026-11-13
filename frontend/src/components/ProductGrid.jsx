import ProductCard from './ProductCard';
import StatusBanner from './StatusBanner';

function ProductGrid({
  products,
  emptyTitle = 'No products found',
  emptyMessage = 'Try a different category or search term.',
}) {
  if (products.length === 0) {
    return <StatusBanner title={emptyTitle} message={emptyMessage} />;
  }

  return (
    <div className="product-grid">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

export default ProductGrid;
