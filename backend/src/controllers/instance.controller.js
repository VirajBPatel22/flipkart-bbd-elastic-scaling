const { getInstanceDetails } = require('../services/instance.service');

async function getInstance(req, res, next) {
  try {
    const details = await getInstanceDetails();
    res.status(200).json(details);
  } catch (error) {
    next(error);
  }
}

module.exports = { getInstance };
