const express = require('express');
const controller = require('../controllers/monitoring.controller');

function createMonitoringRoutes(service) {
  const router = express.Router();

  router.get('/overview', controller.getOverview(service));
  router.get('/history', controller.getHistory(service));
  router.get('/events', controller.getEvents(service));
  router.get('/experiments', controller.getExperiments(service));
  router.get('/experiments.csv', controller.getExperimentsCsv(service));

  return router;
}

module.exports = createMonitoringRoutes;
