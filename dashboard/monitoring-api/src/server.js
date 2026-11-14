const { createApp } = require('./app');

const port = Number.parseInt(process.env.PORT || '5001', 10);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}

const server = createApp().listen(port, '0.0.0.0', () => {
  process.stdout.write(`Monitoring API listening on 0.0.0.0:${port}\n`);
});

function shutdown(signal) {
  process.stdout.write(`Received ${signal}; closing monitoring API.\n`);
  server.close((error) => {
    if (error) {
      process.stderr.write(`${error.message}\n`);
      process.exitCode = 1;
    }
  });
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
