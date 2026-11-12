process.env.LOAD_TEST_TOKEN = 'test-only-compute-token';
const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer, stopServer } = require('./helpers/testServer');
const { loadTestToken } = require('../src/config/env');
const { MIN_ITERATIONS, MAX_ITERATIONS } = require('../src/services/compute.service');

test('POST /api/demo/compute rejects missing authentication', async () => {
  const app = require('../src/app');
  const { server, baseUrl } = await startServer(app);

  try {
    const response = await fetch(`${baseUrl}/api/demo/compute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ iterations: 20000 }),
    });
    const body = await response.json();

    assert.equal(response.status, 401);
    assert.equal(body.status, 'error');
  } finally {
    await stopServer(server);
  }
});

test('POST /api/demo/compute rejects invalid token', async () => {
  const app = require('../src/app');
  const { server, baseUrl } = await startServer(app);

  try {
    const response = await fetch(`${baseUrl}/api/demo/compute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-load-test-token': 'wrong-token',
      },
      body: JSON.stringify({ iterations: 20000 }),
    });
    const body = await response.json();

    assert.equal(response.status, 401);
    assert.equal(body.status, 'error');
  } finally {
    await stopServer(server);
  }
});

test('POST /api/demo/compute rejects excessive iterations', async () => {
  const app = require('../src/app');
  const { server, baseUrl } = await startServer(app);

  try {
    const response = await fetch(`${baseUrl}/api/demo/compute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-load-test-token': loadTestToken,
      },
      body: JSON.stringify({ iterations: MAX_ITERATIONS + 1 }),
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.status, 'error');
  } finally {
    await stopServer(server);
  }
});

test('POST /api/demo/compute executes workload in worker thread and leaves health responsive', async () => {
  const app = require('../src/app');
  const { server, baseUrl } = await startServer(app);

  try {
    // Start compute job asynchronously
    const computePromise = fetch(`${baseUrl}/api/demo/compute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-load-test-token': loadTestToken,
      },
      body: JSON.stringify({ iterations: 50000 }),
    });

    // Immediately probe /api/health to verify main event loop is NOT blocked
    const healthResponse = await fetch(`${baseUrl}/api/health`);
    assert.equal(healthResponse.status, 200);

    const computeResponse = await computePromise;
    const body = await computeResponse.json();

    assert.equal(computeResponse.status, 200);
    assert.equal(body.status, 'ok');
    assert.ok(typeof body.durationMs === 'number');
    assert.ok(typeof body.digestSample === 'string');
    assert.equal(body.workload.iterations, 50000);
    assert.ok(typeof body.instanceId === 'string');
  } finally {
    await stopServer(server);
  }
});
