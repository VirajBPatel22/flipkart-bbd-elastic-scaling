const test = require('node:test');
const assert = require('node:assert/strict');
const { databaseOptions } = require('../src/config/tls');
test('database TLS is verified by default even if URI asks to disable verification', () => {
  const options = databaseOptions('postgresql://user:password@example.com/db?sslmode=no-verify', {});
  assert.equal(options.ssl.rejectUnauthorized, true);
  assert.equal(new URL(options.connectionString).searchParams.has('sslmode'), false);
});
test('AWS rejects insecure TLS but accepts an explicitly supplied CA', () => {
  assert.throws(() => databaseOptions('postgresql://host/db', { ENVIRONMENT: 'AWS', DB_SSL_REJECT_UNAUTHORIZED: 'false' }), /forbidden/);
  assert.equal(databaseOptions('postgresql://host/db', { DATABASE_CA_BASE64: Buffer.from('test CA').toString('base64') }).ssl.ca, 'test CA');
});
