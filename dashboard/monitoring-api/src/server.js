const app = require('./app');
const { port } = require('./config/env');

const server = app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Monitoring API listening on port ${port}`);
});

server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

let isShuttingDown = false;

function handleShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  // eslint-disable-next-line no-console
  console.log(`[monitoring-api] Received ${signal}. Starting graceful shutdown...`);

  server.close((err) => {
    if (err) {
      // eslint-disable-next-line no-console
      console.error('[monitoring-api] Error while closing HTTP server:', err.message);
      process.exit(1);
    }
    // eslint-disable-next-line no-console
    console.log('[monitoring-api] HTTP server closed gracefully.');
    process.exit(0);
  });

  const forceTimer = setTimeout(() => {
    // eslint-disable-next-line no-console
    console.error('[monitoring-api] Graceful shutdown timed out. Forcing process termination.');
    process.exit(1);
  }, 10000);

  forceTimer.unref();
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

module.exports = server;
