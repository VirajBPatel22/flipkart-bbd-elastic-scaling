const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer, stopServer } = require('./helpers/testServer');

test('metrics count completed traffic and errors, excluding health and collection probes', async () => {
  process.env.ENVIRONMENT = 'LOCAL_DOCKER';
  const { server, baseUrl } = await startServer(require('../src/app'));
  try {
    await fetch(`${baseUrl}/api/health`);
    const before = await (await fetch(`${baseUrl}/internal/metrics`)).json();
    await fetch(`${baseUrl}/api/instance`);
    await fetch(`${baseUrl}/api/missing`);
    const after = await (await fetch(`${baseUrl}/internal/metrics`)).json();
    assert.equal(after.requests - before.requests, 2);
    assert.equal(after.samples.slice(-2).filter(s => s.error).length, 1);
    assert.ok(after.samples.every(s => s.ms >= 0));
  } finally { await stopServer(server); }
});
