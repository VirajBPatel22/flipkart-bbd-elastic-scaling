const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const { corsOrigin } = require('./config/env');

const app = express();

const metrics = require('./services/metrics.service');
app.use(metrics.middleware);
app.get('/internal/metrics', (req, res) => res.json(metrics.snapshot()));

app.use(cors({ origin: corsOrigin }));
app.use(express.json());

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
