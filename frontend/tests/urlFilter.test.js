import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSearchParams, buildSearchString } from '../src/hooks/useUrlFilter.js';

test('parseSearchParams handles empty or null input gracefully', () => {
  assert.deepEqual(parseSearchParams(''), { category: null, searchTerm: '' });
  assert.deepEqual(parseSearchParams('?'), { category: null, searchTerm: '' });
  assert.deepEqual(parseSearchParams(null), { category: null, searchTerm: '' });
});

test('parseSearchParams extracts category query parameter', () => {
  const result = parseSearchParams('?category=Electronics');
  assert.equal(result.category, 'Electronics');
  assert.equal(result.searchTerm, '');
});

test('parseSearchParams extracts search query parameter from q or search', () => {
  const fromQ = parseSearchParams('?q=headphones');
  assert.equal(fromQ.category, null);
  assert.equal(fromQ.searchTerm, 'headphones');

  const fromSearch = parseSearchParams('?search=laptop');
  assert.equal(fromSearch.category, null);
  assert.equal(fromSearch.searchTerm, 'laptop');
});

test('parseSearchParams extracts both category and search query', () => {
  const result = parseSearchParams('?category=Fashion&q=shirt');
  assert.equal(result.category, 'Fashion');
  assert.equal(result.searchTerm, 'shirt');
});

test('parseSearchParams trims extraneous whitespace', () => {
  const result = parseSearchParams('?category=%20Books%20&q=%20novel%20');
  assert.equal(result.category, 'Books');
  assert.equal(result.searchTerm, 'novel');
});

test('buildSearchString generates clean query strings', () => {
  assert.equal(buildSearchString(), '');
  assert.equal(buildSearchString({ category: null, searchTerm: '' }), '');
  assert.equal(buildSearchString({ category: 'Electronics' }), '?category=Electronics');
  assert.equal(buildSearchString({ searchTerm: 'phone' }), '?q=phone');
  assert.equal(
    buildSearchString({ category: 'Grocery', searchTerm: 'tea' }),
    '?category=Grocery&q=tea',
  );
});

test('buildSearchString ignores whitespace-only inputs', () => {
  assert.equal(buildSearchString({ category: '   ', searchTerm: '   ' }), '');
});
