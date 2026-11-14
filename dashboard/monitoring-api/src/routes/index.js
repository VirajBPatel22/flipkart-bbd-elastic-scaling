const express = require('express');
const healthRoutes = require('./health.routes');
const monitoringRoutes = require('./monitoring.routes');
const defaultMonitoringService = require('../services/monitoring.service');

function createRoutes(service = defaultMonitoringService) {
  const router = express.Router();
  router.use(healthRoutes);
  router.use(monitoringRoutes(service));
  return router;
}

module.exports = createRoutes;
