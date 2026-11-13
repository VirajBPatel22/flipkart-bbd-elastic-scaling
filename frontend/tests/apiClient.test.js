import test from 'node:test';
import assert from 'node:assert/strict';
import { getHealth, getProducts } from '../src/services/apiClient.js';
import { API_BASE_URL } from '../src/services/config.js';

test('getHealth returns server health payload on 200 OK', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    assert.equal(url, `${API_BASE_URL}/api/health`);
    return {
      ok: true,
      status: 200,
      json: async () => ({ status: 'ok', service: 'backend-api' }),
    };
  };

  try {
    const health = await getHealth();
    assert.equal(health.status, 'ok');
    assert.equal(health.service, 'backend-api');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('getHealth throws on non-200 status', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: false,
    status: 503,
    json: async () => ({ status: 'unavailable' }),
  });

  try {
    await assert.rejects(
      async () => await getHealth(),
      /Health check failed with status 503/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('getProducts formats query parameters correctly', async () => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = null;

  globalThis.fetch = async (url) => {
    requestedUrl = url;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        data: [{ id: 1, name: 'Phone', price: 19999 }],
        meta: { count: 1 },
      }),
    };
  };

  try {
    const result = await getProducts({ category: 'Electronics', limit: 10 });
    assert.equal(requestedUrl, `${API_BASE_URL}/api/products?category=Electronics&limit=10`);
    assert.equal(result.count, 1);
    assert.equal(result.data.length, 1);
    assert.equal(result.data[0].name, 'Phone');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('getProducts surfaces backend error message on 400 Bad Request', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: false,
    status: 400,
    json: async () => ({
      status: 'error',
      message: 'Invalid category parameter',
    }),
  });

  try {
    await assert.rejects(
      async () => await getProducts({ category: 'invalid' }),
      (err) => {
        assert.equal(err.message, 'Invalid category parameter');
        assert.equal(err.statusCode, 400);
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('getProducts handles unexpected payload structure safely', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ notAnArray: true }),
  });

  try {
    await assert.rejects(
      async () => await getProducts(),
      /Received an unexpected response format/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('getProducts surfaces friendly error message on network failure', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new TypeError('Failed to fetch');
  };

  try {
    await assert.rejects(
      async () => await getProducts(),
      /Could not reach the backend API/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
