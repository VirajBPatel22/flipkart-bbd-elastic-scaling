require('dotenv').config();
const { Pool } = require('pg');








const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_URL;













let pool = null;

if (connectionString) {
  pool = new Pool({
    ...require('./tls').databaseOptions(connectionString),
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });





  pool.on('error', (poolError) => {
    // eslint-disable-next-line no-console
    console.error('[db] Unexpected error on idle PostgreSQL client:', poolError.message);
  });
} else {

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
