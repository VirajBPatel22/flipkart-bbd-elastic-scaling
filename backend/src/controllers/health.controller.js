// Returns basic service health information.
// This will later be extended with checks for the database connection, etc.
function getHealth(req, res) {
  res.json({
    status: 'ok',
    service: 'backend-api',
    timestamp: new Date().toISOString(),
  });
}

async function getReadiness(req, res) {
  try {
    await require('../config/db').getPool().query('SELECT 1');
    res.json({ status: 'ok', database: 'reachable' });
  } catch {
    res.status(503).json({ status: 'unavailable', database: 'unavailable' });
  }
}
module.exports = { getHealth, getReadiness };
