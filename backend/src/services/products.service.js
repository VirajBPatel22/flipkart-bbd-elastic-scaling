const { getPool } = require('../config/db');

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const PRODUCT_COLUMNS =
  'id, name, category, description, price, image_url, stock_quantity, is_active, created_at';










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



    // eslint-disable-next-line no-console
    console.error('[products.service] Database query failed:', dbError.message);

    const wrappedError = new Error('Failed to retrieve products from the database.');
    wrappedError.statusCode = 502;
    throw wrappedError;
  }


  return result.rows;
}

module.exports = { listActiveProducts, DEFAULT_LIMIT, MAX_LIMIT };
