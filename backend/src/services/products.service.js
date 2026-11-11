const { getPool } = require('../config/db');

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const PRODUCT_COLUMNS =
  'id, name, category, description, price, image_url, stock_quantity, is_active, created_at';

/**
 * Retrieves active products directly from Postgres, newest first.
 * Uses a parameterized query ($1, $2, ...) so category/limit values are
 * never concatenated into the SQL string, even though they are already
 * validated upstream in the controller.
 *
 * @param {{ category?: string, limit?: number }} options
 * @returns {Promise<object[]>}
 */
async function listActiveProducts({ category, limit } = {}) {
  const pool = getPool();
  const effectiveLimit = limit || DEFAULT_LIMIT;

  const values = [];
  let categoryClause = '';

  if (category) {
    values.push(category);
    categoryClause = `and category = $${values.length}`;
  }

  values.push(effectiveLimit);
  const limitParam = `$${values.length}`;

  const sql = `
    select ${PRODUCT_COLUMNS}
    from public.products
    where is_active = true
    ${categoryClause}
    order by created_at desc
    limit ${limitParam}
  `;

  let result;
  try {
    result = await pool.query(sql, values);
  } catch (dbError) {
    // Log the real Postgres error server-side for debugging, but never
    // forward its details (which can include schema/connection info) to
    // the client.
    // eslint-disable-next-line no-console
    console.error('[products.service] Database query failed:', dbError.message);

    const wrappedError = new Error('Failed to retrieve products from the database.');
    wrappedError.statusCode = 502;
    throw wrappedError;
  }

  // An empty array here means "zero matching products", not a failure.
  return result.rows;
}

module.exports = { listActiveProducts, DEFAULT_LIMIT, MAX_LIMIT };
