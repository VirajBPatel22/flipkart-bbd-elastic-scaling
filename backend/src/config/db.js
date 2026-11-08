require('dotenv').config();
const { Pool } = require('pg');

// This backend connects DIRECTLY to the Supabase Postgres database using
// the "Connection string" shown in Supabase under
// Project Settings -> Database -> Connection string.
//
// DATABASE_URL is the preferred variable name. SUPABASE_URL is also
// accepted so an existing backend/.env (from an earlier setup) keeps
// working without edits, as long as it holds a real postgresql:// URL.
const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_URL;

// IMPORTANT SECURITY NOTE:
// The Supabase "Connection string" normally connects as the `postgres`
// superuser, which BYPASSES Row Level Security entirely (RLS only applies
// to roles it is written for, such as the PostgREST `anon` role — not to
// the database owner). That means the `products` table's RLS policy
// (see database/migrations/0001_create_products_table.sql) is NOT what
// protects this API anymore. The `WHERE is_active = true` filter written
// directly into every query in products.service.js is now the ONLY thing
// preventing inactive products from being exposed, and there simply are no
// INSERT/UPDATE/DELETE code paths in this backend, which is what keeps
// writes from happening through this API. Treat DATABASE_URL like a
// password: never commit it, never put it in frontend code.
let pool = null;

if (connectionString) {
  pool = new Pool({
    ...require('./tls').databaseOptions(connectionString),
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  // A connection pool can emit 'error' for problems on idle clients (e.g. the
  // database restarting). Without this handler, that would crash the whole
  // Node process. Logging it keeps the server alive; the next query will
  // simply get a fresh connection from the pool.
  pool.on('error', (poolError) => {
    // eslint-disable-next-line no-console
    console.error('[db] Unexpected error on idle PostgreSQL client:', poolError.message);
  });
} else {
  // Never log the actual connection string, only the fact that it's missing.
  // eslint-disable-next-line no-console
  console.warn(
    '[db] DATABASE_URL (or SUPABASE_URL) is not set. Product endpoints ' +
      'will return a configuration error until backend/.env is configured. ' +
      'See backend/.env.example.',
  );
}

function isDatabaseConfigured() {
  return pool !== null;
}

// Throws a safe, generic error if the database has not been configured,
// instead of letting callers hit a confusing null-pointer error deeper in
// the code.
function getPool() {
  if (!pool) {
    const error = new Error('Product service is not configured on the server.');
    error.statusCode = 500;
    error.code = 'DATABASE_NOT_CONFIGURED';
    throw error;
  }
  return pool;
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = { getPool, isDatabaseConfigured, closePool };
