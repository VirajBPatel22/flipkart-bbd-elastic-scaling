const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer, stopServer } = require('./helpers/testServer');




const { isDatabaseConfigured } = require('../src/config/db');

test('GET /api/products returns a safe error when the database is not configured', async (t) => {
  if (isDatabaseConfigured()) {
    t.skip('A database connection string is present in this environment; skipping unconfigured-state test.');
    return;
  }

  const app = require('../src/app');
  const { server, baseUrl } = await startServer(app);

  try {
    const response = await fetch(`${baseUrl}/api/products`);
    const body = await response.json();
    const rawText = JSON.stringify(body);

    assert.equal(response.status, 500);
    assert.equal(body.status, 'error');
    assert.ok(body.message.length > 0);


    assert.doesNotMatch(
      rawText,
      /DATABASE_URL=|SUPABASE_URL=|postgres(ql)?:\/\/|password|service_role|stack|at Object\./i,
    );
  } finally {
    await stopServer(server);
  }
});
