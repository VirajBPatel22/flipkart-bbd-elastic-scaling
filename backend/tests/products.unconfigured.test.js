// This test asserts the behavior when DATABASE_URL (or the legacy
// SUPABASE_URL) is NOT set, which is the default state of this
// sandbox/dev checkout (no backend/.env file is committed). It confirms
// the API fails safely with a generic configuration error instead of
// inventing product data.
//
// NOTE: if you run this suite with a real backend/.env present and a valid
// connection string loaded, this specific test is not meaningful (the
// service will be configured) — see products.mocked.test.js and the manual
// verification steps in database/README.md for the "real database" path.

const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer, stopServer } = require('./helpers/testServer');
// Requiring config/db (the same module the app uses) is what actually
// triggers dotenv to load backend/.env. Checking process.env directly
// BEFORE this require would see stale (empty) values and wrongly decide to
// run the "unconfigured" test against a real, configured database.
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

    // Make sure nothing sensitive leaked into the response.
    assert.doesNotMatch(
      rawText,
      /DATABASE_URL=|SUPABASE_URL=|postgres(ql)?:\/\/|password|service_role|stack|at Object\./i,
    );
  } finally {
    await stopServer(server);
  }
});
