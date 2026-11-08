const app = require('./app');
const { port } = require('./config/env');
const { closePool } = require('./config/db');

const server = app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend API listening on port ${port}`);
});

// Configure timeouts suitable for AWS Application Load Balancer (ALB).
// Default ALB idle timeout is 60s. Setting keepAliveTimeout higher (65s)
// prevents the Node.js server from terminating a connection right as the ALB
// is sending a request over an existing keep-alive socket (which causes HTTP 502s).
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

// Graceful shutdown handling for EC2 / Docker container lifecycle
let isShuttingDown = false;

async function handleShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  // eslint-disable-next-line no-console
  console.log(`[server] Received ${signal}. Starting graceful shutdown...`);

  // Stop accepting new connections
  server.close(async (closeErr) => {
    if (closeErr) {
      // eslint-disable-next-line no-console
      console.error('[server] Error while closing HTTP server:', closeErr.message);
    } else {
      // eslint-disable-next-line no-console
      console.log('[server] HTTP server closed.');
    }

    try {
      await closePool();
      // eslint-disable-next-line no-console
      console.log('[server] Database pool closed.');
      process.exit(0);
    } catch (dbErr) {
      // eslint-disable-next-line no-console
      console.error('[server] Error closing database pool:', dbErr.message);
      process.exit(1);
    }
  });

  // Force shutdown if requests hang longer than 10 seconds
  const forceTimer = setTimeout(() => {
    // eslint-disable-next-line no-console
    console.error('[server] Graceful shutdown timed out. Forcing process termination.');
    process.exit(1);
  }, 10000);

  forceTimer.unref();
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

module.exports = server;
