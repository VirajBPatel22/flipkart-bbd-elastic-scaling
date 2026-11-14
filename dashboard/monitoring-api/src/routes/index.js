const express = require('express');
const healthRoutes = require('./health.routes');

const router = express.Router();

router.use(healthRoutes);

// Future routes that query live AWS data will be mounted here, e.g.:
// router.use('/instances', require('./instances.routes'));
// router.use('/scaling-events', require('./scaling.routes'));
// router.use('/metrics', require('./metrics.routes'));

module.exports = router;
