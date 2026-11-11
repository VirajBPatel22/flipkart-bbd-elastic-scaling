const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer, stopServer } = require('./helpers/testServer');

test('GET /api/instance returns safe identity info', async () => {
  const app = require('../src/app');
  const { server, baseUrl } = await startServer(app);

  try {
    const response = await fetch(`${baseUrl}/api/instance`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.status, 'ok');
    assert.ok(typeof body.instanceId === 'string' && body.instanceId.length > 0);
    assert.ok(typeof body.hostname === 'string' && body.hostname.length > 0);
    assert.ok(typeof body.uptimeSeconds === 'number');
    assert.ok(typeof body.timestamp === 'string');
    // Ensure no sensitive fields like passwords or tokens are exposed
    assert.equal(body.password, undefined);
    assert.equal(body.token, undefined);
  } finally {
    await stopServer(server);
  }
});
