const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const { corsOrigin } = require('./config/env');

const app = express();

app.use(cors({ origin: corsOrigin }));
app.use(express.json());

app.use('/api', routes);

require('./monitoring').install(app);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
