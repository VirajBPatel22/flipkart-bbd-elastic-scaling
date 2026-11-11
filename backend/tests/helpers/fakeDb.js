const path = require('path');

// A tiny in-memory stand-in for a `pg` Pool, used only in tests so we can
// exercise the products service/controller without a real database
// connection.
//
// It mirrors the exact calling convention used by
// src/services/products.service.js: `pool.query(sql, values)`, where
// `values` is either `[limit]` or `[category, limit]` (category, when
// present, is always pushed before limit).
function createFakePool(fixtureRows) {
  return {
    query(sql, values = []) {
      let rows = fixtureRows.filter((row) => row.is_active !== false);

      if (values.length === 2) {
        const [category, limit] = values;
        rows = rows.filter((row) => row.category === category).slice(0, limit);
      } else {
        const [limit] = values;
        rows = rows.slice(0, limit);
      }

      return Promise.resolve({ rows });
    },
  };
}

// Replaces the cached `config/db` module with a fake implementation that
// returns the given fixture rows, and clears every other backend module
// from the require cache so they get re-wired to the fake pool the next
// time they are required. Returns a restore function.
function installFakeDb(fixtureRows) {
  const configPath = require.resolve('../../src/config/db');
  const previousEntry = require.cache[configPath];

  require.cache[configPath] = {
    id: configPath,
    filename: configPath,
    loaded: true,
    exports: {
      getPool: () => createFakePool(fixtureRows),
      isDatabaseConfigured: () => true,
    },
  };

  clearBackendSrcCache();

  return function restore() {
    if (previousEntry) {
      require.cache[configPath] = previousEntry;
    } else {
      delete require.cache[configPath];
    }
    clearBackendSrcCache();
  };
}

function clearBackendSrcCache() {
  const srcDir = require.resolve('../../src/app').replace(/app\.js$/, '');
  const dbConfigFile = path.join(srcDir, 'config', 'db.js');
  Object.keys(require.cache).forEach((key) => {
    if (key.startsWith(srcDir) && key !== dbConfigFile) {
      delete require.cache[key];
    }
  });
}

module.exports = { installFakeDb };
