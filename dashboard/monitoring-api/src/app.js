const cors = require('cors');
const express = require('express');
const apiRoutes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');

function parseOrigins(value) {
  return new Set(
    String(value || '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}

function createApp(options = {}) {
  const app = express();
  const allowedOrigins = parseOrigins(
    options.corsOrigins ?? process.env.CORS_ORIGINS,
  );

  app.disable('x-powered-by');
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin)) {
          return callback(null, true);
        }
        return callback(null, false);
      },
    }),
  );
  app.use(express.json({ limit: '32kb' }));
  app.use('/api', apiRoutes(options.monitoringService));
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp, parseOrigins };
