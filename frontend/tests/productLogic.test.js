import test from 'node:test';
import assert from 'node:assert/strict';

// Helper mirror for currency formatting as defined in ProductCard.jsx
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

// Helper mirror for category illustration selection as defined in ProductCard.jsx
function getIllustrationCategory(category = '') {
  const normalized = (category || '').toLowerCase();
  const known = ['electronics', 'fashion', 'grocery', 'books', 'beauty', 'sports', 'home', 'toys'];
  return known.find((k) => normalized.includes(k)) || 'electronics';
}

// Helper mirror for search matching as defined in HomePage.jsx
function filterProductsBySearch(products, searchTerm) {
  const term = (searchTerm || '').trim().toLowerCase();
  if (!term) return products;
  return products.filter((p) => p.name?.toLowerCase().includes(term));
}

test('formatPrice formats INR numbers accurately', () => {
  const formatted = formatPrice(12999);
  // Normalize whitespace (non-breaking spaces that Intl.NumberFormat may output)
  const clean = formatted.replace(/\s+/g, ' ');
  assert.match(clean, /₹\s?12,999/);
});

test('formatPrice handles invalid or missing values gracefully', () => {
  assert.equal(formatPrice('abc'), '—');
  assert.equal(formatPrice(NaN), '—');
});

test('getIllustrationCategory maps product categories to bundled illustrations', () => {
  assert.equal(getIllustrationCategory('Electronics & Gadgets'), 'electronics');
  assert.equal(getIllustrationCategory('Men Fashion Shoes'), 'fashion');
  assert.equal(getIllustrationCategory('Organic Grocery'), 'grocery');
  assert.equal(getIllustrationCategory('Books & Fiction'), 'books');
  assert.equal(getIllustrationCategory('Beauty & Skincare'), 'beauty');
  assert.equal(getIllustrationCategory('Sports & Fitness'), 'sports');
  assert.equal(getIllustrationCategory('Home Decor'), 'home');
  assert.equal(getIllustrationCategory('Kids Toys'), 'toys');
  assert.equal(getIllustrationCategory('Unknown Category'), 'electronics');
});

test('filterProductsBySearch matches products case-insensitively', () => {
  const products = [
    { id: 1, name: 'Samsung Galaxy Smartphone' },
    { id: 2, name: 'Apple iPhone 16' },
    { id: 3, name: 'Wireless Bluetooth Headphones' },
  ];

  assert.equal(filterProductsBySearch(products, '').length, 3);
  assert.equal(filterProductsBySearch(products, '   ').length, 3);
  
  const phones = filterProductsBySearch(products, 'phone');
  assert.equal(phones.length, 3); // 'Smartphone', 'iPhone', and 'Headphones' all contain 'phone'

  const galaxy = filterProductsBySearch(products, 'galaxy');
  assert.equal(galaxy.length, 1);
  assert.equal(galaxy[0].id, 1);

  const apple = filterProductsBySearch(products, 'APPLE');
  assert.equal(apple.length, 1);
  assert.equal(apple[0].id, 2);

  const none = filterProductsBySearch(products, 'NonExistentProduct');
  assert.equal(none.length, 0);
});
