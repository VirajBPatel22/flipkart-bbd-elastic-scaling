// These tests only exercise query-parameter validation, which happens
// before the products service ever talks to Supabase. They run regardless
// of whether real Supabase credentials are configured.

const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer, stopServer } = require('./helpers/testServer');

test('GET /api/products rejects an invalid limit', async () => {
  const app = require('../src/app');
  const { server, baseUrl } = await startServer(app);

  try {
    const response = await fetch(`${baseUrl}/api/products?limit=not-a-number`);
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.status, 'error');
    assert.match(body.message, /limit/i);
  } finally {
    await stopServer(server);
  }
});

test('GET /api/products rejects a limit above the maximum', async () => {
  const app = require('../src/app');
  const { server, baseUrl } = await startServer(app);

  try {
    const response = await fetch(`${baseUrl}/api/products?limit=1000`);
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.status, 'error');
  } finally {
    await stopServer(server);
  }
});

test('GET /api/products rejects an empty category', async () => {
  const app = require('../src/app');
  const { server, baseUrl } = await startServer(app);

  try {
    const response = await fetch(`${baseUrl}/api/products?category=`);
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.status, 'error');
    assert.match(body.message, /category/i);
  } finally {
    await stopServer(server);
  }
});
