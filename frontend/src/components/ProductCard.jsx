import { useState } from 'react';
import placeholderImage from '../assets/product-placeholder.svg';

function formatPrice(price) {
  const amount = Number(price);
  if (Number.isNaN(amount)) {
    return '—';
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function ProductCard({ product }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showPlaceholder = !product.image_url || imageFailed;
  const stockQuantity = Number(product.stock_quantity) || 0;
  const inStock = stockQuantity > 0;

  return (
    <article className="product-card">
      <div className="product-card__image-wrap">
        <img
          className="product-card__image"
          src={showPlaceholder ? placeholderImage : product.image_url}
          alt={product.name}
          loading="lazy"
          onError={() => setImageFailed(true)}
        />
      </div>
      <div className="product-card__body">
        {product.category && (
          <span className="product-card__category">{product.category}</span>
        )}
        <h3 className="product-card__name">{product.name}</h3>
        {product.description && (
          <p className="product-card__description">{product.description}</p>
        )}
        <div className="product-card__footer">
          <span className="product-card__price">{formatPrice(product.price)}</span>
          <span
            className={`product-card__stock${inStock ? ' is-in-stock' : ' is-out-of-stock'}`}
          >
            {inStock ? `${stockQuantity} in stock` : 'Out of stock'}
          </span>
        </div>
      </div>
    </article>
  );
}

export default ProductCard;
