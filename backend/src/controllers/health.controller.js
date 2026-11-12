const { dbReadinessTimeoutMs } = require('../config/env');

// Returns basic service liveness health information.
// Used by ALB and container orchestrator health checks.
function getHealth(req, res) {
  res.json({
    status: 'ok',
    service: 'backend-api',
    timestamp: new Date().toISOString(),
  });
}

// Database readiness check:
// Verifies whether the PostgreSQL database is reachable and responsive.
// Fails safely with HTTP 503 if the database is unconfigured, unreachable, or slow (timed out).
async function getReadiness(req, res) {
  let timeoutId = null;
  try {
    const db = require('../config/db');
    if (!db.isDatabaseConfigured()) {
      return res.status(503).json({ status: 'unavailable', database: 'unavailable' });
    }

    const pool = db.getPool();
    const queryPromise = pool.query('SELECT 1');

    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        const err = new Error('Database readiness check timed out');
        err.code = 'ETIMEDOUT';
        reject(err);
      }, dbReadinessTimeoutMs);
    });

    await Promise.race([queryPromise, timeoutPromise]);
    return res.json({ status: 'ok', database: 'reachable' });
  } catch {
    return res.status(503).json({ status: 'unavailable', database: 'unavailable' });
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

module.exports = { getHealth, getReadiness };
