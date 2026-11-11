const test = require('node:test');
const assert = require('node:assert/strict');
const { getReadiness } = require('../src/controllers/health.controller');

function createMockResponse() {
  return {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(value) {
      this.value = value;
      return this;
    },
  };
}

test('readiness returns 200 and reachable status on successful DB ping', async () => {
  const configPath = require.resolve('../src/config/db');
  const before = require.cache[configPath];
  require.cache[configPath] = {
    id: configPath,
    filename: configPath,
    loaded: true,
    exports: {
      isDatabaseConfigured: () => true,
      getPool: () => ({
        query: async () => ({ rows: [{ '?column?': 1 }] }),
      }),
    },
  };

  const res = createMockResponse();
  try {
    await getReadiness({}, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.value, { status: 'ok', database: 'reachable' });
  } finally {
    if (before) require.cache[configPath] = before;
    else delete require.cache[configPath];
  }
});

test('readiness returns a sanitized failure without database details when DB errors', async () => {
  const configPath = require.resolve('../src/config/db');
  const before = require.cache[configPath];
  require.cache[configPath] = {
    id: configPath,
    filename: configPath,
    loaded: true,
    exports: {
      isDatabaseConfigured: () => true,
      getPool: () => ({
        query: async () => {
          throw new Error('connection refused to postgresql://secret:pass@private-db.internal:5432');
        },
      }),
    },
  };

  const res = createMockResponse();
  try {
    await getReadiness({}, res);
    assert.equal(res.statusCode, 503);
    assert.deepEqual(res.value, { status: 'unavailable', database: 'unavailable' });
  } finally {
    if (before) require.cache[configPath] = before;
    else delete require.cache[configPath];
  }
});

test('readiness fails safely with HTTP 503 when the database query times out (slow DB)', async () => {
  const configPath = require.resolve('../src/config/db');
  const envPath = require.resolve('../src/config/env');
  const beforeConfig = require.cache[configPath];
  const beforeEnv = require.cache[envPath];

  // Configure short timeout for test
  require.cache[envPath] = {
    id: envPath,
    filename: envPath,
    loaded: true,
    exports: {
      ...require('../src/config/env'),
      dbReadinessTimeoutMs: 50,
    },
  };

  // Re-require controller so it picks up the mock timeout
  delete require.cache[require.resolve('../src/controllers/health.controller')];
  const { getReadiness: getReadinessWithShortTimeout } = require('../src/controllers/health.controller');

  // Query that takes 200ms (longer than 50ms timeout)
  require.cache[configPath] = {
    id: configPath,
    filename: configPath,
    loaded: true,
    exports: {
      isDatabaseConfigured: () => true,
      getPool: () => ({
        query: () => new Promise((resolve) => setTimeout(resolve, 200)),
      }),
    },
  };

  const res = createMockResponse();
  try {
    await getReadinessWithShortTimeout({}, res);
    assert.equal(res.statusCode, 503);
    assert.deepEqual(res.value, { status: 'unavailable', database: 'unavailable' });
  } finally {
    if (beforeConfig) require.cache[configPath] = beforeConfig;
    else delete require.cache[configPath];
    if (beforeEnv) require.cache[envPath] = beforeEnv;
    else delete require.cache[envPath];
    delete require.cache[require.resolve('../src/controllers/health.controller')];
  }
});

test('readiness returns HTTP 503 when database is not configured', async () => {
  const configPath = require.resolve('../src/config/db');
  const before = require.cache[configPath];
  require.cache[configPath] = {
    id: configPath,
    filename: configPath,
    loaded: true,
    exports: {
      isDatabaseConfigured: () => false,
      getPool: () => {
        throw new Error('Database not configured');
      },
    },
  };

  const res = createMockResponse();
  try {
    await getReadiness({}, res);
    assert.equal(res.statusCode, 503);
    assert.deepEqual(res.value, { status: 'unavailable', database: 'unavailable' });
  } finally {
    if (before) require.cache[configPath] = before;
    else delete require.cache[configPath];
  }
});
