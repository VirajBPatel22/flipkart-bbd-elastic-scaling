const path = require('path');









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
