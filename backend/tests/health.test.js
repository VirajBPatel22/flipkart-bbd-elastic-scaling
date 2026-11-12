const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer, stopServer } = require('./helpers/testServer');

test('GET /api/health returns ok status', async () => {
  const app = require('../src/app');
  const { server, baseUrl } = await startServer(app);

  try {
    const response = await fetch(`${baseUrl}/api/health`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.status, 'ok');
    assert.equal(body.service, 'backend-api');
    assert.equal(typeof body.timestamp, 'string');
  } finally {
    await stopServer(server);
  }
});
