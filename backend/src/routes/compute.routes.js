const express = require('express');
const { handleCompute } = require('../controllers/compute.controller');

const router = express.Router();

router.post('/demo/compute', handleCompute);

module.exports = router;
