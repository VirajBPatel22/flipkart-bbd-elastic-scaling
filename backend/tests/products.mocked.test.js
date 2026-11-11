// These tests use a fake, in-memory `pg` Pool (see tests/helpers/fakeDb.js)
// so the products route, controller, and service logic can be verified
// WITHOUT a real database connection. They do not prove the real Supabase
// integration works — see database/README.md for how to verify that
// manually against a real project.

const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer, stopServer } = require('./helpers/testServer');
const { installFakeDb } = require('./helpers/fakeDb');

const fixtureProducts = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Mock Phone',
    category: 'Electronics',
    description: 'A mocked product for tests.',
    price: 100,
    image_url: null,
    stock_quantity: 5,
    is_active: true,
    created_at: '2024-01-02T00:00:00.000Z',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Mock Shirt',
    category: 'Fashion',
    description: 'Another mocked product.',
    price: 20,
    image_url: null,
    stock_quantity: 10,
    is_active: true,
    created_at: '2024-01-01T00:00:00.000Z',
  },
];

test('GET /api/products returns mocked data with the expected shape', async () => {
  const restore = installFakeDb(fixtureProducts);
  const app = require('../src/app');
  const { server, baseUrl } = await startServer(app);

  try {
    const response = await fetch(`${baseUrl}/api/products`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.meta.count, 2);
    assert.equal(body.data.length, 2);
    assert.deepEqual(Object.keys(body.data[0]).sort(), [
      'category',
      'created_at',
      'description',
      'id',
      'image_url',
      'is_active',
      'name',
      'price',
      'stock_quantity',
    ]);
  } finally {
    await stopServer(server);
    restore();
  }
});

test('GET /api/products?category=Fashion filters by category', async () => {
  const restore = installFakeDb(fixtureProducts);
  const app = require('../src/app');
  const { server, baseUrl } = await startServer(app);

  try {
    const response = await fetch(`${baseUrl}/api/products?category=Fashion`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.meta.count, 1);
    assert.equal(body.data[0].name, 'Mock Shirt');
  } finally {
    await stopServer(server);
    restore();
  }
});

test('GET /api/products?limit=1 bounds the result set', async () => {
  const restore = installFakeDb(fixtureProducts);
  const app = require('../src/app');
  const { server, baseUrl } = await startServer(app);

  try {
    const response = await fetch(`${baseUrl}/api/products?limit=1`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.data.length, 1);
    assert.equal(body.meta.count, 1);
  } finally {
    await stopServer(server);
    restore();
  }
});

test('GET /api/products returns an empty collection, not fabricated data, when the table is empty', async () => {
  const restore = installFakeDb([]);
  const app = require('../src/app');
  const { server, baseUrl } = await startServer(app);

  try {
    const response = await fetch(`${baseUrl}/api/products`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(body.data, []);
    assert.equal(body.meta.count, 0);
  } finally {
    await stopServer(server);
    restore();
  }
});
