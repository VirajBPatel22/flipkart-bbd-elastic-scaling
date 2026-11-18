const app = require('./app');
const { port, host } = require('./config/env');
const { closePool } = require('./config/db');



const server = app.listen(port, host, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend API listening on ${host}:${port}`);
});





server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;


let isShuttingDown = false;

async function handleShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  // eslint-disable-next-line no-console
  console.log(`[server] Received ${signal}. Starting graceful shutdown...`);


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
