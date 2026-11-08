const { executeComputeJob } = require('../services/compute.service');

async function handleCompute(req, res, next) {
  try {
    const outcome = await executeComputeJob(req);
    res.status(200).json(outcome);
  } catch (error) {
    next(error);
  }
}

module.exports = { handleCompute };
