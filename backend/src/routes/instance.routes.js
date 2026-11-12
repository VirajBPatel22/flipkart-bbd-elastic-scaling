const express = require('express');
const { getInstance } = require('../controllers/instance.controller');

const router = express.Router();

router.get('/instance', getInstance);

module.exports = router;
