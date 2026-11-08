const {
  listActiveProducts,
  DEFAULT_LIMIT,
  MAX_LIMIT,
} = require('../services/products.service');

const MAX_CATEGORY_LENGTH = 100;

// Returns a positive integer within [1, MAX_LIMIT], the default limit, or
// `null` if the raw value is present but invalid.
function parseLimit(rawLimit) {
  if (rawLimit === undefined) {
    return DEFAULT_LIMIT;
  }

  if (Array.isArray(rawLimit) || !/^\d+$/.test(String(rawLimit))) {
    return null;
  }

  const parsed = Number(rawLimit);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_LIMIT) {
    return null;
  }

  return parsed;
}

function isValidCategory(rawCategory) {
  return (
    typeof rawCategory === 'string' &&
    rawCategory.trim().length > 0 &&
    rawCategory.length <= MAX_CATEGORY_LENGTH
  );
}

async function getProducts(req, res, next) {
  try {
    const { category: rawCategory, limit: rawLimit } = req.query;

    let category;
    if (rawCategory !== undefined) {
      if (!isValidCategory(rawCategory)) {
        return res.status(400).json({
          status: 'error',
          message: `Invalid "category" query parameter. Expected a non-empty string of at most ${MAX_CATEGORY_LENGTH} characters.`,
        });
      }
      category = rawCategory.trim();
    }

    const limit = parseLimit(rawLimit);
    if (limit === null) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid "limit" query parameter. Expected an integer between 1 and ${MAX_LIMIT}.`,
      });
    }

    const products = await listActiveProducts({ category, limit });

    res.status(200).json({
      data: products,
      meta: { count: products.length },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { getProducts, parseLimit, isValidCategory };
