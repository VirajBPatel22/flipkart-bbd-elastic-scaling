const express = require('express');
const healthRoutes = require('./health.routes');
const productsRoutes = require('./products.routes');
const instanceRoutes = require('./instance.routes');
const computeRoutes = require('./compute.routes');

const router = express.Router();

router.use(healthRoutes);
router.use('/products', productsRoutes);
router.use(instanceRoutes);
router.use(computeRoutes);

module.exports = router;
